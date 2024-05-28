import React, { useEffect } from "react";
// import { Button } from "theme-ui";
import { Decimal } from "@liquity/lib-base";
import { useLiquity } from "../../../hooks/LiquityContext";
import { useMyTransactionState } from "../../Transaction";
import { useMineView } from "../context/MineViewContext";
import { useValidationState } from "../context/useValidationState";
// import { useDeployment } from "../../../configuration/deployments";
// import { useHedera } from "../../../hedera/hedera_context";
// import { BigNumber } from "ethers";
import { LoadingButton } from "../../LoadingButton";
import { useLoadingState } from "../../../loading_state";
// import { useLoadingState } from "../../../loading_state";
// import { useHedera } from "../../../hedera/hedera_context";
// import { LoadingButton } from "../../LoadingButton";
// import { BigNumber } from "ethers";
import { useLiquitySelector } from "@liquity/lib-react";

type ApproveProps = {
  amount: Decimal;
};

const transactionId = "mine-approve";

export const Approve: React.FC<ApproveProps> = ({ amount }) => {
  const { dispatchEvent } = useMineView();
  const {
    liquity,
    store
  } = useLiquity();
  const { userHasAssociatedWithLpToken } = useLiquitySelector(state => state);

  const { hasApproved } = useValidationState(amount);
  const transactionState = useMyTransactionState(transactionId);
  // const { approveSpender } = useHedera();
  // const deployment = useDeployment();

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot") {
      dispatchEvent("STAKE_APPROVED");
    }
  }, [transactionState.type, dispatchEvent]);

  // console.log(amount, hasApproved);
  // LP token association
  const { call: associateWithLP, state: LPAssociationLoadingState } = useLoadingState(
    async () => {
      await liquity.associateWithLpToken().then(() => {
        store.refresh();
      });;
    }
  );

  const { call: approveLPSpender, state: LPApprovalLoadingState } = useLoadingState(async () => {
    if (!amount) {
      throw "cannot approve a withdrawal (negative spending/negative deposit) or deposit of 0";
    }

    const amnt = amount;

    await liquity.approveSaucerSwapToSpendLpToken(amnt).then(() => {
      store.refresh();
    });
  });

  if (hasApproved) {
    return null;
  }
  // console.log('approve', amount, hasApproved, !amount || hasApproved || !hasAssociatedWithLP)

  return (
    <>
      <LoadingButton
        disabled={!amount || hasApproved}
        loading={LPAssociationLoadingState === "pending"}
        onClick={associateWithLP}
      >
        Assoc. {amount.prettify()} LP
      </LoadingButton>
      <LoadingButton
        disabled={!amount || hasApproved || !userHasAssociatedWithLpToken}
        loading={LPApprovalLoadingState === "pending"}
        onClick={approveLPSpender}
      >
        Approve {amount.prettify()} LP
      </LoadingButton>
    </>
  );
};
