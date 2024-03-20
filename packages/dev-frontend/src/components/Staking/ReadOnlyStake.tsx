import { Heading, Box, Card, Flex, Button } from "theme-ui";

import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, COLLATERAL_COIN, GT } from "../../strings";

import { DisabledEditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";
import { Icon } from "../Icon";

import { useStakingView } from "./context/StakingViewContext";
import { StakingGainsAction } from "./StakingGainsAction";

const select = ({ hlqtyStake, totalStakedHLQTY }: LiquityStoreState) => ({
  hlqtyStake,
  totalStakedHLQTY
});

export const ReadOnlyStake: React.FC = () => {
  const { changePending, dispatch } = useStakingView();
  const { hlqtyStake, totalStakedHLQTY } = useLiquitySelector(select);

  const poolShare = hlqtyStake.stakedHLQTY.mulDiv(100, totalStakedHLQTY);

  return (
    <Card>
      <Heading>Staking</Heading>

      <Box sx={{ p: [2, 3] }}>
        <DisabledEditableRow
          label="Stake"
          inputId="stake-lqty"
          amount={hlqtyStake.stakedHLQTY.prettify()}
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
          amount={hlqtyStake.collateralGain.prettify(4)}
          color={hlqtyStake.collateralGain.nonZero && "success"}
          unit={COLLATERAL_COIN}
        />

        <StaticRow
          label="Issuance gain"
          inputId="stake-gain-lusd"
          amount={hlqtyStake.hchfGain.prettify()}
          color={hlqtyStake.hchfGain.nonZero && "success"}
          unit={COIN}
        />

        <Flex variant="layout.actions">
          <Button variant="outline" onClick={() => dispatch({ type: "startAdjusting" })}>
            <Icon name="pen" size="sm" />
            &nbsp;Adjust
          </Button>

          <StakingGainsAction />
        </Flex>
      </Box>

      {changePending && <LoadingOverlay />}
    </Card>
  );
};
