import React, { useCallback, useEffect, useState, useRef } from "react";
import { Flex, Button, Box, Card, Heading, Label, Checkbox } from "theme-ui";
import { LiquityStoreState, Decimal, Trove, Percent, Difference } from "@liquity/lib-base";
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
import { useLiquity } from "../../hooks/LiquityContext";
import { useLoadingState } from "../../loading_state";
import { LoadingButton } from "../LoadingButton";
import { useConstants } from "../../hooks/constants";
import { useMultiWallet } from "../../multi_wallet";

const selector = (state: LiquityStoreState) => {
  const { trove, fees, price, accountBalance } = state;
  return {
    trove,
    fees,
    price,
    accountBalance,
    validationContext: selectForTroveChangeValidation(state)
  };
};

const TRANSACTION_ID = "trove-adjustment";
const TX_MAX_COSTS = Decimal.from(40);

const feeFrom = (original: Trove, edited: Trove, borrowingRate: Decimal): Decimal => {
  const change = original.whatChanged(edited, borrowingRate);

  if (change && change.type !== "invalidCreation" && change.params.borrowHCHF) {
    return change.params.borrowHCHF.mul(borrowingRate);
  } else {
    return Decimal.ZERO;
  }
};

const applyUnsavedCollateralChanges = (unsavedChanges: Difference, trove: Trove) => {
  if (unsavedChanges.absoluteValue) {
    if (unsavedChanges.positive) {
      return trove.collateral.add(unsavedChanges.absoluteValue);
    }
    if (unsavedChanges.negative) {
      if (unsavedChanges.absoluteValue.lt(trove.collateral)) {
        return trove.collateral.sub(unsavedChanges.absoluteValue);
      }
    }
    return trove.collateral;
  }
  return trove.collateral;
};

const applyUnsavedNetDebtChanges = (unsavedChanges: Difference, trove: Trove) => {
  if (unsavedChanges.absoluteValue) {
    if (unsavedChanges.positive) {
      return trove.netDebt.add(unsavedChanges.absoluteValue);
    }
    if (unsavedChanges.negative) {
      if (unsavedChanges.absoluteValue.lt(trove.netDebt)) {
        return trove.netDebt.sub(unsavedChanges.absoluteValue);
      }
    }
    return trove.netDebt;
  }
  return trove.netDebt;
};

export const Adjusting: React.FC = () => {
  const constants = useConstants();
  const { dispatchEvent } = useTroveView();
  const { trove, fees, price, accountBalance, validationContext } = useLiquitySelector(selector);
  const editingState = useState<string>();
  const previousTrove = useRef<Trove>(trove);
  const [collateral, setCollateral] = useState<Decimal>(trove.collateral);
  const [netDebt, setNetDebt] = useState<Decimal>(trove.netDebt);
  const [auto, setAuto] = useState<boolean>(false);
  const multiWallet = useMultiWallet();

  const transactionState = useMyTransactionState(TRANSACTION_ID);
  const borrowingRate = fees.borrowingRate();

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot") {
      dispatchEvent("TROVE_ADJUSTED");
    }
  }, [transactionState.type, dispatchEvent]);

  useEffect(() => {
    if (!previousTrove.current.collateral.eq(trove.collateral)) {
      const unsavedChanges = Difference.between(collateral, previousTrove.current.collateral);
      const nextCollateral = applyUnsavedCollateralChanges(unsavedChanges, trove);
      setCollateral(nextCollateral);
    }
    if (!previousTrove.current.netDebt.eq(trove.netDebt)) {
      const unsavedChanges = Difference.between(netDebt, previousTrove.current.netDebt);
      const nextNetDebt = applyUnsavedNetDebtChanges(unsavedChanges, trove);
      setNetDebt(nextNetDebt);
    }
    previousTrove.current = trove;
  }, [trove, collateral, netDebt, auto]);

  const handleCancelPressed = useCallback(() => {
    dispatchEvent("CANCEL_ADJUST_TROVE_PRESSED");
  }, [dispatchEvent]);

  const reset = useCallback(() => {
    setCollateral(trove.collateral);
    setNetDebt(trove.netDebt);
  }, [trove.collateral, trove.netDebt]);

  const isDirty = !collateral.eq(trove.collateral) || !netDebt.eq(trove.netDebt);
  const isDebtIncrease = netDebt.gt(trove.netDebt);
  const debtIncreaseAmount = isDebtIncrease ? netDebt.sub(trove.netDebt) : Decimal.ZERO;

  const fee = isDebtIncrease
    ? feeFrom(
        trove,
        new Trove(constants, trove.collateral, trove.debt.add(debtIncreaseAmount)),
        borrowingRate
      )
    : Decimal.ZERO;
  const totalDebt = netDebt.add(constants.HCHF_LIQUIDATION_RESERVE).add(fee);
  const maxBorrowingRate = borrowingRate.add(0.005);
  const updatedTrove = isDirty ? new Trove(constants, collateral, totalDebt) : trove;
  const feePct = new Percent(borrowingRate);
  const availableEth = trove.collateral.add(accountBalance);
  const maxCollateral = availableEth.gt(TX_MAX_COSTS)
    ? availableEth.sub(TX_MAX_COSTS)
    : Decimal.ZERO;
  const collateralMaxedOut = collateral.eq(maxCollateral);
  const collateralRatio =
    !collateral.isZero && !netDebt.isZero ? updatedTrove.collateralRatio(price) : undefined;
  const collateralRatioChange = Difference.between(collateralRatio, trove.collateralRatio(price));

  const [troveChange, description] = validateTroveChange(
    trove,
    updatedTrove,
    borrowingRate,
    validationContext,
    constants,
    multiWallet.hasConnection
  );

  const stableTroveChange = useStableTroveChange(troveChange);
  const [gasEstimationState, setGasEstimationState] = useState<GasEstimationState>({ type: "idle" });

  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  // consent & approval
  const needsHchfAssociation = !stableTroveChange || stableTroveChange?.params.borrowHCHF;
  // hchf token association
  const { liquity } = useLiquity();
  const { userHasAssociatedWithHchf, hchfTokenAllowanceOfHchfContract } = useLiquitySelector(
    state => state
  );
  const { call: associateWithHchf, state: hchfAssociationLoadingState } = useLoadingState(
    async () => {
      await liquity.associateWithHchf();
    }
  );
  // hchf spender approval
  const needsSpenderApproval = stableTroveChange?.params.repayHCHF;
  const hchfContractHasHchfTokenAllowance = stableTroveChange?.params.repayHCHF
    ? stableTroveChange.params.repayHCHF.lte(hchfTokenAllowanceOfHchfContract)
    : false;
  const { call: approveHchfSpender, state: hchfApprovalLoadingState } = useLoadingState(async () => {
    if (!stableTroveChange?.params.repayHCHF) {
      throw "cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0";
    }

    await liquity.approveHchfToSpendHchf(stableTroveChange.params.repayHCHF);
  });

  if (trove.status !== "open") {
    return null;
  }

  const transactionSteps: Step[] = [];
  if (needsHchfAssociation) {
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
  if (needsSpenderApproval) {
    transactionSteps.push({
      title: "Approve HCHF allowance",
      status: getCompletableStepStatus({
        isCompleted: hchfContractHasHchfTokenAllowance,
        completionLoadingState: hchfApprovalLoadingState
      }),
      description: hchfContractHasHchfTokenAllowance
        ? "You've already given the HCHF contract allowance to spend the requested amount of HCHF tokens."
        : "You have to give HCHF contract an HCHF token allowance."
    });
  }
  transactionSteps.push({
    title: "Adjust your trove",
    status: isTransactionPending ? "pending" : "idle"
  });

  const collateralHandler = (amount: string) => {
    const newCol = Decimal.from(amount);
    const collRat = newCol.mul(price).div(totalDebt);

    if (auto && collRat.lt(Decimal.from(1.5))) {
      const newNetDebt = newCol
        .mul(price)
        .div(Decimal.from(1.5))
        .sub(constants.HCHF_LIQUIDATION_RESERVE)
        .sub(fee);

      setNetDebt(newNetDebt.isZero ? Decimal.ZERO : newNetDebt);
    }

    setCollateral(newCol);
  };

  const netDebtHandler = (amount: string) => {
    const newDebt = Decimal.from(amount);
    const newTotalDebt = newDebt.add(constants.HCHF_LIQUIDATION_RESERVE).add(fee);
    const collRat = collateral.mul(price).div(newTotalDebt);

    if (auto && collRat.lt(Decimal.from(1.5))) {
      const newCol = newDebt
        .add(constants.HCHF_LIQUIDATION_RESERVE)
        .add(fee)
        .mul(Decimal.from(1.5))
        .div(price);

      setCollateral(newCol);
    }

    setNetDebt(newDebt);
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
        <Steps steps={transactionSteps} />
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
          maxAmount={maxCollateral.toString()}
          maxedOut={collateralMaxedOut}
          editingState={editingState}
          unit={COLLATERAL_COIN}
          editedAmount={collateral.toString(2)}
          setEditedAmount={collateralHandler}
        />

        <EditableRow
          label="Net debt"
          inputId="trove-net-debt-amount"
          amount={netDebt.prettify()}
          unit={COIN}
          editingState={editingState}
          editedAmount={netDebt.toString(2)}
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
          pendingAmount={`currently ${feePct.toString(2)} of debt`}
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

        <CollateralRatio value={collateralRatio} change={collateralRatioChange} />

        {description ?? (
          <ActionDescription>
            Adjust your Trove by modifying its collateral, debt, or both.
          </ActionDescription>
        )}

        <ExpensiveTroveChangeWarning
          troveChange={stableTroveChange}
          maxBorrowingRate={maxBorrowingRate}
          borrowingFeeDecayToleranceMinutes={60}
          gasEstimationState={gasEstimationState}
          setGasEstimationState={setGasEstimationState}
        />

        <Flex variant="layout.actions">
          <Button variant="cancel" onClick={handleCancelPressed}>
            Cancel
          </Button>

          {needsHchfAssociation && !userHasAssociatedWithHchf ? (
            <LoadingButton
              disabled={!stableTroveChange}
              loading={hchfAssociationLoadingState === "pending"}
              onClick={associateWithHchf}
            >
              Associate with HCHF
            </LoadingButton>
          ) : needsSpenderApproval && !hchfContractHasHchfTokenAllowance ? (
            <LoadingButton
              disabled={!stableTroveChange}
              loading={hchfApprovalLoadingState === "pending"}
              onClick={approveHchfSpender}
            >
              Approve allowance of {stableTroveChange?.params.repayHCHF?.toString(2)} HCHF
            </LoadingButton>
          ) : stableTroveChange ? (
            <TroveAction
              transactionId={TRANSACTION_ID}
              change={stableTroveChange}
              maxBorrowingRate={maxBorrowingRate}
              borrowingFeeDecayToleranceMinutes={60}
              loading={isTransactionPending}
            >
              {stableTroveChange?.params.borrowHCHF
                ? `Borrow ${stableTroveChange?.params.borrowHCHF.toString(2)} HCHF`
                : stableTroveChange?.params.repayHCHF
                ? `Repay ${stableTroveChange?.params.repayHCHF.toString(2)} HCHF`
                : stableTroveChange?.params.depositCollateral
                ? `Deposit ${stableTroveChange?.params.depositCollateral.toString(2)} HBAR`
                : stableTroveChange?.params.withdrawCollateral
                ? `Withdraw ${stableTroveChange?.params.withdrawCollateral.toString(2)} HBAR`
                : "Adjust trove"}
            </TroveAction>
          ) : (
            <Button disabled>Confirm</Button>
          )}
        </Flex>
      </Box>
    </Card>
  );
};
