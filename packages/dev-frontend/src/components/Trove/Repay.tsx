import { useLiquitySelector } from "@liquity/lib-react";
import { useMemo, useState } from "react";
import { Decimal } from "@liquity/lib-base";
import { useTrove } from "../../hooks/useTrove";
import { DecimalInput } from "../DecimalInput";
import { Grid, Paragraph } from "theme-ui";
import spacings from "../../styles/spacings.module.css";
import { ExpensiveTroveChangeWarning } from "./ExpensiveTroveChangeWarning";
import buttons from "../../styles/buttons.module.css";
import { useTroveTransactionFunction } from "../../hooks/useTroveTransactionFunction";
import { useValidatedTroveChange } from "../../hooks/useValidatedTroveChange";

const TRANSACTION_ID = "repay";
export const Repay: React.FC = () => {
  const state = useLiquitySelector(state => {
    const borrowingRate = state.fees.borrowingRate();
    const maxBorrowingRate = borrowingRate.add(0.005);

    return {
      trove: state.trove,
      price: state.price,
      maxBorrowingRate
    };
  });

  const [repayment, setRepayment] = useState(Decimal.ZERO);

  const updatedTrove = useTrove(
    repayment.eq(state.trove.netDebt) ? Decimal.ZERO : state.trove.collateral,
    state.trove.netDebt.sub(repayment),
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

  return (
    <>
      <Paragraph>Pay back HCHF to reduce your debt.</Paragraph>

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

        {JSON.stringify(troveChange)}

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

          <button type="submit" disabled={!troveChange} className={buttons.green}>
            {troveChange?.params.repayHCHF ? (
              <>Repay {troveChange.params.repayHCHF.toString(2)} HCHF</>
            ) : (
              <>Repay HCHF</>
            )}
          </button>
        </Grid>
      </form>
    </>
  );
};
