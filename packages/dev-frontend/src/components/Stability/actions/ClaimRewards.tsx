import React from "react";
import { Button } from "theme-ui";

import { useLiquity } from "../../../hooks/LiquityContext";
import { useTxFunction } from "../../Transaction";

type ClaimRewardsProps = {
  disabled?: boolean;
};

export const ClaimRewards: React.FC<React.PropsWithChildren<ClaimRewardsProps>> = ({ disabled, children }) => {
  const { liquity } = useLiquity();

  const [sendTransaction] = useTxFunction(
    "stability-deposit",
    liquity.send.withdrawGainsFromStabilityPool.bind(liquity.send)
  );

  return (
    <Button onClick={sendTransaction} disabled={disabled}>
      {children}
    </Button>
  );
};
