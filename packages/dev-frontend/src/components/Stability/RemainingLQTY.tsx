import React from "react";
import { Flex } from "theme-ui";

import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

const selector = ({ remainingStabilityPoolHLQTYReward }: LiquityStoreState) => ({
  remainingStabilityPoolHLQTYReward
});

export const RemainingLQTY: React.FC = () => {
  const { remainingStabilityPoolHLQTYReward } = useLiquitySelector(selector);

  return (
    <Flex sx={{ mr: 2, fontSize: 2, fontWeight: "medium" }}>
      {remainingStabilityPoolHLQTYReward?.prettify(0)} HLQT remaining
    </Flex>
  );
};
