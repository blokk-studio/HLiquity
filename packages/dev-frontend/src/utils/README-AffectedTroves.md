# Extracting Affected Troves from Redemption Transactions

## Overview

This document explains how we identify and display which troves (user positions) were affected by each HCHF redemption transaction in the HLiquity protocol.

## Background: How Redemptions Work

When a user redeems HCHF for HBAR, the protocol:

1. **Finds the riskiest troves** - Selects troves with the lowest collateral ratios (ICR)
2. **Redeems from them in order** - Starting from the lowest ICR, the protocol:
   - Cancels HCHF debt from the trove
   - Sends corresponding HBAR collateral to the redeemer
   - Charges a redemption fee (typically 0.5-5%) that compensates the affected trove owners
3. **Updates each affected trove** - Each trove's debt and collateral are reduced proportionally

A single redemption can affect **multiple troves** if the redeemed amount is large enough.
This information is crucial for transparency - trove owners need to know when their positions are redeemed from.

## The Solution: Parsing TroveUpdated Events

### Smart Contract Events

The `TroveManager` contract emits two key events during a redemption:

#### 1. Redemption Event
```solidity
event Redemption(
  uint256 _attemptedHCHFAmount,
  uint256 _actualHCHFAmount,
  uint256 _ETHSent,
  uint256 _ETHFee
)
```
This tells us about the redemption itself, but **not which troves were affected**.

#### 2. TroveUpdated Event
```solidity
event TroveUpdated(
  address indexed _borrower,     // The trove owner's address
  uint256 _debt,                  // Remaining debt AFTER operation (not amount redeemed)
  uint256 _coll,                  // Remaining collateral AFTER operation (not amount redeemed)
  uint256 _stake,                 // Remaining stake
  uint8 _operation                // Type of operation
)
```

**Important**: The `_debt` and `_coll` values represent the **final state** of the trove after the operation, not the amounts that were redeemed. This is the trove's new position.

This event is emitted **for each trove affected by the redemption**.

The `_operation` enum indicates what happened:
- `0` = Apply (open/adjust trove)
- `1` = Close trove
- `2` = Adjust trove
- `3` = **Redemption** ⭐

### Implementation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User visits Redemptions Page                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ For each redemption transaction:                                │
│                                                                  │
│  1. Fetch transaction details from Mirror Node                  │
│  2. Get timestamp of the transaction                            │
│  3. Fetch ALL contract logs at that timestamp                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ extractAffectedTrovesFromLogs(timestamp)                        │
│                                                                  │
│  1. Call Mirror Node API:                                       │
│     GET /api/v1/contracts/{troveManager}/results/logs           │
│     Query params: { timestamp: [timestamp] }                    │
│                                                                  │
│  2. Receive all logs emitted at that timestamp                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Parse each log using TroveManager ABI                           │
│                                                                  │
│  For each log:                                                  │
│    - Use ethers.js Interface to parse raw log data              │
│    - Check if event name is "TroveUpdated"                      │
│    - Check if _operation === 3 (redemption)                     │
│    - Extract: _borrower, _debt, _coll (AFTER state)            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Fetch "before" state for each affected trove                    │
│                                                                  │
│  For each affected borrower:                                    │
│    1. Query Mirror Node for previous TroveUpdated event         │
│       GET /api/v1/contracts/{troveManager}/results/logs         │
│       Query: { timestamp: [`lt:${timestamp}`],                  │
│                topic0: [TroveUpdated signature],                │
│                topic1: [borrower address] }                     │
│                                                                  │
│    2. Parse the most recent previous event                      │
│    3. Extract: _debt, _coll (BEFORE state)                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Calculate redemption impact                                     │
│                                                                  │
│  For each trove:                                                │
│    - debtRedeemed = debtBefore - debtAfter                      │
│    - collateralRedeemed = collateralBefore - collateralAfter    │
│    - Convert all BigNumber values to Decimal                    │
│    - Return array of complete AffectedTrove objects             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ Display in UI                                                    │
│                                                                  │
│  - Show expand/collapse button if affected troves exist         │
│  - On expand: Show table with:                                  │
│    • Trove owner account ID                                     │
│    • Remaining debt (HCHF) - what's LEFT in the trove          │
│    • Remaining collateral (HBAR) - what's LEFT in the trove    │
│                                                                  │
│  Note: These are POST-REDEMPTION values, not the amounts        │
│        that were redeemed. They show what the trove owner       │
│        still has after being partially redeemed from.           │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Implementation

### File Structure

```
packages/dev-frontend/src/
├── utils/
│   ├── extractAffectedTroves.ts       # Core logic for parsing logs
│   ├── extractRedemptionFee.ts        # Similar pattern for fee extraction
│   └── README-AffectedTroves.md       # This documentation
└── pages/
    └── RedemptionsPage.tsx             # UI integration
```

### Key Function: extractAffectedTrovesFromLogs

```typescript
export const extractAffectedTrovesFromLogs = async (
  mirrorNodeClient: MirrorNodeClient,
  timestamp: string,
  troveManagerAddress: string
): Promise<AffectedTrove[]> => {
  // 1. Fetch logs from Mirror Node
  const logsResponse = await mirrorNodeClient.GET(
    "/api/v1/contracts/{contractIdOrAddress}/results/logs",
    {
      params: {
        path: { contractIdOrAddress: troveManagerAddress },
        query: { timestamp: [timestamp] }
      }
    }
  );

  const affectedTroves: AffectedTrove[] = [];

  // 2. Parse each log
  if (logsResponse.data?.logs) {
    for (const log of logsResponse.data.logs) {
      try {
        // Use TroveManager ABI to decode the log
        const parsedLog = troveManagerInterface.parseLog({
          topics: log.topics || [],
          data: log.data || "0x"
        });

        // 3. Filter for TroveUpdated events with redemption operation
        if (parsedLog.name === "TroveUpdated" && parsedLog.args._operation === 3) {
          const borrower = parsedLog.args._borrower;
          const debt = parsedLog.args._debt;
          const coll = parsedLog.args._coll;

          // 4. Skip fully closed troves
          if (!debt.isZero() || !coll.isZero()) {
            affectedTroves.push({
              borrower: borrower,
              debtAfter: Decimal.fromBigNumberStringWithPrecision(debt.toString(), 8),
              collateralAfter: Decimal.fromBigNumberStringWithPrecision(coll.toString(), 8)
            });
          }
        }
      } catch (e) {
        continue; // Skip logs that don't match TroveManager ABI
      }
    }
  }

  return affectedTroves;
}
```

### Data Structure

```typescript
interface AffectedTrove {
  borrower: string;              // EVM address of the trove owner
  debtBefore: Decimal;           // HCHF debt before redemption
  debtAfter: Decimal;            // HCHF debt after redemption
  debtRedeemed: Decimal;         // Amount of HCHF debt removed (before - after)
  collateralBefore: Decimal;     // HBAR collateral before redemption
  collateralAfter: Decimal;      // HBAR collateral after redemption
  collateralRedeemed: Decimal;   // Amount of HBAR taken (before - after)
}
```

### Understanding the Values

The interface now provides complete before/after information and calculates exactly what was taken during the redemption.

#### Example Scenario

Imagine a trove owner had:
- **Before redemption**: 10,000 HCHF debt and 100 HBAR collateral
- A redemption occurs that redeems 3,000 HCHF from this trove
- The protocol takes proportional collateral: 30 HBAR (3,000/10,000 * 100)
- **After redemption**: 7,000 HCHF debt and 70 HBAR collateral

What we display:
- **Remaining Debt**: 7,000 HCHF
- **Remaining Collateral**: 70 HBAR

#### Why We Show "After" Values

The `TroveUpdated` event emitted by the smart contract contains the trove's final state after the operation completes. We don't have access to the "before" state in the same transaction, which is why we show:
- ✅ What's **left** in the trove (remaining amounts)
- ❌ Not how much was **taken** during redemption (would require historical comparison)

#### What Happened to the Redeemed Amounts?

The amounts that were removed from the trove:
- **Debt redeemed**: Burned/cancelled by the protocol
- **Collateral redeemed**: Sent to the user who performed the redemption (minus redemption fee)
- **Redemption fee**: Distributed to the affected trove owner as compensation

#### Edge Case: Fully Redeemed Troves

If a trove is completely emptied by a redemption:
- Both `debtAfter` and `collateralAfter` would be **zero**
- We **filter these out** from the affected troves list (see line 74-80 in `extractAffectedTroves.ts`)
- This prevents showing empty/closed troves in the UI

#### Visual Example: Multi-Trove Redemption

Let's say Alice redeems 8,000 HCHF. The protocol finds the three riskiest troves:

```
BEFORE REDEMPTION:
┌─────────────┬───────────┬──────────────┬───────────┐
│ Trove Owner │ ICR       │ Debt (HCHF)  │ Coll (HBAR)│
├─────────────┼───────────┼──────────────┼───────────┤
│ Bob         │ 110%      │ 5,000        │ 50         │
│ Carol       │ 115%      │ 4,000        │ 42         │
│ Dave        │ 120%      │ 6,000        │ 65         │
└─────────────┴───────────┴──────────────┴───────────┘

REDEMPTION: Alice redeems 8,000 HCHF
- Takes 5,000 from Bob (empties his trove)
- Takes 3,000 from Carol (partial redemption)

AFTER REDEMPTION:
┌─────────────┬───────────┬──────────────┬───────────┐
│ Trove Owner │ Status    │ Debt (HCHF)  │ Coll (HBAR)│
├─────────────┼───────────┼──────────────┼───────────┤
│ Bob         │ CLOSED    │ 0            │ 0          │ ← Filtered out
│ Carol       │ OPEN      │ 1,000        │ 10.5       │ ← Shown in UI
│ Dave        │ UNTOUCHED │ 6,000        │ 65         │ ← Not affected
└─────────────┴───────────┴──────────────┴───────────┘

What the UI shows for this redemption:
┌────────────────────────────────────────────────┐
│ Affected Troves (1)                            │
├────────────────┬──────────────┬────────────────┤
│ Trove Owner    │ Remaining    │ Remaining      │
│                │ Debt (HCHF)  │ Coll (HBAR)    │
├────────────────┼──────────────┼────────────────┤
│ Carol          │ 1,000        │ 10.5           │
└────────────────┴──────────────┴────────────────┘

Note: Bob's trove is NOT shown because it was fully closed (both values are zero).
```

#### Calculating the Impact (Future Enhancement)

To show how much was actually redeemed from each trove, we would need to:
1. Query the trove state before the redemption transaction
2. Compare it with the state after (what we currently have)
3. Calculate the difference

```typescript
// Future enhancement
interface AffectedTroveWithImpact {
  borrower: string;
  debtBefore: Decimal;         // Would need historical query
  debtAfter: Decimal;          // Current data from TroveUpdated event
  debtRedeemed: Decimal;       // debtBefore - debtAfter
  collateralBefore: Decimal;   // Would need historical query
  collateralAfter: Decimal;    // Current data from TroveUpdated event
  collateralRedeemed: Decimal; // collateralBefore - collateralAfter
}
```

With this enhancement, Carol's row would show:
```
┌────────────────────────────────────────────────────────────────────────┐
│ Affected Troves (1)                                                    │
├────────┬────────────┬────────────┬────────────┬──────────┬─────────────┤
│ Owner  │ Debt Before│ Debt After │ Debt       │ Coll     │ Coll        │
│        │   (HCHF)   │  (HCHF)    │ Redeemed   │ Before   │ Redeemed    │
├────────┼────────────┼────────────┼────────────┼──────────┼─────────────┤
│ Carol  │ 4,000      │ 1,000      │ 3,000 ⬇    │ 42       │ 31.5 ⬇      │
└────────┴────────────┴────────────┴────────────┴──────────┴─────────────┘
```

Currently implemented (simpler view):
```
┌────────────────────────────────────────────────┐
│ Affected Troves (1)                            │
├────────────────┬──────────────┬────────────────┤
│ Trove Owner    │ Remaining    │ Remaining      │
│                │ Debt (HCHF)  │ Coll (HBAR)    │
├────────────────┼──────────────┼────────────────┤
│ Carol          │ 1,000        │ 10.5           │
└────────────────┴──────────────┴────────────────┘
```

interface Redemption {
  transactionId: string;
  timestamp: string;
  accountIdString: string;    // Redeemer's account
  amountOfHchf: Decimal;
  amountOfHbar: Decimal;
  fee: Decimal;
  redemptionFee: Decimal;
  effectivePrice: Decimal;
  affectedTroves: AffectedTrove[];  // ⭐ New field
}
```

## Debugging Journey

### Initial Problem
When first implemented, no affected troves were found. The logs showed:
```javascript
{
  "name": "TroveUpdated",
  "operation": 3,  // Not 2!
  "allArgs": [...]
}
```

## Mirror Node API Details

### Endpoint
```
GET /api/v1/contracts/{contractIdOrAddress}/results/logs
```

### Query Parameters
- `timestamp`: Filter logs by specific timestamp (required)
  - Format: `"1751278307.070894000"` (seconds.nanoseconds)

### Response Structure
```json
{
  "data": {
    "logs": [
      {
        "address": "0x...",
        "topics": [
          "0xc3770d654ed33aeea6bf11ac8ef05d02a6a04ed4686dd2f624d853bbec43cc8b",  // Event signature
          "0x0000000000000000000000000000000000000000000000000000000000433919"   // Indexed borrower
        ],
        "data": "0x...",  // ABI-encoded event data
        "contract_id": "0.0.4360529",
        "timestamp": "1751278307.070894000"
      }
    ]
  }
}
```

### Understanding Topics
- **topics[0]**: Event signature hash (keccak256 of event signature)
- **topics[1..n]**: Indexed parameters (for TroveUpdated: the borrower address)

### Understanding Data
The `data` field contains ABI-encoded values for non-indexed parameters:
- `_debt` (uint256)
- `_coll` (uint256)
- `_stake` (uint256)
- `_operation` (uint8)

## Performance Considerations

### Parallel Fetching
The implementation fetches affected troves in parallel with redemption fee extraction:

```typescript
const [redemptionFeeInHbar, affectedTroves] = await Promise.all([
  extractRedemptionFeeFromLogs(mirrorNodeClient, timestamp, troveManagerAddress),
  extractAffectedTrovesFromLogs(mirrorNodeClient, timestamp, troveManagerAddress)
]);
```

### Optimization Opportunity
Both functions call the same API endpoint with the same parameters. They could be **combined into a single function** that extracts both the redemption fee and affected troves from one API call:

```typescript
// Future optimization
export const extractRedemptionDetails = async (...) => {
  const logs = await fetchLogs(...);

  return {
    redemptionFee: parseRedemptionFee(logs),
    affectedTroves: parseTroveUpdates(logs)
  };
}
```

## UI/UX Design

### Expandable Rows
- By default, redemptions show basic info in a compact row
- If affected troves exist, a chevron icon appears in the Account column
- Clicking the chevron expands the row to show a nested table of affected troves
- The expanded section has a muted background to distinguish it from main rows

### Account ID Display
Trove owner addresses are converted to Hedera account IDs for user-friendly display:
```typescript
const troveAccountId = AccountId.fromEvmAddress(0, 0, borrower).toString();
// "0.0.4369689"
```

### Empty State Handling
If no affected troves are found (which shouldn't happen for valid redemptions):
- No expand button is shown
- The redemption is still displayed with all other data

## Testing

### Manual Testing Checklist
- [ ] Redemption with 1 affected trove displays correctly
- [ ] Redemption with multiple affected troves shows all of them
- [ ] Expand/collapse button works
- [ ] Account IDs are formatted correctly
- [ ] Decimal values display with proper precision
- [ ] Tooltips show full precision values
- [ ] Mobile responsive layout works

## Future Enhancements

### 1. Calculate Redemption Impact
Show **how much** debt/collateral was redeemed from each trove:
```typescript
interface AffectedTrove {
  borrower: string;
  debtBefore: Decimal;      // Would need historical query
  debtAfter: Decimal;       // Current
  debtRedeemed: Decimal;    // Calculated difference
  collateralBefore: Decimal;
  collateralAfter: Decimal;
  collateralRedeemed: Decimal;
}
```

**Challenge**: Requires querying trove state before the redemption.

### 2. Show Redemption Fee Distribution
Calculate how the redemption fee is distributed among affected trove owners:
```typescript
const feePerTrove = redemptionFee.mul(troveDebtRedeemed).div(totalDebtRedeemed);
```

### 3. Link to Trove Details
Make the borrower address clickable to navigate to that trove's detail page.

### 4. Historical Timeline
Show a timeline view of all redemptions affecting a specific trove.

### 5. Real-time Notifications
Notify trove owners when their position is redeemed from (requires backend/push notifications).

## References

- [HLiquity Documentation: Redemptions](https://docs.hliquity.org/deep-dive/redemptions-and-hchf-price-stability)
- [Hedera Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)
- [Ethers.js Interface Documentation](https://docs.ethers.org/v5/api/utils/abi/interface/)
- [Liquity Protocol: Redemption Mechanism](https://docs.liquity.org/v2-faq/redemptions-and-delegation)
