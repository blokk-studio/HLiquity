import React from "react";
import { Button, Flex } from "theme-ui";

import {
  Decimal,
  Decimalish,
  LiquityStoreState,
  HLQTStake,
  HLQTStakeChange
} from "@liquity/lib-base";

import { LiquityStoreUpdate, useLiquityReducer, useLiquitySelector } from "@liquity/lib-react";

import { GT, COIN, COLLATERAL_COIN } from "../../strings";

import { useStakingView } from "./context/StakingViewContext";
import { StakingEditor } from "./StakingEditor";
import { StakingManagerAction } from "./StakingManagerAction";
import { ActionDescription, Amount } from "../ActionDescription";
import { ErrorDescription } from "../ErrorDescription";
import { useLiquity } from "../../hooks/LiquityContext";
import { useLoadingState } from "../../loading_state";
import { Step, getCompletableStepStatus } from "../Steps";
import { LoadingThemeUiButton } from "../LoadingButton";
import { useMultiWallet } from "../../multi_wallet";
import { WalletNotConnectedInfo } from "../WalletNotConnectedInfo";
import buttons from "../../styles/buttons.module.css";

const init = ({ hlqtStake }: LiquityStoreState) => ({
  originalStake: hlqtStake,
  editedLQTY: hlqtStake.stakedHLQT
});

type StakeManagerState = ReturnType<typeof init>;
type StakeManagerAction =
  | LiquityStoreUpdate
  | { type: "revert" }
  | { type: "setStake"; newValue: Decimalish };

const reduce = (state: StakeManagerState, action: StakeManagerAction): StakeManagerState => {
  // console.log(state);
  // console.log(action);

  const { originalStake, editedLQTY } = state;

  switch (action.type) {
    case "setStake":
      return { ...state, editedLQTY: Decimal.from(action.newValue) };

    case "revert":
      return { ...state, editedLQTY: originalStake.stakedHLQT };

    case "updateStore": {
      const {
        stateChange: { hlqtStake: updatedStake }
      } = action;

      if (updatedStake) {
        return {
          originalStake: updatedStake,
          editedLQTY: updatedStake.apply(originalStake.whatChanged(editedLQTY))
        };
      }
    }
  }

  return state;
};

const selectLQTYBalance = ({ hlqtBalance }: LiquityStoreState) => hlqtBalance;

type StakingManagerActionDescriptionProps = {
  originalStake: HLQTStake;
  change: HLQTStakeChange<Decimal>;
};

const StakingManagerActionDescription: React.FC<StakingManagerActionDescriptionProps> = ({
  originalStake,
  change
}) => {
  const stakeHLQT = change.stakeHLQT?.prettify().concat(" ", GT);
  const unstakeHLQT = change.unstakeHLQT?.prettify().concat(" ", GT);
  const collateralGain = originalStake.collateralGain.nonZero
    ?.prettify(4)
    .concat(` ${COLLATERAL_COIN}`);
  const hchfGain = originalStake.hchfGain.nonZero?.prettify().concat(" ", COIN);

  if (originalStake.isEmpty && stakeHLQT) {
    return (
      <ActionDescription>
        You are staking <Amount>{stakeHLQT}</Amount>.
      </ActionDescription>
    );
  }

  return (
    <ActionDescription>
      {stakeHLQT && (
        <>
          You are adding <Amount>{stakeHLQT}</Amount> to your stake
        </>
      )}
      {unstakeHLQT && (
        <>
          You are withdrawing <Amount>{unstakeHLQT}</Amount> to your wallet
        </>
      )}
      {(collateralGain || hchfGain) && (
        <>
          {" "}
          and claiming{" "}
          {collateralGain && hchfGain ? (
            <>
              <Amount>{collateralGain}</Amount> and <Amount>{hchfGain}</Amount>
            </>
          ) : (
            <>
              <Amount>{collateralGain ?? hchfGain}</Amount>
            </>
          )}
        </>
      )}
      .
    </ActionDescription>
  );
};

export const StakingManager: React.FC = () => {
  const { dispatch: dispatchStakingViewAction, changePending } = useStakingView();
  const [{ originalStake, editedLQTY }, dispatch] = useLiquityReducer(reduce, init);
  const hlqtBalance = useLiquitySelector(selectLQTYBalance);
  const multiWallet = useMultiWallet();

  const change = originalStake.whatChanged(editedLQTY);
  const [validChange, description] = !change
    ? [undefined, undefined]
    : multiWallet.hasConnection && change.stakeHLQT?.gt(hlqtBalance)
      ? [
          undefined,
          <ErrorDescription>
            The amount you're trying to stake exceeds your balance by{" "}
            <Amount>
              {change.stakeHLQT.sub(hlqtBalance).prettify()} {GT}
            </Amount>
            .
          </ErrorDescription>
        ]
      : [
          change,
          <>
            <StakingManagerActionDescription originalStake={originalStake} change={change} />
            {!multiWallet.hasConnection && <WalletNotConnectedInfo />}
          </>
        ];

  const makingNewStake = originalStake.isEmpty;

  // consent & approval
  const { liquity } = useLiquity();
  const { userHasAssociatedWithHchf, hlqtTokenAllowanceOfHlqtContract } = useLiquitySelector(
    state => state
  );
  const { call: associateWithHchf, state: hchfAssociationLoadingState } = useLoadingState(
    async () => {
      await liquity.associateWithHchf();
    }
  );
  // hchf spender approval
  const needsSpenderApproval = !validChange || validChange.stakeHLQT;
  const hlqtContractHasHlqtAllowance = validChange?.stakeHLQT
    ? validChange.stakeHLQT.lte(hlqtTokenAllowanceOfHlqtContract)
    : false;
  const { call: approveHlqtSpender, state: hlqtApprovalLoadingState } = useLoadingState(async () => {
    if (!validChange?.stakeHLQT) {
      throw "cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0";
    }

    await liquity.approveHlqtToSpendHlqt(validChange.stakeHLQT);
  });

  const transactionSteps: Step[] = [
    {
      title: "Associate with HCHF",
      status: getCompletableStepStatus({
        isCompleted: userHasAssociatedWithHchf,
        completionLoadingState: hchfAssociationLoadingState
      }),
      description: userHasAssociatedWithHchf
        ? "You've already associated with HCHF."
        : "You have to associate with HCHF tokens before you can use HLiquity."
    }
  ];
  if (needsSpenderApproval) {
    transactionSteps.push({
      title: "Approve HLQT allowance",
      status: getCompletableStepStatus({
        isCompleted: hlqtContractHasHlqtAllowance,
        completionLoadingState: hlqtApprovalLoadingState
      }),
      description: hlqtContractHasHlqtAllowance
        ? "You've already given the HLQT contract allowance to spend the requested amount of HLQT tokens."
        : "You have to give the HLQT contract an HLQT token allowance."
    });
  }
  transactionSteps.push({
    title: !validChange || validChange?.stakeHLQT ? "Stake HLQT" : "Unstake HLQT",
    status: changePending ? "pending" : "idle"
  });

  return (
    <StakingEditor
      title="Lock HLQT to earn rewards"
      {...{ originalStake, editedLQTY, dispatch }}
      transactionSteps={transactionSteps}
    >
      {description ??
        (makingNewStake ? (
          <ActionDescription>Enter the amount of {GT} you'd like to stake.</ActionDescription>
        ) : (
          <ActionDescription>Adjust the {GT} amount to stake or withdraw.</ActionDescription>
        ))}

      {multiWallet.hasConnection && (
        <Flex variant="layout.actions">
          <button
            className={buttons.normal}
            onClick={() => dispatchStakingViewAction({ type: "cancelAdjusting" })}
          >
            Cancel
          </button>

          {!userHasAssociatedWithHchf ? (
            <LoadingThemeUiButton
              disabled={!validChange}
              loading={hchfAssociationLoadingState === "pending"}
              onClick={associateWithHchf}
            >
              Associate with HCHF
            </LoadingThemeUiButton>
          ) : needsSpenderApproval && !hlqtContractHasHlqtAllowance ? (
            <LoadingThemeUiButton
              disabled={!validChange}
              loading={hlqtApprovalLoadingState === "pending"}
              onClick={approveHlqtSpender}
            >
              Approve allowance of {validChange?.stakeHLQT?.toString(2)} HLQT
            </LoadingThemeUiButton>
          ) : validChange ? (
            <StakingManagerAction change={validChange} loading={changePending}>
              {validChange?.stakeHLQT
                ? `Stake ${validChange?.stakeHLQT?.toString(2)} HLQT`
                : `Unstake ${validChange?.unstakeHLQT?.toString(2)} HLQT`}
            </StakingManagerAction>
          ) : (
            <Button disabled>Confirm</Button>
          )}
        </Flex>
      )}
    </StakingEditor>
  );
};
