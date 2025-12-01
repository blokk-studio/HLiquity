import React, { useCallback, useEffect, useState } from "react";
import { Heading, Box, Flex, Card, Button, Text, Link } from "theme-ui";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { LP, GT } from "../../../../strings";
import { Icon } from "../../../Icon";
import { EditableRow, StaticRow } from "../../../Trove/Editor";
import { useMineView } from "../../context/MineViewContext";
import { Transaction, useMyTransactionState } from "../../../Transaction";
import { Description } from "../Description";
import { Validation } from "../Validation";
import { Step, Steps, getCompletableStepStatus } from "../../../Steps";
import { useLoadingState } from "../../../../loading_state";
import { useLiquity } from "../../../../hooks/LiquityContext";
import { useValidationState } from "../../context/useValidationState";
import { LoadingThemeUiButton } from "../../../LoadingButton";
import { ActionDescription } from "../../../ActionDescription";

const selector = ({
  liquidityMiningStake,
  liquidityMiningHLQTReward,
  uniTokenBalance,
  totalStakedUniTokens
}: LiquityStoreState) => ({
  liquidityMiningStake,
  liquidityMiningHLQTReward,
  uniTokenBalance,
  totalStakedUniTokens
});

const transactionId = "mine-stake";

export const Adjusting: React.FC = () => {
  const { liquity } = useLiquity();
  const { dispatchEvent } = useMineView();
  const { liquidityMiningStake, liquidityMiningHLQTReward, uniTokenBalance, totalStakedUniTokens } =
    useLiquitySelector(selector);
  const [amount, setAmount] = useState<Decimal>(liquidityMiningStake);
  const editingState = useState<string>();

  const transactionState = useMyTransactionState(transactionId);
  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  const isDirty = !amount.eq(liquidityMiningStake);
  const maximumAmount = liquidityMiningStake.add(uniTokenBalance);
  const hasSetMaximumAmount = amount.eq(maximumAmount);
  const poolShare = liquidityMiningStake.mulDiv(100, totalStakedUniTokens);

  const handleCancelPressed = useCallback(() => {
    dispatchEvent("CANCEL_PRESSED");
  }, [dispatchEvent]);

  const { hasApproved, isValid, isWithdrawing, amountChanged } = useValidationState(amount);
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
      status: getCompletableStepStatus({
        isCompleted: userHasAssociatedWithLpToken,
        completionLoadingState: lpTokenAssociationLoadingState
      }),
      description: userHasAssociatedWithLpToken
        ? "You've already associated with the LP token."
        : "You have to associate with LP tokens before you can use HLiquity."
    },
    {
      title: "Associate with HLQT",
      status: getCompletableStepStatus({
        isCompleted: userHasAssociatedWithHlqt,
        completionLoadingState: hlqtAssociationLoadingState
      }),
      description: userHasAssociatedWithHlqt
        ? "You've already associated with HLQT."
        : "You have to associate with HLQT tokens before you can use HLiquity."
    },
    {
      title: "Approve LP allowance",
      status: getCompletableStepStatus({
        isCompleted: hasApproved,
        completionLoadingState: LPApprovalLoadingState
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
      <Heading>
        SaucerSwap HBAR/HCHF-LP Staking
        <Steps steps={steps} />
        {isDirty && (
          <Button
            variant="titleIcon"
            sx={{ ":enabled:hover": { color: "danger" } }}
            onClick={() => setAmount(liquidityMiningStake)}
          >
            <Icon name="history" size="lg" />
          </Button>
        )}
      </Heading>

      <Box sx={{ p: [2, 3] }}>
        <EditableRow
          label="Stake"
          inputId="mine-stake-amount"
          amount={isDirty ? amount.prettify(4) : liquidityMiningStake.prettify(4)}
          unit={LP}
          editingState={editingState}
          editedAmount={amount.toString(4)}
          setEditedAmount={amount => setAmount(Decimal.from(amount))}
          maxAmount={maximumAmount.toString()}
          maxedOut={hasSetMaximumAmount}
        ></EditableRow>
        <StaticRow
          label="Pool share"
          inputId="deposit-share"
          amount={poolShare.prettify(4)}
          unit="%"
        />
        <StaticRow
          label="Reward"
          inputId="mine-reward-amount"
          amount={liquidityMiningHLQTReward.prettify()}
          color={liquidityMiningHLQTReward.nonZero && "success"}
          unit={GT}
        />
        <ActionDescription>
          <Text>
            Deposit your tokens into the{" "}
            <Link
              sx={{ textDecoration: "underline" }}
              target="_blank"
              href="https://www.saucerswap.finance/liquidity/0.0.6070468"
            >
              HBAR/HCHF liquidity pool
            </Link>
          </Text>
        </ActionDescription>

        {isDirty && <Validation amount={amount} />}
        <Description amount={amount} />

        <Flex variant="layout.actions">
          <Button variant="cancel" onClick={handleCancelPressed}>
            Cancel
          </Button>
          {!userHasAssociatedWithLpToken ? (
            <LoadingThemeUiButton
              loading={lpTokenAssociationLoadingState === "pending"}
              onClick={associateWithLpToken}
            >
              Associate with {LP}
            </LoadingThemeUiButton>
          ) : !userHasAssociatedWithHlqt ? (
            <LoadingThemeUiButton
              loading={hlqtAssociationLoadingState === "pending"}
              onClick={associateWithHlqt}
            >
              Associate with HLQT
            </LoadingThemeUiButton>
          ) : !hasApproved ? (
            <LoadingThemeUiButton
              disabled={!amount}
              loading={LPApprovalLoadingState === "pending"}
              onClick={approveLPSpender}
            >
              Approve allowance of {amount.prettify(2)} {LP}
            </LoadingThemeUiButton>
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
    </Card>
  );
};
