import { useCallback, useEffect } from "react";
import { Flex } from "theme-ui";

import { LiquityStoreState, Decimal, Trove, Decimalish, Constants } from "@liquity/lib-base";

import { LiquityStoreUpdate, useLiquityReducer, useLiquitySelector } from "@liquity/lib-react";

import { ActionDescription } from "../ActionDescription";
import { useMyTransactionState } from "../Transaction";

import { TroveEditor } from "./TroveEditor";
import { TroveAction } from "./TroveAction";
import { useTroveView } from "./context/TroveViewContext";

import {
  selectForTroveChangeValidation,
  validateTroveChange
} from "./validation/validateTroveChange";
import { COLLATERAL_COIN } from "../../strings";
import { Step, getCompletableStepStatus } from "../Steps";
import { useLiquity } from "../../hooks/LiquityContext";
import { useLoadingState } from "../../loading_state";
import { LoadingThemeUiButton } from "../LoadingButton";
import { useConstants } from "../../hooks/constants";
import { useMultiWallet } from "../../multi_wallet";
import buttons from "../../styles/buttons.module.css";

const getInitializer =
  (options: { constants: Constants }) =>
  ({ trove }: LiquityStoreState) => ({
    original: trove,
    edited: new Trove(options.constants, trove.collateral, trove.debt),
    changePending: false,
    debtDirty: false,
    addedMinimumDebt: false
  });

type TroveManagerState = ReturnType<ReturnType<typeof getInitializer>>;
type TroveManagerAction =
  | LiquityStoreUpdate
  | { type: "startChange" | "finishChange" | "revert" | "addMinimumDebt" | "removeMinimumDebt" }
  | { type: "setCollateral" | "setDebt"; newValue: Decimalish };

const reduceWith =
  (action: TroveManagerAction) =>
  (options: { constants: Constants }, state: TroveManagerState): TroveManagerState =>
    getReducer(options)(state, action);

const addMinimumDebt = reduceWith({ type: "addMinimumDebt" });
const removeMinimumDebt = reduceWith({ type: "removeMinimumDebt" });
const finishChange = reduceWith({ type: "finishChange" });
const revert = reduceWith({ type: "revert" });

const getReducer =
  (options: { constants: Constants }) =>
  (state: TroveManagerState, action: TroveManagerAction): TroveManagerState => {
    const { original, edited, changePending, debtDirty, addedMinimumDebt } = state;

    switch (action.type) {
      case "startChange": {
        return { ...state, changePending: true };
      }

      case "finishChange":
        return { ...state, changePending: false };

      case "setCollateral": {
        const newCollateral = Decimal.from(action.newValue);

        const newState = {
          ...state,
          edited: edited.setCollateral(newCollateral)
        };

        if (!debtDirty) {
          if (edited.isEmpty && newCollateral.nonZero) {
            return addMinimumDebt(options, newState);
          }
          if (addedMinimumDebt && newCollateral.isZero) {
            return removeMinimumDebt(options, newState);
          }
        }

        return newState;
      }

      case "setDebt":
        return {
          ...state,
          edited: edited.setDebt(action.newValue),
          debtDirty: true
        };

      case "addMinimumDebt":
        return {
          ...state,
          edited: edited.setDebt(options.constants.HCHF_MINIMUM_DEBT),
          addedMinimumDebt: true
        };

      case "removeMinimumDebt":
        return {
          ...state,
          edited: edited.setDebt(0),
          addedMinimumDebt: false
        };

      case "revert":
        return {
          ...state,
          edited: new Trove(options.constants, original.collateral, original.debt),
          debtDirty: false,
          addedMinimumDebt: false
        };

      case "updateStore": {
        const {
          newState: { trove },
          stateChange: { troveBeforeRedistribution: changeCommitted }
        } = action;

        const newState = {
          ...state,
          original: trove
        };

        if (changePending && changeCommitted) {
          return finishChange(options, revert(options, newState));
        }

        const change = original.whatChanged(edited, 0);

        if (
          (change?.type === "creation" && !trove.isEmpty) ||
          (change?.type === "closure" && trove.isEmpty)
        ) {
          return revert(options, newState);
        }

        return { ...newState, edited: trove.apply(change, 0) };
      }
    }
  };

const feeFrom = (original: Trove, edited: Trove, borrowingRate: Decimal): Decimal => {
  const change = original.whatChanged(edited, borrowingRate);

  if (change && change.type !== "invalidCreation" && change.params.borrowHCHF) {
    return change.params.borrowHCHF.mul(borrowingRate);
  } else {
    return Decimal.ZERO;
  }
};

const select = (state: LiquityStoreState) => ({
  ...state,
  validationContext: selectForTroveChangeValidation(state)
});

const transactionIdPrefix = "trove-";
const transactionIdMatcher = new RegExp(`^${transactionIdPrefix}`);

type TroveManagerProps = {
  collateral?: Decimalish;
  debt?: Decimalish;
};

export const TroveManager: React.FC<TroveManagerProps> = ({ collateral, debt }) => {
  const constants = useConstants();
  const [{ original, edited, changePending }, dispatch] = useLiquityReducer(
    getReducer({ constants }),
    getInitializer({ constants })
  );
  const { fees, validationContext, hchfTokenAllowanceOfHchfContract } = useLiquitySelector(select);
  const multiWallet = useMultiWallet();

  useEffect(() => {
    if (collateral !== undefined) {
      dispatch({ type: "setCollateral", newValue: collateral });
    }
    if (debt !== undefined) {
      dispatch({ type: "setDebt", newValue: debt });
    }
  }, [collateral, debt, dispatch]);

  const borrowingRate = fees.borrowingRate();
  const maxBorrowingRate = borrowingRate.add(0.005); // WONT-FIX slippage tolerance

  const [validChange, description] = validateTroveChange(
    original,
    edited,
    borrowingRate,
    validationContext,
    constants,
    multiWallet.hasConnection
  );

  const { dispatchEvent } = useTroveView();

  const handleCancel = useCallback(() => {
    dispatchEvent("CANCEL_ADJUST_TROVE_PRESSED");
  }, [dispatchEvent]);

  const openingNewTrove = original.isEmpty;

  const myTransactionState = useMyTransactionState(transactionIdMatcher);
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
      if (myTransactionState.id === `${transactionIdPrefix}closure`) {
        dispatchEvent("TROVE_CLOSED");
      } else {
        dispatchEvent("TROVE_ADJUSTED");
      }
    }
  }, [myTransactionState, dispatch, dispatchEvent]);

  // consent & approval
  const { liquity } = useLiquity();

  // hchf spender approval
  const { call: approveHchfSpender, state: hchfApprovalLoadingState } = useLoadingState(async () => {
    if (!validChange?.params.repayHCHF) {
      throw "cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0";
    }

    await liquity.approveHchfToSpendHchf(validChange.params.repayHCHF);
  });

  const hchfContractHasHchfTokenAllowance = validChange?.params.repayHCHF
    ? validChange.params.repayHCHF.lte(hchfTokenAllowanceOfHchfContract)
    : false;

  const transactionSteps: Step[] = [
    {
      title: "Approve HCHF allowance",
      status: getCompletableStepStatus({
        isCompleted: hchfContractHasHchfTokenAllowance,
        completionLoadingState: hchfApprovalLoadingState
      }),
      description: hchfContractHasHchfTokenAllowance
        ? "You've already given the HCHF contract allowance to spend the requested amount of HCHF tokens."
        : "You have to give the HCHF contract an HCHF token allowance."
    },
    {
      title: "Close your trove",
      status: isTransactionPending ? "pending" : "idle"
    }
  ];

  return (
    <TroveEditor
      original={original}
      edited={edited}
      fee={feeFrom(original, edited, borrowingRate)}
      borrowingRate={borrowingRate}
      changePending={changePending}
      dispatch={dispatch}
      transactionSteps={transactionSteps}
    >
      {description ??
        (openingNewTrove ? (
          <ActionDescription>
            Start by entering the amount of {COLLATERAL_COIN} you'd like to deposit as collateral.
          </ActionDescription>
        ) : (
          <ActionDescription>
            Adjust your Trove by modifying its collateral, debt, or both.
          </ActionDescription>
        ))}

      <Flex variant="layout.actions">
        <button className={buttons.normal} onClick={handleCancel}>
          Cancel
        </button>

        {!hchfContractHasHchfTokenAllowance ? (
          <LoadingThemeUiButton
            disabled={!validChange}
            loading={hchfApprovalLoadingState === "pending"}
            onClick={approveHchfSpender}
          >
            Approve allowance of {validChange?.params.repayHCHF?.toString(2)} HCHF
          </LoadingThemeUiButton>
        ) : validChange ? (
          <TroveAction
            transactionId={`${transactionIdPrefix}${validChange.type}`}
            change={validChange}
            maxBorrowingRate={maxBorrowingRate}
            borrowingFeeDecayToleranceMinutes={60}
            loading={isTransactionPending}
          >
            Repay {validChange?.params.repayHCHF?.toString(2)} HCHF
          </TroveAction>
        ) : (
          <button className={buttons.normal} disabled>Confirm</button>
        )}
      </Flex>
    </TroveEditor>
  );
};
