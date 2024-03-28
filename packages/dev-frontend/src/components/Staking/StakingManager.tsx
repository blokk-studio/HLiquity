import React from "react";
import { Button, Flex, Spinner } from "theme-ui";

import {
  Decimal,
  Decimalish,
  LiquityStoreState,
  HLQTYStake,
  HLQTYStakeChange
} from "@liquity/lib-base";

import { LiquityStoreUpdate, useLiquityReducer, useLiquitySelector } from "@liquity/lib-react";

import { GT, COIN, COLLATERAL_COIN } from "../../strings";

import { useStakingView } from "./context/StakingViewContext";
import { StakingEditor } from "./StakingEditor";
import { StakingManagerAction } from "./StakingManagerAction";
import { ActionDescription, Amount } from "../ActionDescription";
import { ErrorDescription } from "../ErrorDescription";
import { useLiquity } from "../../hooks/LiquityContext";
import { useHedera } from "../../hedera/hedera_context";
import { useLoadingState } from "../../loading_state";
import { BigNumber } from "ethers";
import { Step } from "../Steps";
import { LoadingButton } from "../LoadingButton";

const init = ({ hlqtyStake }: LiquityStoreState) => ({
  originalStake: hlqtyStake,
  editedLQTY: hlqtyStake.stakedHLQTY
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
      return { ...state, editedLQTY: originalStake.stakedHLQTY };

    case "updateStore": {
      const {
        stateChange: { hlqtyStake: updatedStake }
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

const selectLQTYBalance = ({ hlqtyBalance }: LiquityStoreState) => hlqtyBalance;

type StakingManagerActionDescriptionProps = {
  originalStake: HLQTYStake;
  change: HLQTYStakeChange<Decimal>;
};

const StakingManagerActionDescription: React.FC<StakingManagerActionDescriptionProps> = ({
  originalStake,
  change
}) => {
  const stakeHLQTY = change.stakeHLQTY?.prettify().concat(" ", GT);
  const unstakeHLQTY = change.unstakeHLQTY?.prettify().concat(" ", GT);
  const collateralGain = originalStake.collateralGain.nonZero
    ?.prettify(4)
    .concat(` ${COLLATERAL_COIN}`);
  const hchfGain = originalStake.hchfGain.nonZero?.prettify().concat(" ", COIN);

  if (originalStake.isEmpty && stakeHLQTY) {
    return (
      <ActionDescription>
        You are staking <Amount>{stakeHLQTY}</Amount>.
      </ActionDescription>
    );
  }

  return (
    <ActionDescription>
      {stakeHLQTY && (
        <>
          You are adding <Amount>{stakeHLQTY}</Amount> to your stake
        </>
      )}
      {unstakeHLQTY && (
        <>
          You are withdrawing <Amount>{unstakeHLQTY}</Amount> to your wallet
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
  const hlqtyBalance = useLiquitySelector(selectLQTYBalance);

  const change = originalStake.whatChanged(editedLQTY);
  const [validChange, description] = !change
    ? [undefined, undefined]
    : change.stakeHLQTY?.gt(hlqtyBalance)
    ? [
        undefined,
        <ErrorDescription>
          The amount you're trying to stake exceeds your balance by{" "}
          <Amount>
            {change.stakeHLQTY.sub(hlqtyBalance).prettify()} {GT}
          </Amount>
          .
        </ErrorDescription>
      ]
    : [change, <StakingManagerActionDescription originalStake={originalStake} change={change} />];

  const makingNewStake = originalStake.isEmpty;

  // consent & approval
  const {
    config,
    liquity: {
      connection: { addresses }
    }
  } = useLiquity();
  const { hasAssociatedWithHchf, associateWithToken, approveSpender } = useHedera();
  // hlqt token association
  const { call: associateWithHchf, state: hchfAssociationLoadingState } = useLoadingState(() =>
    associateWithToken({ tokenAddress: config.hchfTokenId })
  );
  // hchf spender approval
  const needsSpenderApproval = !validChange || validChange?.stakeHLQTY;
  const { call: approveHlqtSpender, state: hlqtApprovalLoadingState } = useLoadingState(async () => {
    if (!validChange?.stakeHLQTY) {
      throw "cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0";
    }

    const contractAddress = addresses.hlqtyToken as `0x${string}`;
    const tokenAddress = config.hlqtTokenId;
    const amount = BigNumber.from(validChange.stakeHLQTY.bigNumber);

    await approveSpender({
      contractAddress,
      tokenAddress,
      amount
    });
  });

  const transactionSteps: Step[] = [
    {
      title: "Associate with HCHF",
      status: hasAssociatedWithHchf
        ? "success"
        : hchfAssociationLoadingState === "error"
        ? "danger"
        : hchfAssociationLoadingState,
      description: hasAssociatedWithHchf
        ? "You've already consented to receiving HCHF."
        : "You have to consent to receiving HCHF tokens before you can use HLiquity."
    }
  ];
  if (needsSpenderApproval) {
    transactionSteps.push({
      title: "Approve HLQT spender",
      status: hlqtApprovalLoadingState === "error" ? "danger" : hlqtApprovalLoadingState,
      description: "You have to consent to the HLQT contract spending your HLQT tokens."
    });
  }
  transactionSteps.push({
    title: !validChange || validChange?.stakeHLQTY ? "Stake HLQT" : "Unstake HLQT",
    status: changePending ? "pending" : "idle"
  });

  return (
    <StakingEditor
      title={"Staking"}
      {...{ originalStake, editedLQTY, dispatch }}
      transactionSteps={transactionSteps}
    >
      {description ??
        (makingNewStake ? (
          <ActionDescription>Enter the amount of {GT} you'd like to stake.</ActionDescription>
        ) : (
          <ActionDescription>Adjust the {GT} amount to stake or withdraw.</ActionDescription>
        ))}

      <Flex variant="layout.actions">
        <Button
          variant="cancel"
          onClick={() => dispatchStakingViewAction({ type: "cancelAdjusting" })}
        >
          Cancel
        </Button>

        {!hasAssociatedWithHchf ? (
          <LoadingButton
            disabled={!validChange}
            loading={hchfAssociationLoadingState === "pending"}
            onClick={associateWithHchf}
          >
            Consent to receiving HCHF
          </LoadingButton>
        ) : needsSpenderApproval && hlqtApprovalLoadingState !== "success" ? (
          <LoadingButton
            disabled={!validChange}
            loading={hlqtApprovalLoadingState === "pending"}
            onClick={approveHlqtSpender}
          >
            Consent to spending {validChange?.stakeHLQTY?.toString(2)} HLQT
          </LoadingButton>
        ) : validChange ? (
          <StakingManagerAction change={validChange} loading={changePending}>
            {validChange?.stakeHLQTY
              ? `Stake ${validChange?.stakeHLQTY?.toString(2)} HLQT`
              : `Unstake ${validChange?.unstakeHLQTY?.toString(2)} HLQT`}
          </StakingManagerAction>
        ) : (
          <Button disabled>Confirm</Button>
        )}
      </Flex>
    </StakingEditor>
  );
};
