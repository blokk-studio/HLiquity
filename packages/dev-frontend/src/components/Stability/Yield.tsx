import React, { useEffect, useState } from "react";
import { Card, Paragraph, Text } from "theme-ui";
import { Decimal, LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { InfoIcon } from "../InfoIcon";
import { Badge } from "../Badge";
import { fetchHlqtPrice } from "./context/fetchHlqtPrice";
import { COIN, COLLATERAL_COIN, GT } from "../../strings";

const selector = ({ hchfInStabilityPool, remainingStabilityPoolHLQTYReward }: LiquityStoreState) => ({
  hchfInStabilityPool,
  remainingStabilityPoolHLQTYReward
});

const yearlyIssuanceFraction = 0.5;
const dailyIssuanceFraction = Decimal.from(1 - yearlyIssuanceFraction ** (1 / 365));
const dailyIssuancePercentage = dailyIssuanceFraction.mul(100);

export const Yield: React.FC = () => {
  const { hchfInStabilityPool, remainingStabilityPoolHLQTYReward } = useLiquitySelector(selector);

  const [hlqtPrice, setHlqtPrice] = useState<Decimal | undefined>(undefined);
  const hasZeroValue = remainingStabilityPoolHLQTYReward?.isZero || hchfInStabilityPool?.isZero || true;

  useEffect(() => {
    (async () => {
      try {
        const { hlqtPriceCHF: hlqtPriceCHF } = await fetchHlqtPrice();
        setHlqtPrice(hlqtPriceCHF);
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  if (hasZeroValue || hlqtPrice === undefined) return null;

  const lqtyIssuanceOneDay = remainingStabilityPoolHLQTYReward.mul(dailyIssuanceFraction);
  const lqtyIssuanceOneDayInUSD = lqtyIssuanceOneDay.mul(hlqtPrice);
  const aprPercentage = lqtyIssuanceOneDayInUSD.mulDiv(365 * 100, hchfInStabilityPool);
  const remainingHlqtInCHF = remainingStabilityPoolHLQTYReward.mul(hlqtPrice);

  if (aprPercentage.isZero) return null;

  return (
    <Badge>
      <Text>HLQT APR {aprPercentage.toString(2)}%</Text>
      <InfoIcon
        tooltip={
          <Card variant="tooltip" sx={{ width: ["220px", "518px"] }}>
            <Paragraph>
              An <Text sx={{ fontWeight: "bold" }}>estimate</Text> of the {GT} return on the {COIN}
              deposited to the Stability Pool over the next year, not including your {COLLATERAL_COIN} gains from
              liquidations.
            </Paragraph>
            <Paragraph sx={{ fontSize: "12px", fontFamily: "monospace", mt: 2 }}>
              (CHF {GT}_REWARDS * DAILY_ISSUANCE% / DEPOSITED_{COIN}) * 365 * 100 ={" "}
              <Text sx={{ fontWeight: "bold" }}> APR</Text>
            </Paragraph>
            <Paragraph sx={{ fontSize: "12px", fontFamily: "monospace" }}>
              (CHF
              {remainingHlqtInCHF.shorten()} * {dailyIssuancePercentage.toString(4)}% / CHF
              {hchfInStabilityPool.shorten()}) * 365 * 100 =
              <Text sx={{ fontWeight: "bold" }}> {aprPercentage.toString(2)}%</Text>
            </Paragraph>
          </Card>
        }
      ></InfoIcon>
    </Badge>
  );
};
