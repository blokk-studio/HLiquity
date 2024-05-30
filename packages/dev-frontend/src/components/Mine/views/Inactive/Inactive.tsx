import React, { useCallback } from "react";
import { Card, Heading, Box, Flex, Button } from "theme-ui";
import { useMineView } from "../../context/MineViewContext";
import { StaticRow } from "../../../Trove/Editor";
import { useLiquitySelector } from "@liquity/lib-react";
import { LiquityStoreState } from "@liquity/lib-base";
import { InfoMessage } from "../../../InfoMessage";
import { LP } from "../../../../strings";

const select = ({ liquidityMiningHLQTReward, liquidityMiningStake }: LiquityStoreState) => ({
  liquidityMiningHLQTReward,
  liquidityMiningStake
});

export const Inactive: React.FC = () => {
  const { dispatchEvent } = useMineView();

  const handleStakePressed = useCallback(() => {
    dispatchEvent("STAKE_PRESSED");
  }, [dispatchEvent]);

  const { liquidityMiningHLQTReward, liquidityMiningStake } = useLiquitySelector(select);

  return (
    <Card>
      <Heading>SaucerSwap LP Staking</Heading>
      <Box sx={{ p: [2, 3] }}>
        <InfoMessage title={`You haven't staked ${LP} yet.`}></InfoMessage>
        <StaticRow
          label="Staked"
          inputId="deposit-share"
          amount={liquidityMiningStake.prettify()}
          unit="LP"
        />
        <StaticRow
          label="Reward Per Token"
          inputId="deposit-share"
          amount={liquidityMiningHLQTReward.prettify()}
          unit=""
        />
        <Flex variant="layout.actions">
          <Button onClick={handleStakePressed}>Start staking</Button>
        </Flex>
      </Box>
    </Card>
  );
};
