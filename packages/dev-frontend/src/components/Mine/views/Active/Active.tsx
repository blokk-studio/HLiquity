import React, { useCallback } from "react";
import { Card, Heading, Box, Flex, Button, Text, Link } from "theme-ui";
import { LP, GT } from "../../../../strings";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { Icon } from "../../../Icon";
import { DisabledEditableRow, StaticRow } from "../../../Trove/Editor";
import { useMineView } from "../../context/MineViewContext";
import { ClaimReward } from "./ClaimReward";
import { ActionDescription } from "../../../ActionDescription";

const selector = ({
  liquidityMiningStake,
  liquidityMiningHLQTReward,
  totalStakedUniTokens
}: LiquityStoreState) => ({
  liquidityMiningStake,
  liquidityMiningHLQTReward,
  totalStakedUniTokens
});

export const Active: React.FC = () => {
  const { dispatchEvent } = useMineView();
  const { liquidityMiningStake, liquidityMiningHLQTReward, totalStakedUniTokens } =
    useLiquitySelector(selector);

  const handleAdjustPressed = useCallback(() => {
    dispatchEvent("ADJUST_PRESSED");
  }, [dispatchEvent]);

  const poolShare = liquidityMiningStake.mulDiv(100, totalStakedUniTokens);

  return (
    <Card>
      <Heading>SaucerSwap HBAR/HCHF-LP Staking</Heading>
      <Box sx={{ p: [2, 3] }}>
        <Box>
          <DisabledEditableRow
            label="Stake"
            inputId="mine-stake"
            amount={liquidityMiningStake.prettify(4)}
            unit={LP}
          />
          <StaticRow
            label="Pool share"
            inputId="deposit-share"
            amount={poolShare.prettify(4)}
            unit="%"
          />
          <StaticRow
            label="Reward"
            inputId="mine-reward"
            amount={liquidityMiningHLQTReward.prettify()}
            color={liquidityMiningHLQTReward.nonZero && "success"}
            unit={GT}
          />
        </Box>

        <ActionDescription>
          <Text>
            Deposit your tokens into the{" "}
            <Link
              sx={{ textDecoration: "underline" }}
              target="_blank"
              href="https://www.saucerswap.finance/liquidity/0.0.6070468"
            >
              HBAR/HCHF liquidity pool
            </Link>
          </Text>
        </ActionDescription>

        <Flex variant="layout.actions">
          <Button variant="outline" onClick={handleAdjustPressed}>
            <Icon name="pen" size="sm" />
            &nbsp;Adjust
          </Button>
          <ClaimReward />
        </Flex>
      </Box>
    </Card>
  );
};
