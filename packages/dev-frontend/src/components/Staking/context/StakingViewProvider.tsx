import { useEffect } from "react";

import { LiquityStoreState, HLQTYStake } from "@liquity/lib-base";
import { LiquityStoreUpdate, useLiquityReducer } from "@liquity/lib-react";

import { useMyTransactionState } from "../../Transaction";

import { StakingViewAction, StakingViewContext } from "./StakingViewContext";

type StakingViewProviderAction =
  | LiquityStoreUpdate
  | StakingViewAction
  | { type: "startChange" | "abortChange" };

type StakingViewProviderState = {
  hlqtyStake: HLQTYStake;
  changePending: boolean;
  adjusting: boolean;
};

const init = ({ hlqtyStake }: LiquityStoreState): StakingViewProviderState => ({
  hlqtyStake,
  changePending: false,
  adjusting: false
});

const reduce = (
  state: StakingViewProviderState,
  action: StakingViewProviderAction
): StakingViewProviderState => {
  // console.log(state);
  // console.log(action);

  switch (action.type) {
    case "startAdjusting":
      return { ...state, adjusting: true };

    case "cancelAdjusting":
      return { ...state, adjusting: false };

    case "startChange":
      return { ...state, changePending: true };

    case "abortChange":
      return { ...state, changePending: false };

    case "updateStore": {
      const {
        oldState: { hlqtyStake: oldStake },
        stateChange: { hlqtyStake: updatedStake }
      } = action;

      if (updatedStake) {
        const changeCommitted =
          !updatedStake.stakedHLQTY.eq(oldStake.stakedHLQTY) ||
          updatedStake.collateralGain.lt(oldStake.collateralGain) ||
          updatedStake.hchfGain.lt(oldStake.hchfGain);

        return {
          ...state,
          hlqtyStake: updatedStake,
          adjusting: false,
          changePending: changeCommitted ? false : state.changePending
        };
      }
    }
  }

  return state;
};

export const StakingViewProvider: React.FC = ({ children }) => {
  const stakingTransactionState = useMyTransactionState("stake");
  const [{ adjusting, changePending, hlqtyStake }, dispatch] = useLiquityReducer(reduce, init);

  useEffect(() => {
    if (
      stakingTransactionState.type === "waitingForApproval" ||
      stakingTransactionState.type === "waitingForConfirmation"
    ) {
      dispatch({ type: "startChange" });
    } else if (
      stakingTransactionState.type === "failed" ||
      stakingTransactionState.type === "cancelled"
    ) {
      dispatch({ type: "abortChange" });
    }
  }, [stakingTransactionState.type, dispatch]);

  return (
    <StakingViewContext.Provider
      value={{
        view: adjusting ? "ADJUSTING" : (!hlqtyStake || hlqtyStake.isEmpty) ? "NONE" : "ACTIVE",
        changePending,
        dispatch
      }}
    >
      {children}
    </StakingViewContext.Provider>
  );
};
