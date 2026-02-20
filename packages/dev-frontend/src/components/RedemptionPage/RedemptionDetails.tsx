/** @jsxImportSource theme-ui */
import React from "react";
import { Box, Heading, Spinner, Text } from "theme-ui";
import { AccountId } from "@hashgraph/sdk";
import { AffectedTrove } from "../../utils/redemption-page/extractAffectedTroves.ts";
import { Tooltip } from "../Tooltip";

interface RedemptionDetailsProps {
  transactionId: string;
  troveCount: number;
  affectedTroves: AffectedTrove[] | null;
}

export const RedemptionDetails: React.FC<RedemptionDetailsProps> = ({
  transactionId,
  troveCount,
  affectedTroves
}) => {
  return (
    <tr>
      <td colSpan={8} sx={{ p: 0, backgroundColor: "muted" }}>
        <Box sx={{ p: 4, pl: 4 }}>
          <Heading as="h4" sx={{ fontSize: 2, mb: 3 }}>
            Affected Troves ({troveCount})
          </Heading>

          {!affectedTroves ? (
            <Box sx={{ display: "grid", placeContent: "center", my: 3 }}>
              <Spinner size={24} />
            </Box>
          ) : (
            <Box
              as="table"
              sx={{
                width: "100%",
                fontSize: 1,
                "& th": { textAlign: "start", pb: 2, fontWeight: "bold", opacity: 0.7, px: 2 },
                "& th:first-of-type": { pl: 0 },
                "& td": { py: 2, px: 2 },
                "& td:first-of-type": { pl: 0 }
              }}
            >
              <thead>
                <tr>
                  <th>
                    Trove Owner
                    <Box sx={{ fontSize: 0, fontWeight: "body", opacity: 0.5 }}>Account</Box>
                  </th>
                  <th>
                    <Tooltip message={<Text>HCHF debt before redemption</Text>}>
                      Debt Before
                      <Box sx={{ fontSize: 0, fontWeight: "body", opacity: 0.5 }}>HCHF</Box>
                    </Tooltip>
                  </th>
                  <th>
                    <Tooltip message={<Text>Amount of HCHF debt removed by redemption</Text>}>
                      Debt Redeemed
                      <Box sx={{ fontSize: 0, fontWeight: "body", opacity: 0.5 }}>HCHF</Box>
                    </Tooltip>
                  </th>
                  <th>
                    <Tooltip message={<Text>HCHF debt remaining after redemption</Text>}>
                      Debt After
                      <Box sx={{ fontSize: 0, fontWeight: "body", opacity: 0.5 }}>HCHF</Box>
                    </Tooltip>
                  </th>
                  <th>
                    <Tooltip message={<Text>HBAR collateral before redemption</Text>}>
                      Coll. Before
                      <Box sx={{ fontSize: 0, fontWeight: "body", opacity: 0.5 }}>HBAR</Box>
                    </Tooltip>
                  </th>
                  <th>
                    <Tooltip message={<Text>Amount of HBAR collateral taken by redemption</Text>}>
                      Coll. Taken
                      <Box sx={{ fontSize: 0, fontWeight: "body", opacity: 0.5 }}>HBAR</Box>
                    </Tooltip>
                  </th>
                  <th>
                    <Tooltip message={<Text>HBAR collateral remaining after redemption</Text>}>
                      Coll. After
                      <Box sx={{ fontSize: 0, fontWeight: "body", opacity: 0.5 }}>HBAR</Box>
                    </Tooltip>
                  </th>
                </tr>
              </thead>
              <tbody>
                {affectedTroves.map((trove, index) => {
                  const troveAccountId = AccountId.fromEvmAddress(0, 0, trove.borrower).toString();
                  const hasHistoricalData =
                    !trove.debtRedeemed.isZero || !trove.collateralRedeemed.isZero;

                  return (
                    <React.Fragment key={`${transactionId}-${index}`}>
                      <tr>
                        <td>
                          <Tooltip message={<Text>{troveAccountId}</Text>}>
                            {troveAccountId}
                          </Tooltip>
                        </td>
                        <td>
                          {hasHistoricalData ? (
                            <Tooltip message={<Text>{trove.debtBefore.toString()}</Text>}>
                              {trove.debtBefore.shorten()}
                            </Tooltip>
                          ) : (
                            <Tooltip message={<Text>Historical data not available</Text>}>
                              <Text sx={{ opacity: 0.5, fontStyle: "italic" }}>N/A</Text>
                            </Tooltip>
                          )}
                        </td>
                        <td
                          sx={{
                            fontWeight: hasHistoricalData ? "bold" : "body",
                            color: hasHistoricalData ? "danger" : "text"
                          }}
                        >
                          {hasHistoricalData ? (
                            <Tooltip message={<Text>{trove.debtRedeemed.toString()}</Text>}>
                              -{trove.debtRedeemed.shorten()}
                            </Tooltip>
                          ) : (
                            <Tooltip
                              message={
                                <Text>
                                  Historical data not available. Cannot calculate redeemed amount.
                                </Text>
                              }
                            >
                              <Text sx={{ opacity: 0.5, fontStyle: "italic" }}>N/A</Text>
                            </Tooltip>
                          )}
                        </td>
                        <td>
                          <Tooltip message={<Text>{trove.debtAfter.toString()}</Text>}>
                            {trove.debtAfter.shorten()}
                          </Tooltip>
                        </td>
                        <td>
                          {hasHistoricalData ? (
                            <Tooltip message={<Text>{trove.collateralBefore.toString()}</Text>}>
                              {trove.collateralBefore.shorten()}
                            </Tooltip>
                          ) : (
                            <Tooltip message={<Text>Historical data not available</Text>}>
                              <Text sx={{ opacity: 0.5, fontStyle: "italic" }}>N/A</Text>
                            </Tooltip>
                          )}
                        </td>
                        <td
                          sx={{
                            fontWeight: hasHistoricalData ? "bold" : "body",
                            color: hasHistoricalData ? "danger" : "text"
                          }}
                        >
                          {hasHistoricalData ? (
                            <Tooltip message={<Text>{trove.collateralRedeemed.toString()}</Text>}>
                              -{trove.collateralRedeemed.shorten()}
                            </Tooltip>
                          ) : (
                            <Tooltip
                              message={
                                <Text>
                                  Historical data not available. Cannot calculate taken amount.
                                </Text>
                              }
                            >
                              <Text sx={{ opacity: 0.5, fontStyle: "italic" }}>N/A</Text>
                            </Tooltip>
                          )}
                        </td>
                        <td>
                          <Tooltip message={<Text>{trove.collateralAfter.toString()}</Text>}>
                            {trove.collateralAfter.shorten()}
                          </Tooltip>
                        </td>
                      </tr>
                      {!hasHistoricalData && (
                        <tr>
                          <td
                            colSpan={7}
                            sx={{ py: 1, px: 2, fontSize: 0, fontStyle: "italic", opacity: 0.6 }}
                          >
                            ⚠ Historical data not available for this trove. Only showing final
                            state after redemption.
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </Box>
          )}
        </Box>
      </td>
    </tr>
  );
};
