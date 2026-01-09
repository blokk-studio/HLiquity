import React from "react";

import { useLiquity } from "../../../hooks/LiquityContext";
import { useTxFunction } from "../../Transaction";
import buttons from "../../../styles/buttons.module.css";


type ClaimRewardsProps = {
  disabled?: boolean;
};

export const ClaimRewards: React.FC<React.PropsWithChildren<ClaimRewardsProps>> = ({
  disabled,
  children
}) => {
  const { liquity } = useLiquity();

  const [sendTransaction] = useTxFunction(
    "stability-deposit",
    liquity.send.withdrawGainsFromStabilityPool.bind(liquity.send)
  );

  return (
    <button className={buttons.normal} onClick={sendTransaction} disabled={disabled}>
      {children}
    </button>
  );
};
