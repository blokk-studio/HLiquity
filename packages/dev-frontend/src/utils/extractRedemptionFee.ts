import { Decimal } from "@liquity/lib-base";
import { Interface } from "@ethersproject/abi";
import TroveManagerAbi from "@liquity/lib-ethers/abi/TroveManager.json";
import { MirrorNodeClient } from "./mirrorNodeTypes";

const troveManagerInterface = new Interface(TroveManagerAbi);

export const extractRedemptionFeeFromLogs = async (
  mirrorNodeClient: MirrorNodeClient,
  timestamp: string,
  troveManagerAddress: string
): Promise<Decimal> => {
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

    if (logsResponse.data?.logs) {
      for (const log of logsResponse.data.logs) {
        try {
          const parsedLog = troveManagerInterface.parseLog({
            topics: log.topics || [],
            data: log.data || "0x"
          });

          if (parsedLog.name === "Redemption") {
            const ethFee = parsedLog.args._ETHFee;
            return Decimal.fromBigNumberStringWithPrecision(
              ethFee.toString(),
              8
            );
          }
        } catch (e) {
          // continue
        }
      }
    }

    return Decimal.ZERO;
  } catch (error) {
    console.error("Error fetching redemption fee from logs:", error);
    return Decimal.ZERO;
  }
};
