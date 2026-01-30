import React, { useCallback, useEffect, useState } from "react";
import { Flex, Button, Box, Card, Heading, Spinner, Checkbox, Label } from "theme-ui";
import { LiquityStoreState, Decimal, Trove, Percent } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useStableTroveChange } from "../../hooks/useStableTroveChange";
import { ActionDescription } from "../ActionDescription";
import { useMyTransactionState } from "../Transaction";
import { TroveAction } from "./TroveAction";
import { useTroveView } from "./context/TroveViewContext";
import { COIN, COLLATERAL_COIN } from "../../strings";
import { Icon } from "../Icon";
import { InfoIcon } from "../InfoIcon";
import { CollateralRatio } from "./CollateralRatio";
import { EditableRow, StaticRow } from "./Editor";
import { ExpensiveTroveChangeWarning, GasEstimationState } from "./ExpensiveTroveChangeWarning";
import {
  selectForTroveChangeValidation,
  validateTroveChange
} from "./validation/validateTroveChange";
import { Step, Steps, getCompletableStepStatus } from "../Steps";
import { useLoadingState } from "../../loading_state";
import { useLiquity } from "../../hooks/LiquityContext";
import { useConstants } from "../../hooks/constants";
import { useMultiWallet } from "../../multi_wallet";

const selector = (state: LiquityStoreState) => {
  const { fees, price, accountBalance } = state;
  return {
    fees,
    price,
    accountBalance,
    validationContext: selectForTroveChangeValidation(state)
  };
};

const TRANSACTION_ID = "trove-creation";
const TX_MAX_COSTS = Decimal.from(40);

export const Opening: React.FC = () => {
  const multiWallet = useMultiWallet();
  const constants = useConstants();
  const EMPTY_TROVE = new Trove(constants, Decimal.ZERO, Decimal.ZERO);
  const { dispatchEvent } = useTroveView();
  const { fees, price, accountBalance, validationContext } = useLiquitySelector(selector);
  const borrowingRate = fees.borrowingRate();
  const editingState = useState<string>();

  const [collateral, setCollateral] = useState<Decimal>(Decimal.ZERO);
  const [borrowAmount, setBorrowAmount] = useState<Decimal>(Decimal.ZERO);
  const [auto, setAuto] = useState<boolean>(false);

  const maxBorrowingRate = borrowingRate.add(0.005);

  const fee = borrowAmount.mul(borrowingRate);
  const feePct = new Percent(borrowingRate);
  const totalDebt = borrowAmount.add(constants.HCHF_LIQUIDATION_RESERVE).add(fee);
  const isDirty = !collateral.isZero || !borrowAmount.isZero;
  const trove = isDirty ? new Trove(constants, collateral, totalDebt) : EMPTY_TROVE;
  const maxCollateral = accountBalance.gt(TX_MAX_COSTS)
    ? accountBalance.sub(TX_MAX_COSTS)
    : Decimal.ZERO;
  const collateralMaxedOut = collateral.eq(maxCollateral);
  const collateralRatio =
    !collateral.isZero && !borrowAmount.isZero ? trove.collateralRatio(price) : undefined;

  const [troveChange, description] = validateTroveChange(
    EMPTY_TROVE,
    trove,
    borrowingRate,
    validationContext,
    constants,
    multiWallet.hasConnection
  );

  const stableTroveChange = useStableTroveChange(troveChange);
  const [gasEstimationState, setGasEstimationState] = useState<GasEstimationState>({ type: "idle" });

  const transactionState = useMyTransactionState(TRANSACTION_ID);
  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  const handleCancelPressed = useCallback(() => {
    dispatchEvent("CANCEL_ADJUST_TROVE_PRESSED");
  }, [dispatchEvent]);

  const reset = useCallback(() => {
    setCollateral(Decimal.ZERO);
    setBorrowAmount(Decimal.ZERO);
  }, []);

  useEffect(() => {
    if (!collateral.isZero && borrowAmount.isZero) {
      setBorrowAmount(constants.HCHF_MINIMUM_NET_DEBT);
    }
  }, [collateral, borrowAmount, constants]);

  // consent & approval
  const { liquity } = useLiquity();
  const { userHasAssociatedWithHchf } = useLiquitySelector(state => state);
  const { call: associateWithHchf, state: hchfAssociationLoadingState } =
    useLoadingState(async () => {
      await liquity.associateWithHchf();
    }, [userHasAssociatedWithHchf]);

  const steps: Step[] = [
    {
      title: "Associate with HCHF",
      status: getCompletableStepStatus({
        isCompleted: userHasAssociatedWithHchf,
        completionLoadingState: hchfAssociationLoadingState
      }),
      description: userHasAssociatedWithHchf
        ? "You've already associated with HCHF."
        : "You have to associate with HCHF tokens before you can use HLiquity."
    },
    {
      title: "Open the trove",
      status: isTransactionPending ? "pending" : "idle"
    }
  ];

  const collateralHandler = (amount: string) => {
    const newCol = Decimal.from(amount);
    const collRat = newCol.mul(price).div(totalDebt);
    setCollateral(newCol);

    if (auto && collRat.lt(Decimal.from(1.5))) {
      const newNetDebt = newCol
        .mul(price)
        .div(Decimal.from(1.5))
        .sub(constants.HCHF_LIQUIDATION_RESERVE)
        .div(borrowingRate.add(Decimal.from(1)));

      setBorrowAmount(newNetDebt.isZero ? Decimal.ZERO : newNetDebt);
    }
  };

  const netDebtHandler = (amount: string) => {
    const newDebt = Decimal.from(amount);
    const newTotalDebt = newDebt
      .add(constants.HCHF_LIQUIDATION_RESERVE)
      .add(newDebt.mul(borrowingRate));
    const collRat = collateral.mul(price).div(newTotalDebt);
    setBorrowAmount(newDebt);

    if (auto && collRat.lt(Decimal.from(1.5))) {
      const newCol = newDebt
        .add(constants.HCHF_LIQUIDATION_RESERVE)
        .add(newDebt.mul(borrowingRate))
        .mul(Decimal.from(1.5))
        .div(price);

      setCollateral(newCol);
    }
  };

  return (
    <Card>
      <Heading
        sx={{
          display: "grid !important",
          gridAutoFlow: "column",
          gridTemplateColumns: "1fr repeat(2, auto)"
        }}
      >
        Trove
        <Steps steps={steps} />
        {isDirty && !isTransactionPending && (
          <Button
            variant="titleIcon"
            sx={{ ":enabled:hover": { color: "danger" }, marginLeft: "1rem" }}
            onClick={reset}
          >
            <Icon name="history" size="lg" />
          </Button>
        )}
      </Heading>

      <Box sx={{ p: [2, 3] }}>
        <EditableRow
          label="Collateral"
          inputId="trove-collateral"
          amount={collateral.prettify()}
          maxAmount={maxCollateral.toString(2)}
          maxedOut={collateralMaxedOut}
          editingState={editingState}
          unit={COLLATERAL_COIN}
          editedAmount={collateral.toString(2)}
          setEditedAmount={collateralHandler}
        />

        <EditableRow
          label="Borrow"
          inputId="trove-borrow-amount"
          amount={borrowAmount.prettify()}
          unit={COIN}
          editingState={editingState}
          editedAmount={borrowAmount.toString(2)}
          setEditedAmount={netDebtHandler}
        />

        <Flex
          sx={{
            alignItems: "center",
            py: 0,
            mb: 3,
            mt: "-10px",
            fontSize: 1
          }}
        >
          <Box>
            <Checkbox
              id="switch-auto"
              checked={auto}
              onChange={e => setAuto(e.target.checked)}
            ></Checkbox>
          </Box>
          <Label
            htmlFor="switch-auto"
            sx={{ flex: "0 0 auto", px: 0, cursor: "pointer", fontSize: 1, ml: 1 }}
          >
            Adjust automatically
          </Label>
          <InfoIcon
            tooltip={
              <Card variant="tooltip" sx={{ width: "200px" }}>
                Automatically adjusts HBAR/HCHF ratio to keep your CR above 150%.
              </Card>
            }
          />
        </Flex>

        <StaticRow
          label="Liquidation Reserve"
          inputId="trove-liquidation-reserve"
          amount={`${constants.HCHF_LIQUIDATION_RESERVE}`}
          unit={COIN}
          infoIcon={
            <InfoIcon
              tooltip={
                <Card variant="tooltip" sx={{ width: "200px" }}>
                  An amount set aside to cover the liquidator’s gas costs if your Trove needs to be
                  liquidated. The amount increases your debt and is refunded if you close your Trove
                  by fully paying off its net debt.
                </Card>
              }
            />
          }
        />

        <StaticRow
          label="Borrowing Fee"
          inputId="trove-borrowing-fee"
          amount={fee.prettify(2)}
          pendingAmount={feePct.toString(2)}
          unit={COIN}
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
          amount={totalDebt.prettify(2)}
          unit={COIN}
          infoIcon={
            <InfoIcon
              tooltip={
                <Card variant="tooltip" sx={{ width: "240px" }}>
                  The total amount of HCHF your Trove will hold.{" "}
                  {isDirty && (
                    <>
                      You will need to repay{" "}
                      {totalDebt.sub(constants.HCHF_LIQUIDATION_RESERVE).prettify(2)} HCHF to reclaim
                      your collateral ({constants.HCHF_LIQUIDATION_RESERVE.toString()} HCHF
                      Liquidation Reserve excluded).
                    </>
                  )}
                </Card>
              }
            />
          }
        />

        <CollateralRatio value={collateralRatio} />

        {description ?? (
          <ActionDescription>
            Start by entering the amount of {COLLATERAL_COIN} you'd like to deposit as collateral.
          </ActionDescription>
        )}

        <ExpensiveTroveChangeWarning
          troveChange={stableTroveChange}
          maxBorrowingRate={maxBorrowingRate}
          borrowingFeeDecayToleranceMinutes={60}
          gasEstimationState={gasEstimationState}
          setGasEstimationState={setGasEstimationState}
        />

        {multiWallet.hasConnection && (
          <Flex variant="layout.actions">
            <Button variant="cancel" onClick={handleCancelPressed}>
              Cancel
            </Button>

            {gasEstimationState.type === "inProgress" ? (
              <Button disabled>
                <Spinner size={24} />
              </Button>
            ) : !userHasAssociatedWithHchf ? (
              <Button
                onClick={associateWithHchf}
                disabled={!stableTroveChange || hchfAssociationLoadingState === "pending"}
                sx={{ gap: "1rem" }}
              >
                Associate with HCHF
                {hchfAssociationLoadingState === "pending" && (
                  <Spinner size={16} color="currentColor" />
                )}
              </Button>
            ) : !stableTroveChange ? (
              <Button disabled>Confirm</Button>
            ) : (
              <TroveAction
                transactionId={TRANSACTION_ID}
                change={stableTroveChange}
                maxBorrowingRate={maxBorrowingRate}
                borrowingFeeDecayToleranceMinutes={60}
                loading={isTransactionPending}
              >
                Borrow {stableTroveChange?.params.borrowHCHF?.toString(2)} HCHF
              </TroveAction>
            )}
          </Flex>
        )}
      </Box>
    </Card>
  );
};
