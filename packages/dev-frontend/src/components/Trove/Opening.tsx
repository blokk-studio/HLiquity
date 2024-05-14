import React, { useCallback, useEffect, useState } from "react";
import { Flex, Button, Box, Card, Heading, Spinner } from "theme-ui";
import {
  LiquityStoreState,
  Decimal,
  Trove,
  HCHF_LIQUIDATION_RESERVE,
  HCHF_MINIMUM_NET_DEBT,
  Percent
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
import { useHedera } from "../../hedera/hedera_context";
import { Step, Steps } from "../Steps";
import { useLoadingState } from "../../loading_state";
import { useDeployment } from "../../configuration/deployments";

const selector = (state: LiquityStoreState) => {
  const { fees, price, accountBalance } = state;
  return {
    fees,
    price,
    accountBalance,
    validationContext: selectForTroveChangeValidation(state)
  };
};

const EMPTY_TROVE = new Trove(Decimal.ZERO, Decimal.ZERO);
const TRANSACTION_ID = "trove-creation";
const TX_MAX_COSTS = Decimal.from(40);

export const Opening: React.FC = () => {
  const { dispatchEvent } = useTroveView();
  const { fees, price, accountBalance, validationContext } = useLiquitySelector(selector);
  const borrowingRate = fees.borrowingRate();
  const editingState = useState<string>();

  const [collateral, setCollateral] = useState<Decimal>(Decimal.ZERO);
  const [borrowAmount, setBorrowAmount] = useState<Decimal>(Decimal.ZERO);

  const maxBorrowingRate = borrowingRate.add(0.005);

  const fee = borrowAmount.mul(borrowingRate);
  const feePct = new Percent(borrowingRate);
  const totalDebt = borrowAmount.add(HCHF_LIQUIDATION_RESERVE).add(fee);
  const isDirty = !collateral.isZero || !borrowAmount.isZero;
  const trove = isDirty ? new Trove(collateral, totalDebt) : EMPTY_TROVE;
  const maxCollateral = accountBalance.gt(accountBalance.sub(TX_MAX_COSTS))
    ? accountBalance.sub(TX_MAX_COSTS)
    : Decimal.ZERO;
  const collateralMaxedOut = collateral.eq(maxCollateral);
  const collateralRatio =
    !collateral.isZero && !borrowAmount.isZero ? trove.collateralRatio(price) : undefined;

  const [troveChange, description] = validateTroveChange(
    EMPTY_TROVE,
    trove,
    borrowingRate,
    validationContext
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
      setBorrowAmount(HCHF_MINIMUM_NET_DEBT);
    }
  }, [collateral, borrowAmount]);

  // consent & approval
  const deployment = useDeployment();
  const { hasAssociatedWithHchf, associateWithToken } = useHedera();
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
  const steps: Step[] = [
    {
      title: "Associate with HCHF",
      status: hasAssociatedWithHchf
        ? "success"
        : hchfAssociationLoadingState === "error"
          ? "danger"
          : hchfAssociationLoadingState,
      description: hasAssociatedWithHchf
        ? "You've already consented to receiving HCHF."
        : "You have to consent to receiving HCHF tokens before you can use HLiquity."
    },
    {
      title: "Open the trove",
      status: isTransactionPending ? "pending" : "idle"
    }
  ];

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
          setEditedAmount={(amount: string) => setCollateral(Decimal.from(amount))}
        />

        <EditableRow
          label="Borrow"
          inputId="trove-borrow-amount"
          amount={borrowAmount.prettify()}
          unit={COIN}
          editingState={editingState}
          editedAmount={borrowAmount.toString(2)}
          setEditedAmount={(amount: string) => setBorrowAmount(Decimal.from(amount))}
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

        <Flex variant="layout.actions">
          <Button variant="cancel" onClick={handleCancelPressed}>
            Cancel
          </Button>

          {gasEstimationState.type === "inProgress" ? (
            <Button disabled>
              <Spinner size="24px" sx={{ color: "background" }} />
            </Button>
          ) : !hasAssociatedWithHchf ? (
            <Button
              onClick={associateWithHchf}
              disabled={!stableTroveChange || hchfAssociationLoadingState === "pending"}
              sx={{ gap: "1rem" }}
            >
              Consent to receiving HCHF
              {hchfAssociationLoadingState === "pending" && (
                <Spinner size="1rem" color="currentColor" />
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
      </Box>
    </Card>
  );
};
