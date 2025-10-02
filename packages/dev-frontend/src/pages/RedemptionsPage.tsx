/** @jsxImportSource theme-ui */
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Link,
  Paragraph,
  Spinner,
  Text
} from "theme-ui";
import { Decimal } from "@liquity/lib-base";
import { useMirrorNodeClient } from "../components/MirrorNodeClientContext";
import { useDeployment } from "../hooks/deployments";
import { useMultiWallet } from "../multi_wallet";
import { AccountId, TokenId } from "@hashgraph/sdk";
import { useLiquitySelector } from "@liquity/lib-react";
import { Tooltip } from "../components/Tooltip";
import { components } from "../../.mirror-node";
import { ActionDescription } from "../components/ActionDescription";
import { ErrorDescription } from "../components/ErrorDescription";
import { useSelectedChain } from "../components/chain_context";
import { useLocation } from "react-router";
import { Icon } from "../components/Icon";
import { Link as RouterLink } from "../components/Link";

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
  accountIdString: string;
  amountOfHchf: Decimal;
  amountOfHbar: Decimal;
}

const shortDateTimeFormat = new Intl.DateTimeFormat(navigator.language, {
  dateStyle: "short",
  timeStyle: "short"
});

const fullDateTimeFormat = new Intl.DateTimeFormat(navigator.language, {
  dateStyle: "full",
  timeStyle: "full"
});

const getTimestampFromHref = (href: string) => {
  const timestampParam = new URL(href, window.location.origin).searchParams.get("timestamp");
  if (!timestampParam) {
    return;
  }

  const timestampString = timestampParam.replace(/^\w+:/g, "");
  const timestamp = parseFloat(timestampString);

  if (isNaN(timestamp)) {
    return;
  }

  return timestampString;
};

export const RedemptionsPage: React.FC = () => {
  const [redemptions, setRedemptions] = useState<Redemption[] | Error | null>(null);

  const mirrorNodeClient = useMirrorNodeClient();
  const deployment = useDeployment();
  const chain = useSelectedChain();
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
  const hchfTokenIdString = useMemo(() => {
    if (!store.hchfTokenAddress) {
      return;
    }

    return TokenId.fromEvmAddress(0, 0, store.hchfTokenAddress).toString();
  }, [store.hchfTokenAddress]);
  const [pagination, setPagination] = useState<{
    previous?: string;
    next?: string;
  }>({});
  const location = useLocation();
  const urlTimestamp = useMemo(() => {
    return getTimestampFromHref(`${location.pathname}${location.search}${location.hash}`);
  }, [location]);

  useEffect(() => {
    const effect = async () => {
      setRedemptions(null);
      setPagination({});

      if (!deployment || !hchfTokenIdString) {
        setRedemptions(
          new Error(
            "The frontend is misconfigured. This should never happen, please contact support."
          )
        );
        return;
      }

      const timestamp = urlTimestamp ?? Date.now() / 1000;
      const resultsResponse = await mirrorNodeClient.GET(
        "/api/v1/contracts/{contractIdOrAddress}/results",
        {
          params: {
            path: {
              contractIdOrAddress: deployment.addresses.troveManager
            },
            query: {
              timestamp: [`lte:${timestamp}`]
            }
          }
        }
      );
      if (resultsResponse.error) {
        setRedemptions(
          new Error(
            resultsResponse.error._status?.messages?.[0].message ??
              "Something went wrong unexpectedly."
          )
        );
      }
      if (!resultsResponse.data?.results) {
        setRedemptions([]);
        setPagination({});
        return;
      }

      // fetch details for all transactions
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
          if (!result.from) {
            return;
          }

          const accountIdString = AccountId.fromEvmAddress(0, 0, result.from).toString();
          const timestamp = result.timestamp;

          const timestampedTransactionsResponse = await mirrorNodeClient.GET(
            "/api/v1/transactions",
            {
              params: {
                query: {
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
            accountIdString,
            amountOfHchf,
            amountOfHbar
          };
        })
      );
      const redemptions = redemptionOrUndefined.filter(
        (redemption): redemption is Redemption => !!redemption
      );

      // pagination
      let next: string | undefined = undefined;
      if (resultsResponse.data.links?.next) {
        const nextTimestamp = getTimestampFromHref(resultsResponse.data.links.next);

        if (nextTimestamp) {
          const nextUrl = new URL(
            `${location.pathname}${location.search}${location.hash}`,
            window.location.origin
          );
          nextUrl.searchParams.set("timestamp", nextTimestamp.toString());

          next = nextUrl.toString().substring(window.location.origin.length);
        }
      }

      let previous: string | undefined = undefined;
      if (urlTimestamp) {
        const previousUrl = new URL(
          `${location.pathname}${location.search}${location.hash}`,
          window.location.origin
        );
        previousUrl.searchParams.delete("timestamp");

        previous = previousUrl.toString().substring(window.location.origin.length);
      }
      // fetch the current page of transactions in reverse using the timestamp of the last transaction
      const previousResponse = await mirrorNodeClient.GET(
        "/api/v1/contracts/{contractIdOrAddress}/results",
        {
          params: {
            path: {
              contractIdOrAddress: deployment.addresses.troveManager
            },
            query: {
              timestamp: [`gt:${timestamp}`],
              order: "asc"
            }
          }
        }
      );
      if (previousResponse.data?.links?.next) {
        const previousTimestamp = getTimestampFromHref(previousResponse.data.links.next);
        if (previousTimestamp) {
          const previousUrl = new URL(
            `${location.pathname}${location.search}${location.hash}`,
            window.location.origin
          );
          previousUrl.searchParams.set("timestamp", previousTimestamp.toString());

          previous = previousUrl.toString().substring(window.location.origin.length);
        }
      }

      setRedemptions(redemptions);
      setPagination({
        next,
        previous
      });
    };

    effect();
  }, [
    deployment,
    hchfTokenIdString,
    accountIdString,
    mirrorNodeClient,
    store.hchfTokenAddress,
    urlTimestamp,
    location
  ]);

  const previousPageIcon = <Icon aria-label="Previous page" name="chevron-left" size="sm" />;
  const nextPageIcon = <Icon aria-label="Next page" name="chevron-right" size="sm" />;

  const shortUrlTimestamp = useMemo(() => {
    if (!urlTimestamp) {
      return;
    }

    return shortDateTimeFormat.format(parseFloat(urlTimestamp) * 1000);
  }, [urlTimestamp]);
  const longUrlTimestamp = useMemo(() => {
    if (!urlTimestamp) {
      return;
    }

    return fullDateTimeFormat.format(parseFloat(urlTimestamp) * 1000);
  }, [urlTimestamp]);

  return (
    <Container>
      <Card>
        <Heading
          sx={{
            float: "left"
          }}
        >
          Redemptions
        </Heading>

        <Flex
          sx={{
            float: "right",
            mt: 2,
            mr: 2
          }}
        >
          {pagination.previous ? (
            <RouterLink to={pagination.previous} sx={{ p: 0, m: 0, display: "block" }}>
              <Button as="span" variant="titleIcon">
                {previousPageIcon}
              </Button>
            </RouterLink>
          ) : (
            <Button disabled variant="titleIcon">
              {previousPageIcon}
            </Button>
          )}

          {pagination.next ? (
            <RouterLink to={pagination.next} sx={{ p: 0, m: 0, display: "block" }}>
              <Button as="span" variant="titleIcon">
                {nextPageIcon}
              </Button>
            </RouterLink>
          ) : (
            <Button disabled variant="titleIcon">
              {nextPageIcon}
            </Button>
          )}
        </Flex>

        <Paragraph
          sx={{
            mt: 1,
            px: 3,
            clear: "both"
          }}
        >
          {urlTimestamp ? (
            <>
              All redemptions on the network before{" "}
              <Tooltip message={<Text>{longUrlTimestamp}</Text>}>{shortUrlTimestamp}</Tooltip>.
            </>
          ) : (
            <>All redemptions on the network.</>
          )}
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
        ) : redemptions instanceof Error ? (
          <Box
            sx={{
              my: 4,
              px: 3
            }}
          >
            <ErrorDescription>{redemptions.message}</ErrorDescription>
          </Box>
        ) : !redemptions.length ? (
          <Box
            sx={{
              my: 4,
              px: 3
            }}
          >
            <ActionDescription>
              {longUrlTimestamp ? (
                <>
                  There are no redemptions before{" "}
                  <Tooltip message={<Text>{longUrlTimestamp}</Text>}>{shortUrlTimestamp}</Tooltip>.
                </>
              ) : (
                <>Noboy has redeemed any HCHF for HBAR yet.</>
              )}
            </ActionDescription>
          </Box>
        ) : (
          <Box
            as="table"
            sx={{
              width: "100%",
              textAlign: "start",
              lineHeight: 1.15,
              my: 4,
              px: 3,
              borderCollapse: "collapse"
            }}
          >
            <thead>
              <tr>
                {/* account */}
                <th
                  sx={{
                    textAlign: "start",
                    paddingBottom: "0.5rem",
                    verticalAlign: "top",
                    p: 2
                  }}
                >
                  <Tooltip message={<Text>The user who redeemed the HCHF for HBAR.</Text>}>
                    Account
                  </Tooltip>
                </th>

                {/* hchf */}
                <th
                  sx={{
                    textAlign: "start",
                    paddingBottom: "0.5rem",
                    verticalAlign: "top",
                    p: 2
                  }}
                >
                  <Tooltip message={<Text>The amount of HCHF the user paid.</Text>}>
                    Redeemed
                    <Box sx={{ fontSize: [0, 1], fontWeight: "body", opacity: 0.5 }}>HCHF</Box>
                  </Tooltip>
                </th>

                {/* hbar */}
                <th
                  sx={{
                    textAlign: "start",
                    paddingBottom: "0.5rem",
                    verticalAlign: "top",
                    p: 2
                  }}
                >
                  <Tooltip message={<Text>The amount of HBAR user received.</Text>}>
                    Received
                    <Box sx={{ fontSize: [0, 1], fontWeight: "body", opacity: 0.5 }}>HBAR</Box>
                  </Tooltip>
                </th>

                {/* date */}
                <th
                  sx={{
                    textAlign: "start",
                    paddingBottom: "0.5rem",
                    verticalAlign: "top",
                    p: 2
                  }}
                >
                  <Tooltip message={<Text>The date and time of the transaction.</Text>}>
                    Date
                  </Tooltip>
                </th>

                {/* links */}
                <th
                  sx={{
                    textAlign: "end",
                    paddingBottom: "0.5rem",
                    verticalAlign: "top",
                    p: 2
                  }}
                >
                  Link
                </th>
              </tr>
            </thead>

            <tbody>
              {redemptions.map(redemption => {
                const date = new Date(parseFloat(redemption.timestamp) * 1000);
                const shortDate = shortDateTimeFormat.format(date);
                const longDate = fullDateTimeFormat.format(date);
                const isOwnedByUser = redemption.accountIdString === accountIdString;

                return (
                  <tr
                    key={redemption.transactionId}
                    sx={
                      isOwnedByUser
                        ? {
                            backgroundColor: "primary",
                            color: "secondary",
                            fontWeight: 500
                          }
                        : undefined
                    }
                  >
                    {/* account */}
                    <td
                      sx={{
                        p: 2
                      }}
                    >
                      {redemption.accountIdString}
                      {isOwnedByUser && <> (you)</>}
                    </td>

                    {/* hchf */}
                    <td
                      sx={{
                        p: 2
                      }}
                    >
                      <Tooltip message={<Text>{redemption.amountOfHchf.toString()}</Text>}>
                        {redemption.amountOfHchf.shorten()}
                      </Tooltip>
                    </td>

                    {/* hbar */}
                    <td
                      sx={{
                        p: 2
                      }}
                    >
                      <Tooltip message={<Text>{redemption.amountOfHbar.toString()}</Text>}>
                        {redemption.amountOfHbar.shorten()}
                      </Tooltip>
                    </td>

                    {/* date */}
                    <td
                      sx={{
                        p: 2
                      }}
                    >
                      <Tooltip message={<Text>{longDate}</Text>}>{shortDate}</Tooltip>
                    </td>

                    {/* date */}
                    <td
                      sx={{
                        p: 2,
                        display: "grid",
                        justifyContent: "end"
                      }}
                    >
                      <Tooltip message={<Text>View transaction on HashScan</Text>}>
                        <Link
                          aria-label="View transaction on HashScan"
                          href={`${chain.hashscanBaseUrl}/transaction/${redemption.transactionId}`}
                          target="_blank"
                          sx={{
                            display: "flex",
                            columnGap: 3,
                            m: -2,
                            p: 2
                          }}
                        >
                          <Icon name="external-link-alt" />
                        </Link>
                      </Tooltip>
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
