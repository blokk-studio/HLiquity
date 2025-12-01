import React, { useCallback, useEffect } from "react";
import { Button, Flex } from "theme-ui";

import { Decimal, Decimalish, LiquityStoreState } from "@liquity/lib-base";
import { LiquityStoreUpdate, useLiquityReducer, useLiquitySelector } from "@liquity/lib-react";

import { COIN } from "../../strings";

import { ActionDescription } from "../ActionDescription";
import { useMyTransactionState } from "../Transaction";

import { StabilityDepositEditor } from "./StabilityDepositEditor";
import { StabilityDepositAction } from "./StabilityDepositAction";
import { useStabilityView } from "./context/StabilityViewContext";
import {
  selectForStabilityDepositChangeValidation,
  validateStabilityDepositChange
} from "./validation/validateStabilityDepositChange";
import { Step, getCompletableStepStatus } from "../Steps";
import { useLoadingState } from "../../loading_state";
import { useLiquity } from "../../hooks/LiquityContext";
import { LoadingThemeUiButton } from "../LoadingButton";
import { useMultiWallet } from "../../multi_wallet";

const init = ({ stabilityDeposit }: LiquityStoreState) => ({
  originalDeposit: stabilityDeposit,
  editedHCHF: stabilityDeposit.currentHCHF,
  changePending: false
});

type StabilityDepositManagerState = ReturnType<typeof init>;
type StabilityDepositManagerAction =
  | LiquityStoreUpdate
  | { type: "startChange" | "finishChange" | "revert" }
  | { type: "setDeposit"; newValue: Decimalish };

const reduceWith =
  (action: StabilityDepositManagerAction) =>
  (state: StabilityDepositManagerState): StabilityDepositManagerState =>
    reduce(state, action);

const finishChange = reduceWith({ type: "finishChange" });
const revert = reduceWith({ type: "revert" });

const reduce = (
  state: StabilityDepositManagerState,
  action: StabilityDepositManagerAction
): StabilityDepositManagerState => {
  // console.log(state);
  // console.log(action);

  const { originalDeposit, editedHCHF, changePending } = state;

  switch (action.type) {
    case "startChange": {
      console.log("changeStarted");
      return { ...state, changePending: true };
    }

    case "finishChange":
      return { ...state, changePending: false };

    case "setDeposit":
      return { ...state, editedHCHF: Decimal.from(action.newValue) };

    case "revert":
      return { ...state, editedHCHF: originalDeposit.currentHCHF };

    case "updateStore": {
      const {
        stateChange: { stabilityDeposit: updatedDeposit }
      } = action;

      if (!updatedDeposit) {
        return state;
      }

      const newState = { ...state, originalDeposit: updatedDeposit };

      const changeCommitted =
        !updatedDeposit.initialHCHF.eq(originalDeposit.initialHCHF) ||
        updatedDeposit.currentHCHF.gt(originalDeposit.currentHCHF) ||
        updatedDeposit.collateralGain.lt(originalDeposit.collateralGain) ||
        updatedDeposit.hlqtReward.lt(originalDeposit.hlqtReward);

      if (changePending && changeCommitted) {
        return finishChange(revert(newState));
      }

      return {
        ...newState,
        editedHCHF: updatedDeposit.apply(originalDeposit.whatChanged(editedHCHF))
      };
    }
  }
};

const transactionId = "stability-deposit";

export const StabilityDepositManager: React.FC = () => {
  const [{ originalDeposit, editedHCHF: editedHCHF, changePending }, dispatch] = useLiquityReducer(
    reduce,
    init
  );
  const validationContext = useLiquitySelector(selectForStabilityDepositChangeValidation);
  const { dispatchEvent } = useStabilityView();
  const multiWallet = useMultiWallet();

  const handleCancel = useCallback(() => {
    dispatchEvent("CANCEL_PRESSED");
  }, [dispatchEvent]);

  const [validChange, description] = validateStabilityDepositChange(originalDeposit, editedHCHF, {
    ...validationContext,
    hasConnection: multiWallet.hasConnection
  });

  const makingNewDeposit = originalDeposit.isEmpty;

  const myTransactionState = useMyTransactionState(transactionId);
  const isTransactionPending =
    myTransactionState.type === "waitingForApproval" ||
    myTransactionState.type === "waitingForConfirmation";

  useEffect(() => {
    if (
      myTransactionState.type === "waitingForApproval" ||
      myTransactionState.type === "waitingForConfirmation"
    ) {
      dispatch({ type: "startChange" });
    } else if (myTransactionState.type === "failed" || myTransactionState.type === "cancelled") {
      dispatch({ type: "finishChange" });
    } else if (myTransactionState.type === "confirmedOneShot") {
      dispatchEvent("DEPOSIT_CONFIRMED");
    }
  }, [myTransactionState.type, dispatch, dispatchEvent]);

  // consent & approval
  const { liquity } = useLiquity();
  const { userHasAssociatedWithHchf, hchfTokenAllowanceOfHchfContract, userHasAssociatedWithHlqt } =
    useLiquitySelector(state => state);
  const needsHlqtAssociation =
    !userHasAssociatedWithHlqt && (!validChange || validChange?.depositHCHF);
  // hlqt token association (deposition)
  const { call: associateWithHlqt, state: hlqtAssociationLoadingState } = useLoadingState(
    async () => {
      await liquity.associateWithHlqt();
    }
  );
  // hchf token association (withdrawal)
  const needsHchfAssociation = !userHasAssociatedWithHchf && validChange?.withdrawHCHF;
  const { call: associateWithHchf, state: hchfAssociationLoadingState } = useLoadingState(
    async () => {
      await liquity.associateWithHchf();
    }
  );
  // hchf spender approval
  const needsHchfSpenderApproval = !validChange || validChange.depositHCHF;
  const hchfContractHasHchfTokenAllowance = validChange?.depositHCHF
    ? validChange.depositHCHF.lte(hchfTokenAllowanceOfHchfContract)
    : false;

  const { call: approveHchfSpender, state: hchfApprovalLoadingState } = useLoadingState(async () => {
    if (!validChange?.depositHCHF) {
      const errorMessage = `you cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0`;
      console.error(errorMessage, "context:", { validChange });
      throw new Error(errorMessage);
    }

    await liquity.approveHchfToSpendHchf(validChange.depositHCHF);
  });

  const transactionSteps: Step[] = [];
  if (!validChange || validChange?.depositHCHF) {
    transactionSteps.push({
      title: "Associate with HLQT",
      status: getCompletableStepStatus({
        isCompleted: userHasAssociatedWithHlqt,
        completionLoadingState: hlqtAssociationLoadingState
      }),
      description: userHasAssociatedWithHlqt
        ? "You've already associated with HLQT."
        : "You have to associate with HLQT tokens before you can use HLiquity."
    });
  }
  if (validChange?.withdrawHCHF) {
    transactionSteps.push({
      title: "Associate with HCHF",
      status: getCompletableStepStatus({
        isCompleted: userHasAssociatedWithHchf,
        completionLoadingState: hchfAssociationLoadingState
      }),
      description: userHasAssociatedWithHchf
        ? "You've already associated with HCHF."
        : "You have to associate with HCHF tokens before you can use HLiquity."
    });
  }
  if (needsHchfSpenderApproval) {
    transactionSteps.push({
      title: "Approve HCHF allowance",
      status: getCompletableStepStatus({
        isCompleted: hchfContractHasHchfTokenAllowance,
        completionLoadingState: hchfApprovalLoadingState
      }),
      description: hchfContractHasHchfTokenAllowance
        ? "You've already given the HCHF contract allowance to spend the requested amount of HCHF tokens."
        : "You have to give the HCHF contract an HCHF token allowance."
    });
  }
  transactionSteps.push({
    title:
      !validChange || validChange?.depositHCHF
        ? "Deposit to the Stability Pool"
        : "Withdraw from the Stability Pool",
    status: changePending ? "pending" : "idle"
  });

  return (
    <StabilityDepositEditor
      originalDeposit={originalDeposit}
      editedHCHF={editedHCHF}
      changePending={changePending}
      dispatch={dispatch}
      transactionSteps={transactionSteps}
    >
      {description ??
        (makingNewDeposit ? (
          <ActionDescription>Enter the amount of {COIN} you'd like to deposit.</ActionDescription>
        ) : (
          <ActionDescription>Adjust the {COIN} amount to deposit or withdraw.</ActionDescription>
        ))}

      {multiWallet.hasConnection && (
        <Flex variant="layout.actions">
          <Button variant="cancel" onClick={handleCancel}>
            Cancel
          </Button>

          {needsHlqtAssociation ? (
            <LoadingThemeUiButton
              disabled={!validChange}
              loading={hlqtAssociationLoadingState === "pending"}
              onClick={associateWithHlqt}
            >
              Associate with HLQT
            </LoadingThemeUiButton>
          ) : needsHchfAssociation ? (
            <LoadingThemeUiButton
              disabled={!validChange}
              loading={hchfAssociationLoadingState === "pending"}
              onClick={associateWithHchf}
            >
              Associate with HCHF
            </LoadingThemeUiButton>
          ) : needsHchfSpenderApproval && !hchfContractHasHchfTokenAllowance ? (
            <LoadingThemeUiButton
              disabled={!validChange}
              loading={hchfApprovalLoadingState === "pending"}
              onClick={approveHchfSpender}
            >
              Approve allowance of {validChange?.depositHCHF?.toString(2)} HCHF
            </LoadingThemeUiButton>
          ) : validChange ? (
            <StabilityDepositAction
              transactionId={transactionId}
              change={validChange}
              loading={isTransactionPending}
            >
              {validChange?.depositHCHF
                ? `Deposit ${validChange?.depositHCHF?.toString(2)} HCHF`
                : `Withdraw ${validChange?.withdrawHCHF?.toString(2)} HCHF`}
            </StabilityDepositAction>
          ) : (
            <Button disabled>Confirm</Button>
          )}
        </Flex>
      )}
    </StabilityDepositEditor>
  );
};
