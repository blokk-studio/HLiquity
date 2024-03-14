import React from "react";
import { Button, Flex } from "theme-ui";

import {
  Decimal,
  Decimalish,
  LiquityStoreState,
  HLQTYStake,
  HLQTYStakeChange
} from "@liquity/lib-base";

import { LiquityStoreUpdate, useLiquityReducer, useLiquitySelector } from "@liquity/lib-react";

import { GT, COIN } from "../../strings";

import { useStakingView } from "./context/StakingViewContext";
import { StakingEditor } from "./StakingEditor";
import { StakingManagerAction } from "./StakingManagerAction";
import { ActionDescription, Amount } from "../ActionDescription";
import { ErrorDescription } from "../ErrorDescription";

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
  const collateralGain = originalStake.collateralGain.nonZero?.prettify(4).concat(" ETH");
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
  const { dispatch: dispatchStakingViewAction } = useStakingView();
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

  return (
    <StakingEditor title={"Staking"} {...{ originalStake, editedLQTY, dispatch }}>
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

        {validChange ? (
          <StakingManagerAction change={validChange}>Confirm</StakingManagerAction>
        ) : (
          <Button disabled>Confirm</Button>
        )}
      </Flex>
    </StakingEditor>
  );
};
