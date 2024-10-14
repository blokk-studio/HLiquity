import React from "react";
import { Card, Heading, Box, Link, Flex, Paragraph } from "theme-ui";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { StaticRow } from "../../../Trove/Editor";
import { GT, LP } from "../../../../strings";
import { ClaimReward } from "../Active/ClaimReward";

const selector = ({
  liquidityMiningStake,
  liquidityMiningHLQTReward,
  totalStakedUniTokens
}: LiquityStoreState) => ({
  liquidityMiningStake,
  liquidityMiningHLQTReward,
  totalStakedUniTokens
});

export const Disabled: React.FC = () => {
  const { liquidityMiningStake, liquidityMiningHLQTReward, totalStakedUniTokens } =
    useLiquitySelector(selector);
  const hasStake = !liquidityMiningStake.isZero;
  const poolShare = liquidityMiningStake.mulDiv(100, totalStakedUniTokens);

  return (
    <Card>
      <Heading>SaucerSwap HBAR/HCHF-LP Staking</Heading>
      <Box sx={{ p: [2, 3] }}>
        {hasStake ? (
          <>
            <Box sx={{ border: 1, pt: 3, borderRadius: 3 }}>
              <StaticRow
                label="Stake"
                inputId="mine-deposit"
                amount={liquidityMiningStake.prettify()}
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

            <Flex variant="layout.actions">
              <ClaimReward />
            </Flex>
          </>
        ) : (
          <Paragraph>
            The SaucerSwap HLQT Token distribution has stopped 18 weeks after launch. You can still
            claim rewards from your active stake, but won't be able to stake anymore.{" "}
            <Link
              href="https://docs.hliquity.org/fundamentals/hlqt-tokenomics#community-40"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "info" }}
            >
              More on HLQT tokenomics.
            </Link>
          </Paragraph>
        )}
      </Box>
    </Card>
  );
};
