import { useLiquitySelector } from "@liquity/lib-react";
import { useMemo, useState } from "react";
import { Decimal } from "@liquity/lib-base";
import { useTrove } from "../../hooks/useTrove";
import { DecimalInput } from "../DecimalInput";
import { Grid } from "theme-ui";
import spacings from "../../styles/spacings.module.css";
import { ExpensiveTroveChangeWarning } from "./ExpensiveTroveChangeWarning";
import buttons from "../../styles/buttons.module.css";
import { useTroveTransactionFunction } from "../../hooks/useTroveTransactionFunction";
import { useValidatedTroveChange } from "../../hooks/useValidatedTroveChange";
import { Step, Steps, getCompletableStepStatus } from "../Steps";
import { useLoadingState } from "../../loading_state";
import { useLiquity } from "../../hooks/LiquityContext";
import { LoadingThemeUiButton } from "../LoadingButton";
import { HeadingWithChildren } from "../shared";

const TRANSACTION_ID = "repay";
export const Repay: React.FC = () => {
  const { liquity } = useLiquity();
  const state = useLiquitySelector(state => {
    const borrowingRate = state.fees.borrowingRate();
    const maxBorrowingRate = borrowingRate.add(0.005);

    return {
      trove: state.trove,
      price: state.price,
      maxBorrowingRate,
      userHasAssociatedWithHchf: state.userHasAssociatedWithHchf,
      hchfTokenAllowanceOfHchfContract: state.hchfTokenAllowanceOfHchfContract
    };
  });

  const [repayment, setRepayment] = useState(Decimal.ZERO);

  // Clamp repayment to not exceed netDebt to prevent negative debt calculations
  const effectiveRepayment = repayment.gt(state.trove.netDebt) ? state.trove.netDebt : repayment;

  const updatedTrove = useTrove(
    effectiveRepayment.eq(state.trove.netDebt) ? Decimal.ZERO : state.trove.collateral,
    state.trove.netDebt.sub(effectiveRepayment),
    state.trove
  );

  const hasChanges = useMemo(() => {
    return !state.trove.debt.eq(updatedTrove.debt);
  }, [state.trove, updatedTrove.debt]);

  const [troveChange, description] = useValidatedTroveChange(updatedTrove);

  const [sendTransaction, transactionState] = useTroveTransactionFunction(
    TRANSACTION_ID,
    troveChange
  );

  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  const { call: associateWithHchf, state: hchfAssociationLoadingState } = useLoadingState(
    async () => {
      await liquity.associateWithHchf();
    },
    [state.userHasAssociatedWithHchf]
  );

  // HCHF spender approval
  const hchfContractHasHchfTokenAllowance = troveChange?.params.repayHCHF
    ? troveChange.params.repayHCHF.lte(state.hchfTokenAllowanceOfHchfContract)
    : false;
  const { call: approveHchfSpender, state: hchfApprovalLoadingState } = useLoadingState(
    async () => {
      if (!troveChange?.params.repayHCHF) {
        throw "cannot approve a repayment of 0";
      }
      await liquity.approveHchfToSpendHchf(troveChange.params.repayHCHF);
    },
    [troveChange?.params.repayHCHF, state.hchfTokenAllowanceOfHchfContract]
  );

  const transactionSteps: Step[] = [
    {
      title: "Associate with HCHF",
      status: getCompletableStepStatus({
        isCompleted: state.userHasAssociatedWithHchf,
        completionLoadingState: hchfAssociationLoadingState
      }),
      description: state.userHasAssociatedWithHchf
        ? "You've already associated with HCHF."
        : "You have to associate with HCHF tokens before you can use HLiquity."
    },
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
      title: "Repay HCHF",
      status: isTransactionPending ? "pending" : "idle"
    }
  ];

  return (
    <>
      <HeadingWithChildren isSmall text="Pay back HCHF to reduce your debt.">
        <Steps steps={transactionSteps} />
      </HeadingWithChildren>

      <form
        onSubmit={event => {
          event.preventDefault();

          sendTransaction();
        }}
        onReset={event => {
          event.preventDefault();

          setRepayment(Decimal.ZERO);
        }}
        className={spacings.mt6}
      >
        <DecimalInput
          label="Repayment"
          value={repayment}
          onInput={setRepayment}
          max={state.trove.netDebt}
          className={spacings.mt6}
        />

        <p role="status">Outstanding: {state.trove.netDebt.prettify()}HCHF</p>

        {description}

        <ExpensiveTroveChangeWarning
          troveChange={troveChange}
          maxBorrowingRate={state.maxBorrowingRate}
          borrowingFeeDecayToleranceMinutes={60}
        />

        <Grid
          role="presentation"
          sx={{
            gridAutoFlow: "column",
            justifyContent: "end",
            mt: 4
          }}
        >
          <button type="reset" disabled={!hasChanges} className={buttons.normal}>
            Cancel
          </button>

          {!state.userHasAssociatedWithHchf ? (
            <LoadingThemeUiButton
              disabled={!troveChange}
              loading={hchfAssociationLoadingState === "pending"}
              onClick={associateWithHchf}
            >
              Associate with HCHF
            </LoadingThemeUiButton>
          ) : !hchfContractHasHchfTokenAllowance ? (
            <LoadingThemeUiButton
              disabled={!troveChange}
              loading={hchfApprovalLoadingState === "pending"}
              onClick={approveHchfSpender}
            >
              Approve allowance of {troveChange?.params.repayHCHF?.toString(2)} HCHF
            </LoadingThemeUiButton>
          ) : (
            <LoadingThemeUiButton
              type="submit"
              disabled={!troveChange}
              loading={isTransactionPending}
            >
              {troveChange?.params.repayHCHF ? (
                <>Repay {troveChange.params.repayHCHF.toString(2)} HCHF</>
              ) : (
                <>Repay HCHF</>
              )}
            </LoadingThemeUiButton>
          )}
        </Grid>
      </form>
    </>
  );
};
