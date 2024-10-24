import React, { useState } from "react";
import { Flex, Button, Box, Card, Heading } from "theme-ui";
import { Decimal } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { Amount } from "../ActionDescription";
import { useMyTransactionState, useTxFunction } from "../Transaction";
import { COIN } from "../../strings";
import { Icon } from "../Icon";

import { Step, Steps, getCompletableStepStatus } from "../Steps";
import { useLiquity } from "../../hooks/LiquityContext";
import { useLoadingState } from "../../loading_state";
import { LoadingButton } from "../LoadingButton";
import { EditableRow } from "../Trove/Editor";
import { ErrorDescription } from "../ErrorDescription";
import { useConstants } from "../../hooks/constants";

const TRANSACTION_ID = "trove-adjustment";

export const RedeemHchf: React.FC = () => {
  const constants = useConstants();
  const { hchfBalance } = useLiquitySelector(state => state);

  const [amountOfHchfToRedeem, setAmountOfHchfToRedeem] = useState(Decimal.ZERO);
  const transactionState = useMyTransactionState(TRANSACTION_ID);
  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";
  const [sendTransaction] = useTxFunction(TRANSACTION_ID, async () => {
    const sentTransaction = await liquity.send.redeemHCHF(amountOfHchfToRedeem);
    setAmountOfHchfToRedeem(Decimal.ZERO);

    return sentTransaction;
  });

  const reset = () => {
    setAmountOfHchfToRedeem(Decimal.ZERO);
  };

  const isDirty = amountOfHchfToRedeem.gt(Decimal.ZERO);
  const isRedemptionAmountWithinBalance = amountOfHchfToRedeem.lte(hchfBalance);
  const isRedeemingMinimum = amountOfHchfToRedeem.gte(constants.HCHF_MINIMUM_DEBT);
  const isValidRedemption =
    amountOfHchfToRedeem.gt(Decimal.ZERO) && isRedemptionAmountWithinBalance && isRedeemingMinimum;

  // consent & approval
  // hchf token association
  const { liquity } = useLiquity();
  const { hchfTokenAllowanceOfHchfContract } = useLiquitySelector(state => state);
  // hchf spender approval
  const needsSpenderApproval = true;
  const hchfContractHasHchfTokenAllowance =
    amountOfHchfToRedeem.gt(Decimal.ZERO) &&
    amountOfHchfToRedeem.lte(hchfTokenAllowanceOfHchfContract);
  const { call: approveHchfSpender, state: hchfApprovalLoadingState } = useLoadingState(async () => {
    if (amountOfHchfToRedeem.isZero) {
      throw "cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0";
    }

    await liquity.approveHchfToSpendHchf(amountOfHchfToRedeem);
  });

  const transactionSteps: Step[] = [
    {
      title: "Approve HCHF allowance",
      status: getCompletableStepStatus({
        isCompleted: hchfContractHasHchfTokenAllowance,
        completionLoadingState: hchfApprovalLoadingState
      }),
      description: hchfContractHasHchfTokenAllowance
        ? "You've already given the HCHF contract allowance to spend the requested amount of HCHF tokens."
        : "You have to give HCHF contract an HCHF token allowance."
    },
    {
      title: "Redeem HCHF",
      status: isTransactionPending ? "pending" : "idle"
    }
  ];

  const editingState = useState<string>();

  return (
    <Card>
      <Heading
        sx={{
          display: "grid !important",
          gridAutoFlow: "column",
          gridTemplateColumns: "1fr repeat(2, auto)"
        }}
      >
        Redeem HCHF
        <Steps steps={transactionSteps} />
        {isDirty && !isTransactionPending && (
          <Button
            variant="titleIcon"
            sx={{ ":enabled:hover": { color: "danger" }, marginLeft: "1rem" }}
            onClick={reset}
          >
            <Icon name="history" size="lg" />
          </Button>
        )}
      </Heading>

      <Box sx={{ p: [2, 3] }}>
        <EditableRow
          label="HCHF to redeem for HBAR"
          inputId="hchf-redemption-amount"
          amount={amountOfHchfToRedeem.prettify()}
          maxAmount={hchfBalance.toString()}
          maxedOut={amountOfHchfToRedeem.eq(hchfBalance)}
          editingState={editingState}
          unit={COIN}
          editedAmount={amountOfHchfToRedeem.prettify(2)}
          setEditedAmount={amount => {
            setAmountOfHchfToRedeem(Decimal.from(amount));
          }}
        />

        {!isRedeemingMinimum && (
          <ErrorDescription>
            You need to redeem at least{" "}
            <Amount>
              {constants.HCHF_MINIMUM_DEBT.prettify(0)} {COIN}
            </Amount>
            .
          </ErrorDescription>
        )}

        {!isRedemptionAmountWithinBalance && (
          <ErrorDescription>
            The amount you're trying to deposit exceeds your balance by{" "}
            <Amount>
              {amountOfHchfToRedeem.sub(hchfBalance).prettify()} {COIN}
            </Amount>
            .
          </ErrorDescription>
        )}

        <Flex variant="layout.actions">
          {needsSpenderApproval && !hchfContractHasHchfTokenAllowance ? (
            <LoadingButton
              disabled={!isValidRedemption}
              loading={hchfApprovalLoadingState === "pending"}
              onClick={approveHchfSpender}
            >
              Approve allowance of {amountOfHchfToRedeem.prettify(2)} {COIN}
            </LoadingButton>
          ) : (
            <LoadingButton
              disabled={!isValidRedemption}
              loading={isTransactionPending}
              onClick={sendTransaction}
            >
              Redeem {amountOfHchfToRedeem.prettify(2)} {COIN}
            </LoadingButton>
          )}
        </Flex>
      </Box>
    </Card>
  );
};
