import React, { useEffect } from "react";
import { Button } from "theme-ui";
import { Decimal } from "@liquity/lib-base";
import { useLiquity } from "../../../hooks/LiquityContext";
import { Transaction, useMyTransactionState } from "../../Transaction";
import { useValidationState } from "../context/useValidationState";
import { useMineView } from "../context/MineViewContext";
import { LP } from "../../../strings";
import { useLiquitySelector } from "@liquity/lib-react";

type ConfirmProps = {
  amount: Decimal;
};

const transactionId = "mine-confirm";

export const Confirm: React.FC<ConfirmProps> = ({ amount }) => {
  const { dispatchEvent } = useMineView();
  const {
    liquity: { send: liquity }
  } = useLiquity();

  const { userHasAssociatedWithLpToken } = useLiquitySelector(state => state);

  const transactionState = useMyTransactionState(transactionId);
  const { isValid, isWithdrawing, amountChanged, hasApproved } = useValidationState(amount);

  const transactionAction = isWithdrawing
    ? liquity.unstakeUniTokens.bind(liquity, amountChanged)
    : liquity.stakeUniTokens.bind(liquity, amountChanged);

  const shouldDisable = amountChanged.isZero || !isValid;

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot") {
      dispatchEvent("STAKE_CONFIRMED");
    }
  }, [transactionState.type, dispatchEvent]);

  return (
    <>
      {userHasAssociatedWithLpToken && hasApproved && (
        <Transaction
          id={transactionId}
          send={transactionAction}
          showFailure="asTooltip"
          tooltipPlacement="bottom"
        >
          <Button disabled={shouldDisable}>
            {isWithdrawing ? "Unstake" : "Stake"} {amountChanged.prettify(2)} {LP}
          </Button>
        </Transaction>
      )}
    </>
  );
};
