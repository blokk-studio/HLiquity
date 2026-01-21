import React, { useCallback, useEffect } from "react";
import { Card, Box, Flex, Grid } from "theme-ui";

import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, COLLATERAL_COIN, GT } from "../../strings";
import { Icon } from "../Icon";
import { LoadingOverlay } from "../LoadingOverlay";
import { useMyTransactionState } from "../Transaction";
import { DisabledEditableRow, StaticRow } from "../Trove/Editor";
import { ClaimRewards } from "./actions/ClaimRewards";
import { useStabilityView } from "./context/StabilityViewContext";
import { RemainingLQTY } from "./RemainingLQTY";
import { Yield } from "./Yield";
import { InfoIcon } from "../InfoIcon";
import { HeadingWithChildren } from "../shared";

import buttons from "../../styles/buttons.module.css";

const selector = ({ stabilityDeposit, hchfInStabilityPool }: LiquityStoreState) => ({
  stabilityDeposit,
  hchfInStabilityPool
});

export const ActiveDeposit: React.FC = () => {
  const { dispatchEvent } = useStabilityView();
  const { stabilityDeposit, hchfInStabilityPool } = useLiquitySelector(selector);

  const poolShare = stabilityDeposit.currentHCHF.mulDiv(100, hchfInStabilityPool);

  const handleAdjustDeposit = useCallback(() => {
    dispatchEvent("ADJUST_DEPOSIT_PRESSED");
  }, [dispatchEvent]);

  const transactionId = "stability-deposit";
  const transactionState = useMyTransactionState(transactionId);
  const isWaitingForTransaction =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot") {
      dispatchEvent("REWARDS_CLAIMED");
    }
  }, [transactionState.type, dispatchEvent]);

  return (
    <div>
      <HeadingWithChildren text="Stability Pool">
        {!isWaitingForTransaction && (
          <Flex sx={{ justifyContent: "flex-end" }}>
            <RemainingLQTY />
          </Flex>
        )}
      </HeadingWithChildren>


      <Box>
        <DisabledEditableRow
          label="Deposit"
          inputId="deposit-hchf"
          amount={stabilityDeposit.currentHCHF.prettify()}
          unit={COIN}
        />

        <Grid mb={3} pt={3} bg="#f2f2f2" sx={{ gridTemplateColumns: ["1fr", "1fr", "1fr", "1fr 1fr 1fr"] }} gap={16}>
          <StaticRow
            label="Pool share"
            inputId="deposit-share"
            amount={poolShare.prettify(4)}
            unit="%"
          />

          <StaticRow
            label="Liquidation gain"
            inputId="deposit-gain"
            amount={stabilityDeposit.collateralGain.prettify(4)}
            color={stabilityDeposit.collateralGain.nonZero && "success"}
            unit={COLLATERAL_COIN}
          />

          <StaticRow
            label="Reward"
            inputId="deposit-reward"
            amount={stabilityDeposit.hlqtReward.prettify()}
            color={stabilityDeposit.hlqtReward.nonZero && "success"}
            unit={GT}
            infoIcon={
              <InfoIcon
                tooltip={
                  <Card variant="tooltip" sx={{ width: "240px" }}>
                    Although the HLQT rewards accrue every minute, the value on the UI only updates
                    when a user transacts with the Stability Pool. Therefore you may receive more
                    rewards than is displayed when you claim or adjust your deposit.
                  </Card>
                }
              />
            }
          />
        </Grid>

        <Flex mb={4}>
          <Yield />
        </Flex>
      </Box>

      <Flex variant="layout.actions">
        <button className={buttons.normal} onClick={handleAdjustDeposit}>
          <Flex sx={{ alignItems: "center", gap: 2 }}>
            <Icon name="pen" size="sm" />

            Adjust
          </Flex>
        </button>

        <ClaimRewards>
          Claim {COLLATERAL_COIN} and {GT}
        </ClaimRewards>
      </Flex>

      {isWaitingForTransaction && <LoadingOverlay />}
    </div>
  );
};
