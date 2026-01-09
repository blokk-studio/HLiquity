import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTxFunction } from "../Transaction";
import buttons from "../../styles/buttons.module.css";
import React from "react";

const selectLQTYStake = ({ hlqtStake }: LiquityStoreState) => hlqtStake;

export const StakingGainsAction: React.FC = () => {
  const { liquity } = useLiquity();
  const { collateralGain, hchfGain } = useLiquitySelector(selectLQTYStake);

  const [sendTransaction] = useTxFunction(
    "stake",
    liquity.send.withdrawGainsFromStaking.bind(liquity.send)
  );

  return (
    <button
      className={buttons.normal}
      onClick={sendTransaction} disabled={collateralGain.isZero && hchfGain.isZero}
    >

      <span>Claim gains</span>
    </button>
  );
};
