import { useLiquitySelector } from "@liquity/lib-react";
import { useConstants } from "../../hooks/constants";
import { useCollateralRatio, useCollateralRatioDifference } from "../../hooks/useCollateralRatio";
import { useMemo, useState } from "react";
import { Decimal, Percent } from "@liquity/lib-base";
import { useTrove } from "../../hooks/useTrove";
import { useFee } from "../../hooks/useFee";
import { useMaxTroveCollateral } from "../../hooks/useMaxTroveCollateral";
import { useMaxNetDebt } from "../../hooks/useMaxNetDebt";
import { DecimalInput } from "../DecimalInput";
import { Card, Grid, Paragraph } from "theme-ui";
import { CollateralRatio } from "./CollateralRatio";
import { StaticRow } from "./Editor";
import { InfoIcon } from "../InfoIcon";
import spacings from "../../styles/spacings.module.css";
import {
  selectForTroveChangeValidation,
  validateTroveChange
} from "./validation/validateTroveChange";
import { useMultiWallet } from "../../multi_wallet";
import { ExpensiveTroveChangeWarning } from "./ExpensiveTroveChangeWarning";
import { ActionDescription } from "../ActionDescription";
import buttons from "../../styles/buttons.module.css";
import { useTroveTransactionFunction } from "../../hooks/useTroveTransactionFunction";

const TRANSACTION_ID = "withdraw";
export const Withdraw: React.FC = () => {
  const constants = useConstants();
  const state = useLiquitySelector(state => {
    const initialNetDebt = state.trove.debt.lt(constants.HCHF_LIQUIDATION_RESERVE)
      ? Decimal.ZERO
      : state.trove.netDebt;
    const borrowingRate = state.fees.borrowingRate();
    const maxBorrowingRate = borrowingRate.add(0.005);
    const validationContext = selectForTroveChangeValidation(state);

    return {
      trove: state.trove,
      initialNetDebt,
      accountBalance: state.accountBalance,
      price: state.price,
      borrowingRate,
      maxBorrowingRate,
      validationContext
    };
  });
  const collateralRatio = useCollateralRatio(state.trove);
  const borrowingRatePercent = useMemo(() => {
    return new Percent(state.borrowingRate);
  }, [state.borrowingRate]);

  const [collateral, setCollateral] = useState(state.trove.collateral);
  const [netDebt, setNetDebt] = useState(state.initialNetDebt);

  const updatedTrove = useTrove(collateral, netDebt, state.trove);
  const fee = useFee(updatedTrove.debt, state.trove.debt);
  const updatedCollateralRatio = useCollateralRatio(updatedTrove);
  const collateralRatioDifference = useCollateralRatioDifference(
    updatedCollateralRatio,
    collateralRatio
  );

  const hasChanges = useMemo(() => {
    return (
      !state.trove.collateral.eq(updatedTrove.collateral) || !state.trove.debt.eq(updatedTrove.debt)
    );
  }, [state.trove, updatedTrove]);

  const maxTroveCollateral = useMaxTroveCollateral();
  const maxNetDebt = useMaxNetDebt(collateral, state.trove.debt);

  const multiWallet = useMultiWallet();
  const [troveChange, description] = useMemo(
    () =>
      validateTroveChange(
        state.trove,
        updatedTrove,
        state.borrowingRate,
        state.validationContext,
        constants,
        multiWallet.hasConnection
      ),
    [state, updatedTrove, constants, multiWallet.hasConnection]
  );

  const [sendTransaction] = useTroveTransactionFunction(TRANSACTION_ID, troveChange);

  return (
    <>
      <Paragraph>Take out HBAR from your Trove.</Paragraph>

      <form
        onSubmit={event => {
          event.preventDefault();

          sendTransaction();
        }}
        onReset={event => {
          event.preventDefault();

          setCollateral(state.trove.collateral);
          setNetDebt(state.initialNetDebt);
        }}
        className={spacings.mt6}
      >
        <DecimalInput
          label="Collateral"
          value={collateral}
          onInput={setCollateral}
          max={maxTroveCollateral}
        />
        <DecimalInput
          label="Net debt"
          value={netDebt}
          onInput={setNetDebt}
          max={maxNetDebt}
          className={spacings.mt6}
        />

        {description ?? (
          <ActionDescription>
            Start by entering the amount of HBAR you'd like to deposit as collateral.
          </ActionDescription>
        )}

        <ExpensiveTroveChangeWarning
          troveChange={troveChange}
          maxBorrowingRate={state.maxBorrowingRate}
          borrowingFeeDecayToleranceMinutes={60}
        />

        <Grid
          role="status"
          sx={{
            gridAutoFlow: "column",
            mt: 4
          }}
        >
          <CollateralRatio
            value={updatedCollateralRatio}
            change={
              collateralRatioDifference.finite && collateralRatioDifference.nonZero
                ? collateralRatioDifference
                : undefined
            }
            infoSx={{
              gridRow: "2",
              gridColumn: "1 / 4"
            }}
          />

          <StaticRow
            label="Borrowing Fee"
            inputId="trove-borrowing-fee"
            amount={fee.prettify(2)}
            pendingAmount={borrowingRatePercent.toString(2)}
            unit="HCHF"
            infoIcon={
              <InfoIcon
                tooltip={
                  <Card variant="tooltip" sx={{ width: "240px" }}>
                    This amount is deducted from the borrowed amount as a one-time fee. There are no
                    recurring fees for borrowing, which is thus interest-free.
                  </Card>
                }
              />
            }
          />

          <StaticRow
            label="Total debt"
            inputId="trove-total-debt"
            amount={updatedTrove.debt.prettify(2)}
            unit="HCHF"
            infoIcon={
              <InfoIcon
                tooltip={
                  <Card variant="tooltip" sx={{ width: "240px" }}>
                    The total amount of HCHF your Trove will hold.{" "}
                    {hasChanges && (
                      <>
                        You will need to repay{" "}
                        {updatedTrove.debt.sub(constants.HCHF_LIQUIDATION_RESERVE).prettify(2)} HCHF
                        to reclaim your collateral ({constants.HCHF_LIQUIDATION_RESERVE.toString()}{" "}
                        HCHF Liquidation Reserve excluded).
                      </>
                    )}
                  </Card>
                }
              />
            }
          />
        </Grid>

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
            {troveChange?.params.borrowHCHF ? (
              <>Borrow {troveChange.params.borrowHCHF?.toString(2)} HCHF</>
            ) : (
              <>Borrow HCHF</>
            )}
          </button>
        </Grid>
      </form>
    </>
  );
};
