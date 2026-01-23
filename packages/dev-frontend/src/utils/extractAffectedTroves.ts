import { Decimal } from "@liquity/lib-base";
import { Interface } from "@ethersproject/abi";
import TroveManagerAbi from "@liquity/lib-ethers/abi/TroveManager.json";
import { MirrorNodeClient } from "./mirrorNodeTypes";

const troveManagerInterface = new Interface(TroveManagerAbi);

export interface AffectedTrove {
  borrower: string;
  debtBefore: Decimal;
  debtAfter: Decimal;
  debtRedeemed: Decimal;
  collateralBefore: Decimal;
  collateralAfter: Decimal;
  collateralRedeemed: Decimal;
}

/**
 * Fetches the previous state of a trove before the redemption
 * Strategy: Query all contract results, then search through their logs
 */
const getPreviousTroveState = async (
  mirrorNodeClient: MirrorNodeClient,
  borrower: string,
  beforeTimestamp: string,
  troveManagerAddress: string
): Promise<{ debt: Decimal; collateral: Decimal } | null> => {
  try {
    // Normalize borrower address to lowercase without 0x prefix for comparison
    const normalizedBorrower = borrower.toLowerCase().replace("0x", "");

    // Strategy: Query contract results (not logs) to get transactions before this timestamp
    // Then fetch logs for each transaction to find TroveUpdated events for this borrower
    const resultsResponse = await mirrorNodeClient.GET(
      "/api/v1/contracts/{contractIdOrAddress}/results",
      {
        params: {
          path: { contractIdOrAddress: troveManagerAddress },
          query: {
            timestamp: [`lt:${beforeTimestamp}`],
            limit: 50,
            order: "desc"
          }
        }
      }
    );

    if (!resultsResponse.data?.results || resultsResponse.data.results.length === 0) {
      console.log(`No contract results found before ${beforeTimestamp}`);
      return null;
    }

    // Search through each result's timestamp to fetch logs
    for (const result of resultsResponse.data.results) {
      if (!result.timestamp) continue;

      // Fetch logs for this specific timestamp
      const logsResponse = await mirrorNodeClient.GET(
        "/api/v1/contracts/{contractIdOrAddress}/results/logs",
        {
          params: {
            path: { contractIdOrAddress: troveManagerAddress },
            query: {
              timestamp: [result.timestamp]
            }
          }
        }
      );

      if (!logsResponse.data?.logs || logsResponse.data.logs.length === 0) {
        continue;
      }

      // Parse each log to find TroveUpdated events for this borrower
      for (const log of logsResponse.data.logs) {
        try {
          const parsedLog = troveManagerInterface.parseLog({
            topics: log.topics || [],
            data: log.data || "0x"
          });

          // Check if this is a TroveUpdated event for our borrower
          if (parsedLog.name === "TroveUpdated") {
            const logBorrower = parsedLog.args._borrower.toLowerCase().replace("0x", "");

            if (logBorrower === normalizedBorrower) {
              return {
                debt: Decimal.fromBigNumberStringWithPrecision(
                  parsedLog.args._debt.toString(),
                  8
                ),
                collateral: Decimal.fromBigNumberStringWithPrecision(
                  parsedLog.args._coll.toString(),
                  8
                )
              };
            }
          }
        } catch (e) {
          // Skip logs that don't parse
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const extractAffectedTrovesFromLogs = async (
  mirrorNodeClient: MirrorNodeClient,
  timestamp: string,
  troveManagerAddress: string
): Promise<AffectedTrove[]> => {
  try {
    console.log("Fetching affected troves for timestamp:", timestamp);
    const logsResponse = await mirrorNodeClient.GET(
      "/api/v1/contracts/{contractIdOrAddress}/results/logs",
      {
        params: {
          path: { contractIdOrAddress: troveManagerAddress },
          query: { timestamp: [timestamp] }
        }
      }
    );

    // First pass: collect affected troves with their "after" state
    const affectedTrovesAfter: Array<{
      borrower: string;
      debtAfter: Decimal;
      collateralAfter: Decimal;
    }> = [];

    if (logsResponse.data?.logs) {
      for (const log of logsResponse.data.logs) {
        try {
          const parsedLog = troveManagerInterface.parseLog({
            topics: log.topics || [],
            data: log.data || "0x"
          });

          console.log("Parsed log:", {
            name: parsedLog.name,
            operation: parsedLog.args._operation,
            allArgs: parsedLog.args
          });

          // Note: 0=apply, 1=close, 2=adjust, 3=redemption
          if (parsedLog.name === "TroveUpdated" && parsedLog.args._operation === 3) {
            const borrower = parsedLog.args._borrower;
            const debt = parsedLog.args._debt;
            const coll = parsedLog.args._coll;

            console.log("Found TroveUpdated with redemption operation:", {
              borrower,
              debt: debt.toString(),
              coll: coll.toString()
            });

            affectedTrovesAfter.push({
              borrower: borrower,
              debtAfter: Decimal.fromBigNumberStringWithPrecision(debt.toString(), 8),
              collateralAfter: Decimal.fromBigNumberStringWithPrecision(coll.toString(), 8)
            });
          }
        } catch (e) {
          console.log("Error parsing log:", e);
        }
      }
    }

    // Second pass: fetch previous state for each affected trove and calculate redemption amounts
    return await Promise.all(
      affectedTrovesAfter.map(async (troveAfter) => {
        const previousState = await getPreviousTroveState(
          mirrorNodeClient,
          troveAfter.borrower,
          timestamp,
          troveManagerAddress
        );

        if (previousState) {
          // Calculate what was redeemed
          const debtRedeemed = previousState.debt.sub(troveAfter.debtAfter);
          const collateralRedeemed = previousState.collateral.sub(troveAfter.collateralAfter);

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
          // If we can't find previous state, assume the trove was fully redeemed (it was opened and immediately redeemed, or this is the first event)
          return {
            borrower: troveAfter.borrower,
            debtBefore: troveAfter.debtAfter, // Best guess - no change
            debtAfter: troveAfter.debtAfter,
            debtRedeemed: Decimal.ZERO,
            collateralBefore: troveAfter.collateralAfter,
            collateralAfter: troveAfter.collateralAfter,
            collateralRedeemed: Decimal.ZERO
          };
        }
      })
    );
  } catch (error) {
    console.error("Error fetching affected troves from logs:", error);
    return [];
  }
};
