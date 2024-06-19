import React from "react";
import { Card, Heading, Box } from "theme-ui";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { StaticRow } from "../../../Trove/Editor";
import { GT, LP } from "../../../../strings";

const selector = ({ liquidityMiningStake, liquidityMiningHLQTReward, totalStakedUniTokens }: LiquityStoreState) => ({
  liquidityMiningStake,
  liquidityMiningHLQTReward,
  totalStakedUniTokens
});

export const Disabled: React.FC = () => {
  const { liquidityMiningStake, liquidityMiningHLQTReward, totalStakedUniTokens } = useLiquitySelector(selector);
  const hasStake = !liquidityMiningStake.isZero;
  const poolShare = liquidityMiningStake.mulDiv(100, totalStakedUniTokens);

  return (
    <Card>
      <Heading>
        SaucerSwap HBAR/HCHF-LP Staking
      </Heading>
      <Box sx={{ p: [2, 3] }}>
        {hasStake && (
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
          </>
        )}
      </Box>
    </Card>
  );
};
