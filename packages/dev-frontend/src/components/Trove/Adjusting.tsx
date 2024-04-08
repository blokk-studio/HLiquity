import React, { useCallback, useEffect, useState, useRef } from "react";
import { Flex, Button, Box, Card, Heading } from "theme-ui";
import {
  LiquityStoreState,
  Decimal,
  Trove,
  HCHF_LIQUIDATION_RESERVE,
  Percent,
  Difference
} from "@liquity/lib-base";
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
import { Step, Steps } from "../Steps";
import { useLiquity } from "../../hooks/LiquityContext";
import { useHedera } from "../../hedera/hedera_context";
import { useLoadingState } from "../../loading_state";
import { BigNumber } from "ethers";
import { LoadingButton } from "../LoadingButton";
import { useHederaChain } from "../../hedera/wagmi-chains";

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
const GAS_ROOM_ETH = Decimal.from(0.1);

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
  const { dispatchEvent } = useTroveView();
  const { trove, fees, price, accountBalance, validationContext } = useLiquitySelector(selector);
  const editingState = useState<string>();
  const previousTrove = useRef<Trove>(trove);
  const [collateral, setCollateral] = useState<Decimal>(trove.collateral);
  const [netDebt, setNetDebt] = useState<Decimal>(trove.netDebt);

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
  }, [trove, collateral, netDebt]);

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
    ? feeFrom(trove, new Trove(trove.collateral, trove.debt.add(debtIncreaseAmount)), borrowingRate)
    : Decimal.ZERO;
  const totalDebt = netDebt.add(HCHF_LIQUIDATION_RESERVE).add(fee);
  const maxBorrowingRate = borrowingRate.add(0.005);
  const updatedTrove = isDirty ? new Trove(collateral, totalDebt) : trove;
  const feePct = new Percent(borrowingRate);
  const availableEth = accountBalance.gt(GAS_ROOM_ETH)
    ? accountBalance.sub(GAS_ROOM_ETH)
    : Decimal.ZERO;
  const maxCollateral = trove.collateral.add(availableEth);
  const collateralMaxedOut = collateral.eq(maxCollateral);
  const collateralRatio =
    !collateral.isZero && !netDebt.isZero ? updatedTrove.collateralRatio(price) : undefined;
  const collateralRatioChange = Difference.between(collateralRatio, trove.collateralRatio(price));

  const [troveChange, description] = validateTroveChange(
    trove,
    updatedTrove,
    borrowingRate,
    validationContext
  );

  const stableTroveChange = useStableTroveChange(troveChange);
  const [gasEstimationState, setGasEstimationState] = useState<GasEstimationState>({ type: "idle" });

  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  // consent & approval
  const {
    liquity: {
      connection: { addresses }
    }
  } = useLiquity();
  const chain = useHederaChain();
  const needsHchfAssociation = !stableTroveChange || stableTroveChange?.params.borrowHCHF;
  const { hasAssociatedWithHchf, associateWithToken, approveSpender } = useHedera();
  // hchf token association
  const { call: associateWithHchf, state: hchfAssociationLoadingState } = useLoadingState(
    async () => {
      if (!chain) {
        const errorMessage = `i cannot get the hlqt token id if there is no chain. please connect to a chain first.`;
        console.error(errorMessage, "context:", { chain });
        throw new Error(errorMessage);
      }

      await associateWithToken({ tokenAddress: chain.hlqtTokenId });
    }
  );
  // hchf spender approval
  const needsSpenderApproval = stableTroveChange?.params.repayHCHF;
  const { call: approveHchfSpender, state: hchfApprovalLoadingState } = useLoadingState(async () => {
    if (!stableTroveChange?.params.repayHCHF) {
      throw "cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0";
    }

    if (!chain) {
      const errorMessage = `i cannot get the hchf token id if there is no chain. please connect to a chain first.`;
      console.error(errorMessage, "context:", { chain });
      throw new Error(errorMessage);
    }

    const contractAddress = addresses.hchfToken as `0x${string}`;
    const tokenAddress = chain.hchfTokenId;
    const amount = BigNumber.from(stableTroveChange.params.repayHCHF.bigNumber);

    await approveSpender({
      contractAddress,
      tokenAddress,
      amount
    });
  });

  if (trove.status !== "open") {
    return null;
  }

  const transactionSteps: Step[] = [];
  if (needsHchfAssociation) {
    transactionSteps.push({
      title: "Associate with HCHF",
      status: hasAssociatedWithHchf
        ? "success"
        : hchfAssociationLoadingState === "error"
        ? "danger"
        : hchfAssociationLoadingState,
      description: hasAssociatedWithHchf
        ? "You've already consented to receiving HCHF."
        : "You have to consent to receiving HCHF tokens before you can use HLiquity."
    });
  }
  if (needsSpenderApproval) {
    transactionSteps.push({
      title: "Approve HCHF spender",
      status: hchfApprovalLoadingState === "error" ? "danger" : hchfApprovalLoadingState,
      description: "You have to consent to the HCHF contract spending your HCHF tokens."
    });
  }
  transactionSteps.push({
    title: "Adjust your trove",
    status: isTransactionPending ? "pending" : "idle"
  });

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
          amount={collateral.prettify(4)}
          maxAmount={maxCollateral.toString()}
          maxedOut={collateralMaxedOut}
          editingState={editingState}
          unit={COLLATERAL_COIN}
          editedAmount={collateral.toString(4)}
          setEditedAmount={(amount: string) => setCollateral(Decimal.from(amount))}
        />

        <EditableRow
          label="Net debt"
          inputId="trove-net-debt-amount"
          amount={netDebt.prettify()}
          unit={COIN}
          editingState={editingState}
          editedAmount={netDebt.toString(2)}
          setEditedAmount={(amount: string) => setNetDebt(Decimal.from(amount))}
        />

        <StaticRow
          label="Liquidation Reserve"
          inputId="trove-liquidation-reserve"
          amount={`${HCHF_LIQUIDATION_RESERVE}`}
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
                      You will need to repay {totalDebt.sub(HCHF_LIQUIDATION_RESERVE).prettify(2)}{" "}
                      HCHF to reclaim your collateral ({HCHF_LIQUIDATION_RESERVE.toString()} HCHF
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

          {needsHchfAssociation && !hasAssociatedWithHchf ? (
            <LoadingButton
              disabled={!stableTroveChange}
              loading={hchfAssociationLoadingState === "pending"}
              onClick={associateWithHchf}
            >
              Consent to receiving HCHF
            </LoadingButton>
          ) : needsSpenderApproval && hchfApprovalLoadingState !== "success" ? (
            <LoadingButton
              disabled={!stableTroveChange}
              loading={hchfApprovalLoadingState === "pending"}
              onClick={approveHchfSpender}
            >
              Consent to spending {stableTroveChange?.params.repayHCHF?.toString(2)} HCHF
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
                ? `Borrow ${stableTroveChange?.params.borrowHCHF?.toString(2)} HCHF`
                : `Repay ${stableTroveChange?.params.repayHCHF?.toString(2)} HCHF`}
            </TroveAction>
          ) : (
            <Button disabled>Confirm</Button>
          )}
        </Flex>
      </Box>
    </Card>
  );
};
