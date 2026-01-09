import { Heading, Box, Card, Flex, Button, Paragraph } from "theme-ui";

import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, COLLATERAL_COIN, GT } from "../../strings";

import { DisabledEditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";

import { useStakingView } from "./context/StakingViewContext";
import { StakingGainsAction } from "./StakingGainsAction";
import buttons from "../../styles/buttons.module.css";
import React from "react";
import { HeadingWithChildren } from "../shared";
import { Icon } from "../Icon.tsx";

const select = ({ hlqtStake, totalStakedHLQT }: LiquityStoreState) => ({
  hlqtStake,
  totalStakedHLQT
});

export const ReadOnlyStake: React.FC = () => {
  const { changePending, dispatch } = useStakingView();
  const { hlqtStake, totalStakedHLQT } = useLiquitySelector(select);

  const poolShare = hlqtStake.stakedHLQT.mulDiv(100, totalStakedHLQT);

  return (
    <div>
      <HeadingWithChildren isSmall text="Lock HLQT to earn rewards" />

      <DisabledEditableRow
        label="Stake"
        inputId="stake-lqty"
        amount={hlqtStake.stakedHLQT.prettify()}
        unit={GT}
      />

      <StaticRow
        label="Pool share"
        inputId="stake-share"
        amount={poolShare.prettify(4)}
        unit="%"
      />

      <StaticRow
        label="Redemption gain"
        inputId="stake-gain-eth"
        amount={hlqtStake.collateralGain.prettify(6)}
        color={hlqtStake.collateralGain.nonZero && "success"}
        unit={COLLATERAL_COIN}
      />

      <StaticRow
        label="Issuance gain"
        inputId="stake-gain-lusd"
        amount={hlqtStake.hchfGain.prettify(4)}
        color={hlqtStake.hchfGain.nonZero && "success"}
        unit={COIN}
      />

      <Flex variant="layout.actions">
        <button
          className={buttons.normal}
          onClick={() => dispatch({ type: "startAdjusting" })}
        >
          <Flex sx={{alignItems: "center", gap: 2}}>
            <Icon name="pen" size="sm" />

            <span>Adjust</span>
          </Flex>
        </button>

        <StakingGainsAction />
      </Flex>

      {changePending && <LoadingOverlay />}
    </div>
  );
};
