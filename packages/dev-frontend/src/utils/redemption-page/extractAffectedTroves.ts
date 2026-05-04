import { Decimal } from "@liquity/lib-base";
import { Interface } from "@ethersproject/abi";
import TroveManagerAbi from "@liquity/lib-ethers/abi/TroveManager.json";
import { MirrorNodeClient } from "./mirrorNodeTypes.ts";

const troveManagerInterface = new Interface(TroveManagerAbi);

// ─── Types

type TroveState = { debt: Decimal; collateral: Decimal };

/** Lightweight shape returned on initial load — the "after" state from the log,
 *  plus optionally the "before" state from the operation=0 (apply) event. */
export interface AffectedTroveAfter {
  borrower: string;
  debtAfter: Decimal;
  collateralAfter: Decimal;
  /** From the operation=0 (apply pending rewards) event at the same timestamp, if available. */
  debtBefore?: Decimal;
  collateralBefore?: Decimal;
}

/** Full shape with before/after/redeemed, populated after lazy enrichment. */
export interface AffectedTrove extends AffectedTroveAfter {
  debtBefore: Decimal;
  debtRedeemed: Decimal;
  collateralBefore: Decimal;
  collateralRedeemed: Decimal;
}

// ─── Constants

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;
// Jan 1, 2024 — before the contract was deployed
const EARLIEST_SEARCH_FLOOR = 1704067200;

// ─── Hedera address helpers

// Long-zero EVM addresses have the form 0x000000000000000000000000XXXXXXXXXXXXXXXX
// i.e. the first 12 bytes (24 hex chars) after "0x" are all zeros.
const isLongZeroAddress = (address: string): boolean =>
  address.toLowerCase().replace("0x", "").slice(0, 24) === "000000000000000000000000";

/** Pads an EVM address into a 32-byte (64 hex char) topic1 value. */
const addressToTopic1 = (address: string): string =>
  "0x" + address.toLowerCase().replace("0x", "").padStart(64, "0");

/**
 * Looks up the ECDSA alias for a Hedera long-zero address.
 * Returns null if the address has no alias or the lookup fails.
 */
const getEcdsaAlias = async (
  mirrorNodeClient: MirrorNodeClient,
  longZeroAddress: string
): Promise<string | null> => {
  try {
    // Extract the account number from the last 8 bytes of the long-zero address
    const accountNum = BigInt("0x" + longZeroAddress.replace("0x", "").slice(-16)).toString();
    const accountId = `0.0.${accountNum}`;

    const response = await mirrorNodeClient.GET("/api/v1/accounts/{idOrAliasOrEvmAddress}", {
      params: { path: { idOrAliasOrEvmAddress: accountId } }
    });

    const alias = response.data?.evm_address;
    if (!alias || alias.toLowerCase() === longZeroAddress.toLowerCase()) return null;
    return alias;
  } catch {
    return null;
  }
};

// ─── Log helpers

type ParsedTroveLog = {
  borrower: string;
  debt: Decimal;
  collateral: Decimal;
  operation: number;
};

/** Parses a raw Mirror Node log entry into TroveUpdated fields, or returns null. */
const parseTroveLog = (log: { topics?: string[]; data?: string }): ParsedTroveLog | null => {
  try {
    const parsed = troveManagerInterface.parseLog({
      topics: log.topics || [],
      data: log.data || "0x"
    });
    if (parsed.name !== "TroveUpdated") return null;
    return {
      borrower: parsed.args._borrower as string,
      debt: Decimal.fromBigNumberStringWithPrecision(parsed.args._debt.toString(), 8),
      collateral: Decimal.fromBigNumberStringWithPrecision(parsed.args._coll.toString(), 8),
      operation: parsed.args._operation as number
    };
  } catch {
    return null;
  }
};

const fetchLogsForTopic1 = async (
  mirrorNodeClient: MirrorNodeClient,
  contractAddress: string,
  topic0: string,
  topic1: string,
  windowStart: number,
  windowEnd: number,
  limit = 1
) => {
  const response = await mirrorNodeClient.GET(
    "/api/v1/contracts/{contractIdOrAddress}/results/logs",
    {
      params: {
        path: { contractIdOrAddress: contractAddress },
        query: {
          timestamp: [`gt:${windowStart}`, `lt:${windowEnd}`],
          topic0: [topic0],
          topic1: [topic1],
          limit,
          order: "desc"
        }
      }
    }
  );
  return response.data?.logs ?? [];
};

// ─── Previous-state search

/**
 * Returns all topic1 variants to search for a borrower.
 * On Hedera, the same account may emit events under a long-zero address or its ECDSA alias.
 */
const buildTopic1Variants = async (
  mirrorNodeClient: MirrorNodeClient,
  borrower: string
): Promise<string[]> => {
  const variants = [addressToTopic1(borrower)];
  if (isLongZeroAddress(borrower)) {
    const alias = await getEcdsaAlias(mirrorNodeClient, borrower);
    if (alias) variants.push(addressToTopic1(alias));
  }
  return variants;
};

/**
 * Searches a single time window across all contract × address combinations for the most
 * recent TroveUpdated log for a borrower, excluding the redemption event itself.
 */
const searchWindow = async (
  mirrorNodeClient: MirrorNodeClient,
  contractAddresses: string[],
  topic0: string,
  topic1Variants: string[],
  windowStart: number,
  windowEnd: number,
  excludeTimestamp: string
): Promise<TroveState | null> => {
  // Use limit=2 so that if float precision causes the redemption event to be included,
  // the actual previous event is still returned.
  const queries = contractAddresses.flatMap(addr =>
    topic1Variants.map(t1 =>
      fetchLogsForTopic1(mirrorNodeClient, addr, topic0, t1, windowStart, windowEnd, 2)
    )
  );

  const allLogs = (await Promise.all(queries)).flat();
  const log = allLogs
    .filter(l => (l as { timestamp?: string }).timestamp !== excludeTimestamp)
    .sort((a, b) => {
      const tsA = parseFloat((a as { timestamp?: string }).timestamp ?? "0");
      const tsB = parseFloat((b as { timestamp?: string }).timestamp ?? "0");
      return tsB - tsA;
    })[0];

  if (!log) return null;
  const parsed = parseTroveLog(log as { topics?: string[]; data?: string });
  return parsed ? { debt: parsed.debt, collateral: parsed.collateral } : null;
};

/**
 * Fetches the previous state of a trove before the redemption.
 * Searches backwards in 7-day windows (Mirror Node's maximum range for topic queries)
 * across both TroveManager and BorrowerOperations contracts, and both Hedera address forms.
 *
 * On Hedera, logs are indexed under the directly-called contract — trove adjustments go
 * through BorrowerOperations, while redemptions go through TroveManager.
 */
const getPreviousTroveState = async (
  mirrorNodeClient: MirrorNodeClient,
  borrower: string,
  beforeTimestamp: string,
  contractAddresses: string[]
): Promise<TroveState | null> => {
  try {
    const topic0 = troveManagerInterface.getEventTopic("TroveUpdated");
    const topic1Variants = await buildTopic1Variants(mirrorNodeClient, borrower);

    let windowEnd = parseFloat(beforeTimestamp);
    while (windowEnd > EARLIEST_SEARCH_FLOOR) {
      const windowStart = Math.max(windowEnd - SEVEN_DAYS_IN_SECONDS, EARLIEST_SEARCH_FLOOR);
      const state = await searchWindow(
        mirrorNodeClient, contractAddresses, topic0, topic1Variants,
        windowStart, windowEnd, beforeTimestamp
      );
      if (state) return state;
      windowEnd = windowStart;
    }

    return null;
  } catch {
    return null;
  }
};

// ─── Public API

/**
 * Cheap initial extraction: parses the logs at the redemption timestamp and returns
 * only the "after" state for each affected trove. No backwards searching.
 *
 * Also captures the "before" state from the operation=0 (apply pending rewards) event
 * that Liquity emits right before the redemption for each trove at the same timestamp.
 */
export const extractAffectedTrovesFromLogs = async (
  mirrorNodeClient: MirrorNodeClient,
  timestamp: string,
  troveManagerAddress: string
): Promise<AffectedTroveAfter[]> => {
  try {
    const logsResponse = await mirrorNodeClient.GET(
      "/api/v1/contracts/{contractIdOrAddress}/results/logs",
      {
        params: {
          path: { contractIdOrAddress: troveManagerAddress },
          query: { timestamp: [timestamp] }
        }
      }
    );

    const beforeStates = new Map<string, TroveState>();
    const afterStates: AffectedTroveAfter[] = [];

    for (const log of logsResponse.data?.logs ?? []) {
      const parsed = parseTroveLog(log as { topics?: string[]; data?: string });
      if (!parsed) continue;
      const { borrower, debt, collateral, operation } = parsed;

      if (operation === 0) {
        // apply pending rewards — emitted before the redemption
        beforeStates.set(borrower.toLowerCase(), { debt, collateral });
      } else if (operation === 3) {
        // redemption — the "after" state
        afterStates.push({ borrower, debtAfter: debt, collateralAfter: collateral });
      }
    }

    return afterStates.map(trove => {
      const before = beforeStates.get(trove.borrower.toLowerCase());
      return before
        ? { ...trove, debtBefore: before.debt, collateralBefore: before.collateral }
        : trove;
    });
  } catch (error) {
    console.error("Error fetching affected troves from logs:", error);
    return [];
  }
};

const enrichOneTrove = async (
  mirrorNodeClient: MirrorNodeClient,
  timestamp: string,
  contractAddresses: string[],
  troveAfter: AffectedTroveAfter
): Promise<AffectedTrove> => {
  const previousState: TroveState | null =
    troveAfter.debtBefore && troveAfter.collateralBefore
      ? { debt: troveAfter.debtBefore, collateral: troveAfter.collateralBefore }
      : await getPreviousTroveState(
          mirrorNodeClient, troveAfter.borrower, timestamp, contractAddresses
        );

  if (previousState && previousState.debt.gte(troveAfter.debtAfter)) {
    return {
      borrower: troveAfter.borrower,
      debtBefore: previousState.debt,
      debtAfter: troveAfter.debtAfter,
      debtRedeemed: previousState.debt.sub(troveAfter.debtAfter),
      collateralBefore: previousState.collateral,
      collateralAfter: troveAfter.collateralAfter,
      collateralRedeemed: previousState.collateral.gte(troveAfter.collateralAfter)
        ? previousState.collateral.sub(troveAfter.collateralAfter)
        : Decimal.ZERO
    };
  }

  return {
    borrower: troveAfter.borrower,
    debtBefore: troveAfter.debtAfter,
    debtAfter: troveAfter.debtAfter,
    debtRedeemed: Decimal.ZERO,
    collateralBefore: troveAfter.collateralAfter,
    collateralAfter: troveAfter.collateralAfter,
    collateralRedeemed: Decimal.ZERO
  };
};

/**
 * Enrichment: calculates the redeemed amounts for each trove.
 * Uses the "before" state from the operation=0 event (captured during initial extraction)
 * when available, falling back to the expensive backwards window search.
 */
export const enrichAffectedTroves = async (
  mirrorNodeClient: MirrorNodeClient,
  timestamp: string,
  troveManagerAddress: string,
  borrowerOperationsAddress: string,
  trovesAfter: AffectedTroveAfter[]
): Promise<AffectedTrove[]> => {
  const contractAddresses = [troveManagerAddress, borrowerOperationsAddress];
  return Promise.all(
    trovesAfter.map(troveAfter => enrichOneTrove(mirrorNodeClient, timestamp, contractAddresses, troveAfter))
  );
};
