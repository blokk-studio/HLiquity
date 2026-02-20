import { Decimal } from "@liquity/lib-base";
import { Interface } from "@ethersproject/abi";
import TroveManagerAbi from "@liquity/lib-ethers/abi/TroveManager.json";
import { MirrorNodeClient } from "./mirrorNodeTypes";

const troveManagerInterface = new Interface(TroveManagerAbi);

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

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;
// Jan 1, 2024 — before the contract was deployed
const EARLIEST_SEARCH_FLOOR = 1704067200;

const isLongZeroAddress = (address: string): boolean => {
  // Long-zero EVM addresses have the form 0x000000000000000000000000XXXXXXXXXXXXXXXX
  // i.e. the first 12 bytes (24 hex chars) after "0x" are all zeros
  return address.toLowerCase().replace("0x", "").slice(0, 24) === "000000000000000000000000";
};

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
    if (!alias || alias.toLowerCase() === longZeroAddress.toLowerCase()) {
      return null;
    }
    return alias;
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

/**
 * Fetches the previous state of a trove before the redemption.
 * Uses topic-filtered log queries (topic0 = TroveUpdated hash, topic1 = borrower address)
 * and searches backwards in 7-day windows (Mirror Node's maximum range for topic queries).
 * Searches both the long-zero and ECDSA alias addresses in parallel to handle Hedera's
 * address duality. Also searches both TroveManager and BorrowerOperations contracts, since
 * on Hedera logs are indexed under the directly-called contract (e.g. trove adjustments go
 * through BorrowerOperations, but redemptions go through TroveManager).
 */
const getPreviousTroveState = async (
  mirrorNodeClient: MirrorNodeClient,
  borrower: string,
  beforeTimestamp: string,
  contractAddresses: string[]
): Promise<{ debt: Decimal; collateral: Decimal } | null> => {
  try {
    const topic0 = troveManagerInterface.getEventTopic("TroveUpdated");
    const topic1 = "0x" + borrower.toLowerCase().replace("0x", "").padStart(64, "0");

    // If this is a long-zero address, also look up the ECDSA alias — on Hedera,
    // the same account may have emitted TroveUpdated events under either address.
    let topic1Alias: string | null = null;
    if (isLongZeroAddress(borrower)) {
      const alias = await getEcdsaAlias(mirrorNodeClient, borrower);
      if (alias) {
        topic1Alias = "0x" + alias.toLowerCase().replace("0x", "").padStart(64, "0");
      }
    }

    let windowEnd = parseFloat(beforeTimestamp);

    while (windowEnd > EARLIEST_SEARCH_FLOOR) {
      const windowStart = Math.max(windowEnd - SEVEN_DAYS_IN_SECONDS, EARLIEST_SEARCH_FLOOR);

      // Search all contract × address combinations in parallel.
      // Use limit: 2 so that if float precision causes the redemption event itself
      // to be included, the actual previous event is still fetched.
      const queries: ReturnType<typeof fetchLogsForTopic1>[] = [];
      for (const contractAddress of contractAddresses) {
        queries.push(fetchLogsForTopic1(mirrorNodeClient, contractAddress, topic0, topic1, windowStart, windowEnd, 2));
        if (topic1Alias) {
          queries.push(fetchLogsForTopic1(mirrorNodeClient, contractAddress, topic0, topic1Alias, windowStart, windowEnd, 2));
        }
      }

      const results = await Promise.all(queries);
      // Flatten all logs, filter out the redemption event itself, pick the most recent.
      const allLogs = results.flat();
      const filtered = allLogs
        .filter(l => (l as { timestamp?: string }).timestamp !== beforeTimestamp);

      const log = filtered
        .sort((a, b) => {
          const tsA = parseFloat((a as { timestamp?: string }).timestamp ?? "0");
          const tsB = parseFloat((b as { timestamp?: string }).timestamp ?? "0");
          return tsB - tsA;
        })[0];

      if (log) {
        const parsedLog = troveManagerInterface.parseLog({
          topics: log.topics || [],
          data: log.data || "0x"
        });
        return {
          debt: Decimal.fromBigNumberStringWithPrecision(parsedLog.args._debt.toString(), 8),
          collateral: Decimal.fromBigNumberStringWithPrecision(
            parsedLog.args._coll.toString(),
            8
          )
        };
      }

      windowEnd = windowStart;
    }

    return null;
  } catch {
    return null;
  }
};

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

    // Collect operation=0 (apply) events as "before" state, keyed by borrower
    const beforeStates = new Map<string, { debt: Decimal; collateral: Decimal }>();
    // Collect operation=3 (redemption) events as "after" state
    const afterStates: AffectedTroveAfter[] = [];

    if (logsResponse.data?.logs) {
      for (const log of logsResponse.data.logs) {
        try {
          const parsedLog = troveManagerInterface.parseLog({
            topics: log.topics || [],
            data: log.data || "0x"
          });

          if (parsedLog.name !== "TroveUpdated") continue;

          const borrower = parsedLog.args._borrower as string;
          const debt = Decimal.fromBigNumberStringWithPrecision(
            parsedLog.args._debt.toString(),
            8
          );
          const collateral = Decimal.fromBigNumberStringWithPrecision(
            parsedLog.args._coll.toString(),
            8
          );

          // operation=0 (apply pending rewards) — emitted before the redemption
          if (parsedLog.args._operation === 0) {
            beforeStates.set(borrower.toLowerCase(), { debt, collateral });
          }

          // operation=3 (redemption) — the "after" state
          if (parsedLog.args._operation === 3) {
            afterStates.push({
              borrower,
              debtAfter: debt,
              collateralAfter: collateral
            });
          }
        } catch (e) {
          // skip logs that don't parse
        }
      }
    }

    // Attach the "before" state from operation=0 if available
    return afterStates.map(trove => {
      const before = beforeStates.get(trove.borrower.toLowerCase());
      if (before) {
        return { ...trove, debtBefore: before.debt, collateralBefore: before.collateral };
      }
      return trove;
    });
  } catch (error) {
    console.error("Error fetching affected troves from logs:", error);
    return [];
  }
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
  return await Promise.all(
    trovesAfter.map(async (troveAfter) => {
      // Prefer the "before" state from the operation=0 event at the same timestamp
      let previousState: { debt: Decimal; collateral: Decimal } | null = null;
      if (troveAfter.debtBefore && troveAfter.collateralBefore) {
        previousState = {
          debt: troveAfter.debtBefore,
          collateral: troveAfter.collateralBefore
        };
      } else {
        // Fallback: expensive backwards window search across both contracts.
        // On Hedera, logs are indexed under the directly-called contract, so trove
        // opens/adjusts are under BorrowerOperations while redemptions are under TroveManager.
        previousState = await getPreviousTroveState(
          mirrorNodeClient,
          troveAfter.borrower,
          timestamp,
          [troveManagerAddress, borrowerOperationsAddress]
        );
      }

      if (previousState && previousState.debt.gte(troveAfter.debtAfter)) {
        const debtRedeemed = previousState.debt.sub(troveAfter.debtAfter);
        const collateralRedeemed = previousState.collateral.gte(troveAfter.collateralAfter)
          ? previousState.collateral.sub(troveAfter.collateralAfter)
          : Decimal.ZERO;

        return {
          borrower: troveAfter.borrower,
          debtBefore: previousState.debt,
          debtAfter: troveAfter.debtAfter,
          debtRedeemed,
          collateralBefore: previousState.collateral,
          collateralAfter: troveAfter.collateralAfter,
          collateralRedeemed
        };
      } else {
        return {
          borrower: troveAfter.borrower,
          debtBefore: troveAfter.debtAfter,
          debtAfter: troveAfter.debtAfter,
          debtRedeemed: Decimal.ZERO,
          collateralBefore: troveAfter.collateralAfter,
          collateralAfter: troveAfter.collateralAfter,
          collateralRedeemed: Decimal.ZERO
        };
      }
    })
  );
};
