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
import { Step } from "../Steps";
import { useLoadingState } from "../../loading_state";
import { useHedera } from "../../hedera/hedera_context";
import { useLiquity } from "../../hooks/LiquityContext";
import { BigNumber } from "ethers";
import { LoadingButton } from "../LoadingButton";
import { useDeployment } from "../../configuration/deployments";

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

const reduceWith = (action: StabilityDepositManagerAction) => (
  state: StabilityDepositManagerState
): StabilityDepositManagerState => reduce(state, action);

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

  const handleCancel = useCallback(() => {
    dispatchEvent("CANCEL_PRESSED");
  }, [dispatchEvent]);

  const [validChange, description] = validateStabilityDepositChange(
    originalDeposit,
    editedHCHF,
    validationContext
  );

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
  const {
    liquity: {
      connection: { addresses }
    }
  } = useLiquity();
  const {
    hasAssociatedWithHlqt,
    hasAssociatedWithHchf,
    associateWithToken,
    approveSpender
  } = useHedera();
  const deployment = useDeployment();
  const needsHlqtAssociation = !hasAssociatedWithHlqt && (!validChange || validChange?.depositHCHF);
  // hlqt token association (deposition)
  const { call: associateWithHlqt, state: hlqtAssociationLoadingState } = useLoadingState(
    async () => {
      if (!deployment) {
        const errorMessage = `i cannot get the hlqt token id if there is no deployment. please connect to a chain first.`;
        console.error(errorMessage, "context:", { deployment });
        throw new Error(errorMessage);
      }

      await associateWithToken({ tokenAddress: deployment.hlqtTokenAddress });
    }
  );
  // hchf token association (withdrawal)
  const needsHchfAssociation = !hasAssociatedWithHchf && validChange?.withdrawHCHF;
  const { call: associateWithHchf, state: hchfAssociationLoadingState } = useLoadingState(
    async () => {
      if (!deployment) {
        const errorMessage = `i cannot get the hchf token id if there is no deployment. please connect to a chain first.`;
        console.error(errorMessage, "context:", { deployment });
        throw new Error(errorMessage);
      }

      await associateWithToken({ tokenAddress: deployment.hchfTokenAddress });
    }
  );
  // hchf spender approval
  const needsHchfSpenderApproval = !validChange || validChange?.depositHCHF;
  const { call: approveHchfSpender, state: hchfApprovalLoadingState } = useLoadingState(async () => {
    if (!validChange?.depositHCHF) {
      const errorMessage = `you cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0`;
      console.error(errorMessage, "context:", { validChange });
      throw new Error(errorMessage);
    }

    if (!deployment) {
      const errorMessage = `i cannot get the hchf token id if there is no deployment. please connect to a chain first.`;
      console.error(errorMessage, "context:", { deployment });
      throw new Error(errorMessage);
    }

    const contractAddress = addresses.hchfToken as `0x${string}`;
    const tokenAddress = deployment.hchfTokenAddress;
    const amount = BigNumber.from(validChange.depositHCHF.bigNumber);

    await approveSpender({
      contractAddress,
      tokenAddress,
      amount
    });
  });

  const transactionSteps: Step[] = [];
  if (!validChange || validChange?.depositHCHF) {
    transactionSteps.push({
      title: "Associate with HLQT",
      status: hasAssociatedWithHlqt
        ? "success"
        : hlqtAssociationLoadingState === "error"
        ? "danger"
        : hlqtAssociationLoadingState,
      description: hasAssociatedWithHlqt
        ? "You've already consented to receiving HLQT."
        : "You have to consent to receiving HLQT tokens before you can use HLiquity."
    });
  }
  if (validChange?.withdrawHCHF) {
    transactionSteps.push({
      title: "Associate with HCHF",
      status: hasAssociatedWithHchf
        ? "success"
        : hlqtAssociationLoadingState === "error"
        ? "danger"
        : hlqtAssociationLoadingState,
      description: hasAssociatedWithHchf
        ? "You've already consented to receiving HCHF."
        : "You have to consent to receiving HCHF tokens before you can use HLiquity."
    });
  }
  if (needsHchfSpenderApproval) {
    transactionSteps.push({
      title: "Approve HCHF spender",
      status: hchfApprovalLoadingState === "error" ? "danger" : hchfApprovalLoadingState,
      description: "You have to consent to the HCHF contract spending your HCHF tokens."
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

      <Flex variant="layout.actions">
        <Button variant="cancel" onClick={handleCancel}>
          Cancel
        </Button>

        {needsHlqtAssociation ? (
          <LoadingButton
            disabled={!validChange}
            loading={hlqtAssociationLoadingState === "pending"}
            onClick={associateWithHlqt}
          >
            Consent to receiving HLQT
          </LoadingButton>
        ) : needsHchfAssociation ? (
          <LoadingButton
            disabled={!validChange}
            loading={hchfAssociationLoadingState === "pending"}
            onClick={associateWithHchf}
          >
            Consent to receiving HCHF
          </LoadingButton>
        ) : needsHchfSpenderApproval && hchfApprovalLoadingState !== "success" ? (
          <LoadingButton
            disabled={!validChange}
            loading={hchfApprovalLoadingState === "pending"}
            onClick={approveHchfSpender}
          >
            Consent to spending {validChange?.depositHCHF?.toString(2)} HCHF
          </LoadingButton>
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
    </StabilityDepositEditor>
  );
};
