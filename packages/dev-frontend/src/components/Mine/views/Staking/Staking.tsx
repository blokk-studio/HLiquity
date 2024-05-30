import React, { useCallback, useEffect, useState } from "react";
import { Heading, Box, Flex, Card, Button } from "theme-ui";
import { Decimal } from "@liquity/lib-base";
import { LP } from "../../../../strings";
import { Icon } from "../../../Icon";
import { EditableRow } from "../../../Trove/Editor";
import { LoadingOverlay } from "../../../LoadingOverlay";
import { useMineView } from "../../context/MineViewContext";
import { Transaction, useMyTransactionState } from "../../../Transaction";
import { Description } from "../Description";
import { Validation } from "../Validation";
import { useValidationState } from "../../context/useValidationState";
import { useLiquity } from "../../../../hooks/LiquityContext";
import { useLiquitySelector } from "@liquity/lib-react";
import { Step, Steps, getAssociationStepStatus } from "../../../Steps";
import { useLoadingState } from "../../../../loading_state";
import { LoadingButton } from "../../../LoadingButton";

const transactionId = "mine-stake";

export const Staking: React.FC = () => {
  const { liquity } = useLiquity();
  const { dispatchEvent } = useMineView();
  const [amount, setAmount] = useState<Decimal>(Decimal.from(0));
  const editingState = useState<string>();
  const isDirty = !amount.isZero;

  const { maximumStake, hasSetMaximumStake, hasApproved, isValid, isWithdrawing, amountChanged } =
    useValidationState(amount);

  const transactionState = useMyTransactionState(transactionId);
  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  const handleCancelPressed = useCallback(() => {
    dispatchEvent("CANCEL_PRESSED");
  }, [dispatchEvent]);

  console.debug(liquity);
  const transactionAction = isWithdrawing
    ? liquity.send.unstakeUniTokens.bind(liquity.send, amountChanged)
    : liquity.send.stakeUniTokens.bind(liquity.send, amountChanged);
  const shouldDisable = amountChanged.isZero || !isValid;
  useEffect(() => {
    if (transactionState.type === "confirmedOneShot") {
      dispatchEvent("STAKE_CONFIRMED");
    }
  }, [transactionState.type, dispatchEvent]);

  const { userHasAssociatedWithLpToken, userHasAssociatedWithHlqt } = useLiquitySelector(
    state => state
  );
  const { call: associateWithLpToken, state: lpTokenAssociationLoadingState } =
    useLoadingState(async () => {
      await liquity.associateWithLpToken();
    }, [userHasAssociatedWithLpToken]);
  const { call: associateWithHlqt, state: hlqtAssociationLoadingState } =
    useLoadingState(async () => {
      await liquity.associateWithHlqt();
    }, [userHasAssociatedWithHlqt]);
  const { call: approveLPSpender, state: LPApprovalLoadingState } = useLoadingState(async () => {
    if (!amount) {
      throw "cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0";
    }

    await liquity.approveSaucerSwapToSpendLpToken(amount);
  }, [hasApproved]);

  const steps: Step[] = [
    {
      title: "Associate with the LP token",
      status: getAssociationStepStatus({
        userHasAssociatedWithToken: userHasAssociatedWithLpToken,
        tokenAssociationLoadingState: lpTokenAssociationLoadingState
      }),
      description: userHasAssociatedWithLpToken
        ? "You've already associated with the LP token."
        : "You have to associate with LP tokens before you can use HLiquity."
    },
    {
      title: "Associate with HLQT",
      status: getAssociationStepStatus({
        userHasAssociatedWithToken: userHasAssociatedWithHlqt,
        tokenAssociationLoadingState: hlqtAssociationLoadingState
      }),
      description: userHasAssociatedWithHlqt
        ? "You've already associated with HLQT."
        : "You have to associate with HLQT tokens before you can use HLiquity."
    },
    {
      title: "Approve LP allowance",
      status: getAssociationStepStatus({
        userHasAssociatedWithToken: hasApproved,
        tokenAssociationLoadingState: LPApprovalLoadingState
      }),
      description: "You have to give the SaucerSwap contract an LP token allowance."
    },
    {
      title: "Stake LP",
      status: isTransactionPending ? "pending" : "idle"
    }
  ];

  return (
    <Card>
      <Heading
        sx={{
          display: "grid !important",
          gridAutoFlow: "column",
          gridTemplateColumns: "1fr repeat(2, auto)"
        }}
      >
        SaucerSwap LP Staking
        <Steps steps={steps} />
        {isDirty && (
          <Button
            variant="titleIcon"
            sx={{ ":enabled:hover": { color: "danger" } }}
            onClick={() => setAmount(Decimal.from(0))}
          >
            <Icon name="history" size="lg" />
          </Button>
        )}
      </Heading>

      <Box sx={{ p: [2, 3] }}>
        <EditableRow
          label="Stake"
          inputId="amount-lp"
          amount={amount.prettify()}
          unit={LP}
          editingState={editingState}
          editedAmount={amount.toString()}
          setEditedAmount={amount => setAmount(Decimal.from(amount))}
          maxAmount={maximumStake.toString()}
          maxedOut={hasSetMaximumStake}
        ></EditableRow>

        {isDirty && <Validation amount={amount} />}
        <Description amount={amount} />

        <Flex variant="layout.actions">
          <Button variant="cancel" onClick={handleCancelPressed}>
            Cancel
          </Button>
          {!userHasAssociatedWithLpToken ? (
            <LoadingButton
              loading={lpTokenAssociationLoadingState === "pending"}
              onClick={associateWithLpToken}
            >
              Associate with {LP}
            </LoadingButton>
          ) : !userHasAssociatedWithHlqt ? (
            <LoadingButton
              loading={hlqtAssociationLoadingState === "pending"}
              onClick={associateWithHlqt}
            >
              Associate with HLQT
            </LoadingButton>
          ) : !hasApproved ? (
            <LoadingButton
              disabled={!amount}
              loading={LPApprovalLoadingState === "pending"}
              onClick={approveLPSpender}
            >
              Approve allowance of {amount.prettify(2)} {LP}
            </LoadingButton>
          ) : (
            <Transaction
              id={transactionId}
              send={transactionAction}
              showFailure="asTooltip"
              tooltipPlacement="bottom"
            >
              <Button disabled={shouldDisable}>
                {isWithdrawing ? "Unstake" : "Stake"} {amountChanged.prettify(2)} {LP}
              </Button>
            </Transaction>
          )}
        </Flex>
      </Box>
      {isTransactionPending && <LoadingOverlay />}
    </Card>
  );
};
