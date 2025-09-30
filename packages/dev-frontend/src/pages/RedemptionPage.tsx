/** @jsxImportSource theme-ui */
import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, Container, Heading, Paragraph, Spinner, Text } from "theme-ui";
import { Decimal } from "@liquity/lib-base";
import { useMirrorNodeClient } from "../components/MirrorNodeClientContext";
import { useDeployment } from "../hooks/deployments";
import { useMultiWallet } from "../multi_wallet";
import { AccountId, TokenId } from "@hashgraph/sdk";
import { useLiquitySelector } from "@liquity/lib-react";
import { Tooltip } from "../components/Tooltip";
import { components } from "../../.mirror-node";

/** hard-coded version of:
 * const { keccak256 } = require("js-sha3");
 * const signature = "redeemCollateral(...)";
 * const selector = keccak256(signature).slice(0, 8); // first 4 bytes in hex
 * while unlikely, this will break if the funciton signature changes
 */
const redeemCollateralSelector = "bcd37526";
const redeemCollateralFunctionParametersStart = `0x${redeemCollateralSelector}`;

interface Redemption {
  transactionId: string;
  timestamp: string;
  amountOfHchf: Decimal;
  amountOfHbar: Decimal;
}

const shortDateTimeFormat = new Intl.DateTimeFormat(navigator.language, {
  dateStyle: "short",
  timeStyle: "short"
});

const longDateTimeFormat = new Intl.DateTimeFormat(navigator.language, {
  dateStyle: "full",
  timeStyle: "full"
});

export const RedemptionsPage: React.FC = () => {
  const [redemptions, setRedemptions] = useState<Redemption[] | null>(null);

  const mirrorNodeClient = useMirrorNodeClient();
  const deployment = useDeployment();
  const multiWallet = useMultiWallet();
  const store = useLiquitySelector(({ hchfTokenAddress }) => ({ hchfTokenAddress }));
  const accountIdString = useMemo(() => {
    if (!multiWallet.addressDisplayText) {
      return;
    }

    // evm addresses
    if (multiWallet.addressDisplayText.startsWith("0x")) {
      return AccountId.fromEvmAddress(0, 0, multiWallet.addressDisplayText).toString();
    }

    return AccountId.fromString(multiWallet.addressDisplayText).toString();
  }, [multiWallet.addressDisplayText]);

  useEffect(() => {
    const effect = async () => {
      if (!deployment || !accountIdString) {
        return;
      }

      const hchfTokenIdString = TokenId.fromEvmAddress(0, 0, store.hchfTokenAddress).toString();

      const resultsResponse = await mirrorNodeClient.GET(
        "/api/v1/contracts/{contractIdOrAddress}/results",
        {
          params: {
            path: {
              contractIdOrAddress: deployment.addresses.troveManager
            },
            query: {
              from: accountIdString,
              internal: true
            }
          }
        }
      );
      if (!resultsResponse.data?.results) {
        return;
      }

      const redeemCollateralResults = resultsResponse.data.results.filter(
        (result): result is { timestamp: string } & typeof result => {
          return (
            !!result.timestamp &&
            !!result.function_parameters?.startsWith(redeemCollateralFunctionParametersStart)
          );
        }
      );

      const redemptionOrUndefined = await Promise.all(
        redeemCollateralResults.map(async (result): Promise<Redemption | undefined> => {
          const timestamp = result.timestamp;

          const timestampedTransactionsResponse = await mirrorNodeClient.GET(
            "/api/v1/transactions",
            {
              params: {
                query: {
                  "account.id": accountIdString,
                  timestamp: [timestamp]
                }
              }
            }
          );

          const transactionId =
            timestampedTransactionsResponse.data?.transactions?.[0]?.transaction_id;
          if (!transactionId) {
            return;
          }

          const idTransactionsResponse = await mirrorNodeClient.GET(
            "/api/v1/transactions/{transactionId}",
            {
              params: {
                path: {
                  transactionId: transactionId
                }
              }
            }
          );
          if (!idTransactionsResponse.data?.transactions?.length) {
            return;
          }

          // find the token amounts
          let hbarTransfer:
            | NonNullable<Required<components["schemas"]["Transaction"]["transfers"]>>[0]
            | undefined = undefined;
          let hchfTransfer:
            | NonNullable<Required<components["schemas"]["Transaction"]["token_transfers"]>>[0]
            | undefined = undefined;
          for (const transaction of idTransactionsResponse.data.transactions) {
            // ignore all failed transactions
            if (transaction.result !== "SUCCESS") {
              continue;
            }

            // find the first hbar transfer
            if (!hbarTransfer && transaction.transfers?.length) {
              hbarTransfer = transaction.transfers.find(transfer => {
                return transfer.account === accountIdString;
              });
              continue;
            }

            // find the first hchf transfer
            if (!hchfTransfer && transaction.name === "CRYPTOTRANSFER") {
              hchfTransfer = transaction.token_transfers?.find(tokenTransfer => {
                console.debug();

                return (
                  tokenTransfer.token_id === hchfTokenIdString &&
                  tokenTransfer.account === accountIdString
                );
              });
              continue;
            }
          }

          const firstSuccessfulCryptoTransferTransaction =
            idTransactionsResponse.data?.transactions?.find(transaction => {
              return transaction.name === "CRYPTOTRANSFER" && transaction.result === "SUCCESS";
            });
          if (!firstSuccessfulCryptoTransferTransaction?.token_transfers?.length) {
            return;
          }

          if (!hchfTransfer || !hbarTransfer) {
            return;
          }

          const amountOfHchf = Decimal.fromBigNumberStringWithPrecision(
            Math.abs(hchfTransfer.amount).toString(),
            8
          );
          const amountOfHbar = Decimal.fromBigNumberStringWithPrecision(
            Math.abs(hbarTransfer.amount).toString(),
            8
          );

          return {
            timestamp,
            transactionId,
            amountOfHchf,
            amountOfHbar
          };
        })
      );
      const redemptions = redemptionOrUndefined.filter(
        (redemption): redemption is Redemption => !!redemption
      );

      setRedemptions(redemptions);
    };

    effect();
  }, [deployment, accountIdString, mirrorNodeClient, store.hchfTokenAddress]);

  return (
    <Container>
      <Card>
        <Heading>Redemptions</Heading>

        <Paragraph
          sx={{
            mt: 1,
            px: 3
          }}
        >
          Your HCHF redemption history.
        </Paragraph>

        {!redemptions ? (
          <Box
            sx={{
              width: "100%",
              display: "grid",
              placeContent: "center",
              my: 4,
              px: 3
            }}
          >
            <Spinner />
          </Box>
        ) : (
          <Box
            as="table"
            sx={{
              width: "100%",
              textAlign: "start",
              lineHeight: 1.15,
              my: 4,
              px: 3
            }}
          >
            <thead>
              <tr>
                {/* hchf */}
                <th
                  sx={{
                    textAlign: "start",
                    paddingBottom: "0.5rem",
                    verticalAlign: "top"
                  }}
                >
                  <Tooltip message={<Text>The amount of HCHF you paid.</Text>}>
                    Redeemed
                    <Box sx={{ fontSize: [0, 1], fontWeight: "body", opacity: 0.5 }}>HCHF</Box>
                  </Tooltip>
                </th>

                {/* hbar */}
                <th
                  sx={{
                    textAlign: "start",
                    paddingBottom: "0.5rem",
                    verticalAlign: "top"
                  }}
                >
                  <Tooltip message={<Text>The amount of HBAR you received.</Text>}>
                    Received
                    <Box sx={{ fontSize: [0, 1], fontWeight: "body", opacity: 0.5 }}>HBAR</Box>
                  </Tooltip>
                </th>

                {/* date */}
                <th
                  sx={{
                    textAlign: "start",
                    paddingBottom: "0.5rem",
                    verticalAlign: "top"
                  }}
                >
                  <Tooltip message={<Text>The date and time of the transaction.</Text>}>
                    Date
                  </Tooltip>
                </th>
              </tr>
            </thead>

            <tbody>
              {redemptions.map(redemption => {
                const date = new Date(parseFloat(redemption.timestamp) * 1000);
                const shortDate = shortDateTimeFormat.format(date);
                const longDate = longDateTimeFormat.format(date);

                return (
                  <tr key={redemption.transactionId}>
                    {/* hchf */}
                    <td
                      sx={{
                        paddingBlock: "0.25rem"
                      }}
                    >
                      <Tooltip message={<Text>{redemption.amountOfHchf.toString()}</Text>}>
                        {redemption.amountOfHchf.shorten()}
                      </Tooltip>
                    </td>

                    {/* hbar */}
                    <td
                      sx={{
                        paddingBlock: "0.25rem"
                      }}
                    >
                      <Tooltip message={<Text>{redemption.amountOfHbar.toString()}</Text>}>
                        {redemption.amountOfHbar.shorten()}
                      </Tooltip>
                    </td>

                    {/* date */}
                    <td
                      sx={{
                        paddingBlock: "0.25rem"
                      }}
                    >
                      <Tooltip message={<Text>{longDate}</Text>}>{shortDate}</Tooltip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Box>
        )}
      </Card>
    </Container>
  );
};
