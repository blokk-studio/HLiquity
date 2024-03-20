import React from "react";

import { Decimal, StabilityDeposit, StabilityDepositChange } from "@liquity/lib-base";

import { COIN, COLLATERAL_COIN, GT } from "../../strings";
import { ActionDescription, Amount } from "../ActionDescription";

type StabilityActionDescriptionProps = {
  originalDeposit: StabilityDeposit;
  change: StabilityDepositChange<Decimal>;
};

export const StabilityActionDescription: React.FC<StabilityActionDescriptionProps> = ({
  originalDeposit,
  change
}) => {
  const collateralGain = originalDeposit.collateralGain.nonZero?.prettify(4).concat(` ${COLLATERAL_COIN}`);
  const hlqtyReward = originalDeposit.hlqtyReward.nonZero?.prettify().concat(" ", GT);

  return (
    <ActionDescription>
      {change.depositHCHF ? (
        <>
          You are depositing{" "}
          <Amount>
            {change.depositHCHF.prettify()} {COIN}
          </Amount>{" "}
          in the Stability Pool
        </>
      ) : (
        <>
          You are withdrawing{" "}
          <Amount>
            {change.withdrawHCHF.prettify()} {COIN}
          </Amount>{" "}
          to your wallet
        </>
      )}
      {(collateralGain || hlqtyReward) && (
        <>
          {" "}
          and claiming at least{" "}
          {collateralGain && hlqtyReward ? (
            <>
              <Amount>{collateralGain}</Amount> and <Amount>{hlqtyReward}</Amount>
            </>
          ) : (
            <Amount>{collateralGain ?? hlqtyReward}</Amount>
          )}
        </>
      )}
      .
    </ActionDescription>
  );
};
