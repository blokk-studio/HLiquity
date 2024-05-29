import React, { useEffect } from "react";
// import { Button } from "theme-ui";
import { Decimal } from "@liquity/lib-base";
import { useLiquity } from "../../../hooks/LiquityContext";
import { useMyTransactionState } from "../../Transaction";
import { useMineView } from "../context/MineViewContext";
import { useValidationState } from "../context/useValidationState";
import { LoadingButton } from "../../LoadingButton";
import { useLoadingState } from "../../../loading_state";
import { LP } from "../../../strings";
import { useLiquitySelector } from "@liquity/lib-react";

type ApproveProps = {
  amount: Decimal;
};

const transactionId = "mine-approve";

export const Approve: React.FC<ApproveProps> = ({ amount }) => {
  const { dispatchEvent } = useMineView();
  const { hasApproved } = useValidationState(amount);
  const transactionState = useMyTransactionState(transactionId);

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot") {
      dispatchEvent("STAKE_APPROVED");
    }
  }, [transactionState.type, dispatchEvent]);

  const { liquity } = useLiquity();
  const { userHasAssociatedWithLpToken } = useLiquitySelector(state => state);
  // LP token association
  const { call: associateWithLP, state: LPAssociationLoadingState } = useLoadingState(async () => {
    await liquity.associateWithLpToken();
  });

  const { call: approveLPSpender, state: LPApprovalLoadingState } = useLoadingState(async () => {
    if (!amount) {
      throw "cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0";
    }

    await liquity.approveSaucerSwapToSpendLpToken(amount);
  });

  if (hasApproved && userHasAssociatedWithLpToken) {
    return null;
  }
  // console.log('approve', amount, hasApproved, !amount || hasApproved || !hasAssociatedWithLP)

  return (
    <>
      {!userHasAssociatedWithLpToken && (
        <LoadingButton
          disabled={!amount}
          loading={LPAssociationLoadingState === "pending"}
          onClick={associateWithLP}
        >
          Approve spending {amount.prettify(2)} {LP}
        </LoadingButton>
      )}
      {!hasApproved && userHasAssociatedWithLpToken && (
        <LoadingButton
          disabled={!amount}
          loading={LPApprovalLoadingState === "pending"}
          onClick={approveLPSpender}
        >
          Approve spending {amount.prettify(2)} {LP}
        </LoadingButton>
      )}
    </>
  );
};
