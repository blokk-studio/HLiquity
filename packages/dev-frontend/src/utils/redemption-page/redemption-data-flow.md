# Redemption Data Flow

How the Redemptions page fetches, displays, and enriches redemption data from the Hedera Mirror Node.

---

## Overview

The redemption data pipeline has two phases:

1. **Initial load** (cheap) -- fetch the list of redemptions and the "after" state of each affected trove
2. **Lazy enrichment** (on expand) -- fetch the "before" state for each trove so we can compute redeemed amounts

```
Page load                              User expands row
    |                                        |
    v                                        v
 [Phase 1: Initial Load]              [Phase 2: Enrichment]
    |                                        |
    |  1 API call per redemption             |  0-N API calls per trove
    |  for logs at timestamp                 |  (0 if operation=0 captured before state)
    |                                        |
    v                                        v
 Redemption list with                  Full before/after/redeemed
 after-state only                      data for each trove
```

---

## Phase 1: Initial Load

### Step 1 -- Find redemption transactions

```
GET /api/v1/contracts/{troveManager}/results?timestamp=lte:{now}
```

Filters results to those whose `function_parameters` start with the `redeemCollateral` selector (`0xbcd37526`).

### Step 2 -- Get transaction details

For each redemption result:

```
GET /api/v1/transactions?timestamp={consensusTimestamp}
  -> extracts transactionId

GET /api/v1/transactions/{transactionId}
  -> iterates all child transactions to find:
     - HBAR transfer amount (from transfers[] where account == redeemer)
     - HCHF transfer amount (from token_transfers[] where token_id == hchfToken and account == redeemer)
     - Network fee (charged_tx_fee from first successful transaction)
```

### Step 3 -- Extract redemption fee and affected troves

Both come from a single log fetch at the redemption timestamp:

```
GET /api/v1/contracts/{troveManager}/results/logs?timestamp={consensusTimestamp}
```

From these logs we parse:

| Event | What we extract |
|---|---|
| `RedemptionFee` (topic0: `0x6bac5e0e...`) | `_ETHFee` -- the redemption fee in HBAR |
| `TroveUpdated` with `operation=0` | "Before" state (debt & collateral after applying pending rewards, right before the redemption) |
| `TroveUpdated` with `operation=3` | "After" state (debt & collateral after the redemption) |

The operation=0 events are emitted by Liquity's `_applyPendingRewards` which runs right before each trove is redeemed. They give us the trove state immediately before the redemption -- but only if the trove had pending rewards to apply. If there were no pending rewards, no operation=0 event is emitted.

**Result:** `AffectedTroveAfter[]` -- each entry has `debtAfter`, `collateralAfter`, and optionally `debtBefore`, `collateralBefore` (from operation=0).

### Redemption row data sources

```
+---------------+----------+----------+-----------+--------+--------+
| Account       | HCHF     | HBAR     | Redemption| Network| Date   |
| (Redeemer)    | Redeemed | Received | Fee (HBAR)| Fee    |        |
+---------------+----------+----------+-----------+--------+--------+
       |              |          |           |         |        |
       |              |          |           |         |        +-- consensus_timestamp
       |              |          |           |         +-- charged_tx_fee / 1e8
       |              |          |           +-- RedemptionFee log _ETHFee / 1e8
       |              |          +-- HBAR transfers (account == redeemer)
       |              +-- HCHF token_transfers (token_id == hchfToken, account == redeemer)
       +-- AccountId.fromEvmAddress(0, 0, result.from)
```

---

## Phase 2: Lazy Enrichment (on row expand)

When the user expands a redemption row, `enrichAffectedTroves()` is called to compute the full before/after/redeemed data for each trove.

### Strategy 1: Operation=0 event (preferred, free)

If the initial extraction captured an operation=0 event for the trove (meaning pending rewards were applied), we already have the "before" state. No additional API calls needed.

```
debtBefore       = operation=0 event's _debt
collateralBefore = operation=0 event's _coll
debtRedeemed     = debtBefore - debtAfter
collateralRedeemed = collateralBefore - collateralAfter
```

### Strategy 2: Backwards window search (fallback, expensive)

If no operation=0 event exists (trove had no pending rewards), we search backwards through time for the most recent `TroveUpdated` event for that borrower.

```
getPreviousTroveState(borrower, beforeTimestamp, [troveManager, borrowerOperations])
```

This searches in 7-day windows (Mirror Node's maximum range for topic-filtered queries), going backwards from the redemption timestamp until it finds a previous `TroveUpdated` event or reaches `EARLIEST_SEARCH_FLOOR` (Jan 1, 2024).

**Key details:**

- Searches **both contracts** (TroveManager and BorrowerOperations) because on Hedera, logs are indexed under the directly-called contract. Trove opens/adjustments go through BorrowerOperations, while redemptions go through TroveManager.
- Searches **both address forms** for Hedera accounts: the long-zero EVM address (`0x000...{accountNum}`) and the ECDSA alias address (if the account has one). This handles Hedera's address duality where the same account can emit events under either address.
- Uses `limit: 2` instead of 1, and filters out logs at the exact redemption timestamp via string comparison. This works around a JavaScript float precision issue where `parseFloat("1753080358.486832386")` rounds to `1753080358.4868324` (slightly larger), causing the `lt:` query to include the redemption event itself.
- ED25519 accounts have no ECDSA alias -- only the long-zero address is searched.

### Enrichment result

```typescript
interface AffectedTrove {
  borrower: string;
  debtBefore: Decimal;      // from operation=0 or backwards search
  debtAfter: Decimal;       // from operation=3
  debtRedeemed: Decimal;    // debtBefore - debtAfter
  collateralBefore: Decimal;
  collateralAfter: Decimal;
  collateralRedeemed: Decimal; // collateralBefore - collateralAfter
}
```

If no previous state can be found at all, the trove falls back to showing `debtBefore = debtAfter` and `debtRedeemed = 0`, which triggers the N/A display in the UI.

---

## Hedera-Specific Considerations

### Address duality

Hedera accounts can have two EVM addresses:
- **Long-zero address**: `0x000000000000000000000000XXXXXXXXXXXXXXXX` (derived from the account number)
- **ECDSA alias**: A standard Ethereum-style address (only for ECDSA key accounts)

The `TroveUpdated` event's `_borrower` field uses whichever address was used when the trove was opened. The backwards search looks up the ECDSA alias via:

```
GET /api/v1/accounts/{accountId} -> evm_address field
```

ED25519 accounts only have the long-zero address (no ECDSA alias).

### Log indexing by contract

On Hedera, contract logs are indexed under the **directly-called contract**, not the internal contract that emitted the event:

| User action | Called contract | TroveUpdated indexed under |
|---|---|---|
| Open trove | BorrowerOperations | BorrowerOperations |
| Adjust trove | BorrowerOperations | BorrowerOperations |
| Redeem collateral | TroveManager | TroveManager |
| Liquidate | TroveManager | TroveManager |

This is why the backwards search must query both contracts to find previous trove state changes.

### Mirror Node constraints

- **7-day maximum range** for topic-filtered log queries -- hence the windowed search approach
- **Rate limiting** (429 errors) -- hence the lazy loading on expand instead of fetching all trove details upfront

---

## Gas Compensation and Redeemed Totals

When a trove is **fully closed** by redemption, the gas compensation (liquidation reserve) is returned to the borrower and not burned. This means:

```
Sum of "Debt Redeemed" across all troves != Total HCHF burned by redeemer
```

The difference is `number_of_fully_closed_troves * HCHF_LIQUIDATION_RESERVE`.

| Network | HCHF_LIQUIDATION_RESERVE |
|---|---|
| Mainnet (295) | 200 HCHF |
| Testnet (296) | 1 HCHF |

**Example** (testnet): A 2.00 HCHF redemption affecting 2 troves:

| Trove | Debt Redeemed | Gas Comp Refund | HCHF Burned |
|---|---|---|---|
| Trove A (partial) | 0.88 | 0 | 0.88 |
| Trove B (fully closed) | 2.12 | 1.00 | 1.12 |
| **Total** | **3.00** | **1.00** | **2.00** |

The header shows 2.00 (total burned), while the trove rows sum to 3.00 (total debt reduction). Both are correct.

---

## File Map

| File | Role |
|---|---|
| `src/pages/RedemptionsPage.tsx` | Page component, data fetching orchestration, lazy enrichment on expand |
| `src/components/RedemptionPage/RedemptionDetails.tsx` | Expanded trove detail table row, rendered when a redemption row is expanded |
| `src/utils/extractAffectedTroves.ts` | Core logic for extracting and enriching affected trove data |
| `src/utils/extractRedemptionFee.ts` | Extracts the redemption fee from `RedemptionFee` logs |
| `src/utils/mirrorNodeTypes.ts` | TypeScript types for the Mirror Node client |
