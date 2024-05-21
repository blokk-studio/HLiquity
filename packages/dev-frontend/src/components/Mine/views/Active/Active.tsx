import React, { useCallback } from "react";
import { Card, Heading, Box, Flex, Button } from "theme-ui";
import { LP, GT } from "../../../../strings";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { Icon } from "../../../Icon";
import { LoadingOverlay } from "../../../LoadingOverlay";
import { useMyTransactionState } from "../../../Transaction";
import { DisabledEditableRow, StaticRow } from "../../../Trove/Editor";
import { useMineView } from "../../context/MineViewContext";
import { RemainingLQTY } from "../RemainingLQTY";
import { ClaimReward } from "./ClaimReward";
import { UnstakeAndClaim } from "../UnstakeAndClaim";

const selector = ({ liquidityMiningStake, liquidityMiningHLQTReward }: LiquityStoreState) => ({
  liquidityMiningStake,
  liquidityMiningHLQTReward
});
const transactionId = /mine-/i;

export const Active: React.FC = () => {
  const { dispatchEvent } = useMineView();
  const { liquidityMiningStake, liquidityMiningHLQTReward } = useLiquitySelector(selector);

  const handleAdjustPressed = useCallback(() => {
    dispatchEvent("ADJUST_PRESSED");
  }, [dispatchEvent]);

  const transactionState = useMyTransactionState(transactionId);
  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  return (
    <Card>
      <Heading>
        Liquidity mine
        {!isTransactionPending && (
          <Flex sx={{ justifyContent: "flex-end" }}>
            <RemainingLQTY />
          </Flex>
        )}
      </Heading>
      <Box sx={{ p: [2, 3] }}>
        <Box>
          <DisabledEditableRow
            label="Stake"
            inputId="mine-stake"
            amount={liquidityMiningStake.prettify(4)}
            unit={LP}
          />
          <StaticRow
            label="Reward"
            inputId="mine-reward"
            amount={liquidityMiningHLQTReward.prettify(4)}
            color={liquidityMiningHLQTReward.nonZero && "success"}
            unit={GT}
          />
        </Box>

        <Flex variant="layout.actions">
          <Button variant="outline" onClick={handleAdjustPressed}>
            <Icon name="pen" size="sm" />
            &nbsp;Adjust
          </Button>
          <ClaimReward />
        </Flex>
        <Flex>
          <UnstakeAndClaim />
        </Flex>
      </Box>
      {isTransactionPending && <LoadingOverlay />}
    </Card>
  );
};
