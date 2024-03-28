import React from "react";
import { Heading, Box, Card } from "theme-ui";

import {
  Percent,
  Difference,
  Decimalish,
  Decimal,
  Trove,
  LiquityStoreState,
  HCHF_LIQUIDATION_RESERVE
} from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, COLLATERAL_COIN } from "../../strings";

import { StaticRow } from "./Editor";
import { LoadingOverlay } from "../LoadingOverlay";
import { CollateralRatio } from "./CollateralRatio";
import { InfoIcon } from "../InfoIcon";
import { Step, Steps } from "../Steps";

type TroveEditorProps = {
  original: Trove;
  edited: Trove;
  fee: Decimal;
  borrowingRate: Decimal;
  changePending: boolean;
  dispatch: (
    action: { type: "setCollateral" | "setDebt"; newValue: Decimalish } | { type: "revert" }
  ) => void;
  transactionSteps: Step[];
};

const select = ({ price }: LiquityStoreState) => ({ price });

export const TroveEditor: React.FC<TroveEditorProps> = ({
  children,
  original,
  edited,
  fee,
  borrowingRate,
  changePending,
  transactionSteps
}) => {
  const { price } = useLiquitySelector(select);

  const feePct = new Percent(borrowingRate);

  const originalCollateralRatio = !original.isEmpty ? original.collateralRatio(price) : undefined;
  const collateralRatio = !edited.isEmpty ? edited.collateralRatio(price) : undefined;
  const collateralRatioChange = Difference.between(collateralRatio, originalCollateralRatio);

  return (
    <Card>
      <Heading
        sx={{
          display: "grid !important",
          gridAutoFlow: "column",
          gridTemplateColumns: "1fr repeat(2, auto)"
        }}
      >
        Trove
        <Steps steps={transactionSteps} />
      </Heading>

      <Box sx={{ p: [2, 3] }}>
        <StaticRow
          label="Collateral"
          inputId="trove-collateral"
          amount={edited.collateral.prettify(4)}
          unit={COLLATERAL_COIN}
        />

        <StaticRow label="Debt" inputId="trove-debt" amount={edited.debt.prettify()} unit={COIN} />

        {original.isEmpty && (
          <StaticRow
            label="Liquidation Reserve"
            inputId="trove-liquidation-reserve"
            amount={`${HCHF_LIQUIDATION_RESERVE}`}
            unit={COIN}
            infoIcon={
              <InfoIcon
                tooltip={
                  <Card variant="tooltip" sx={{ width: "200px" }}>
                    An amount set aside to cover the liquidator’s gas costs if your Trove needs to be
                    liquidated. The amount increases your debt and is refunded if you close your
                    Trove by fully paying off its net debt.
                  </Card>
                }
              />
            }
          />
        )}

        <StaticRow
          label="Borrowing Fee"
          inputId="trove-borrowing-fee"
          amount={fee.toString(2)}
          pendingAmount={feePct.toString(2)}
          unit={COIN}
          infoIcon={
            <InfoIcon
              tooltip={
                <Card variant="tooltip" sx={{ width: "240px" }}>
                  This amount is deducted from the borrowed amount as a one-time fee. There are no
                  recurring fees for borrowing, which is thus interest-free.
                </Card>
              }
            />
          }
        />

        <CollateralRatio value={collateralRatio} change={collateralRatioChange} />

        {children}
      </Box>
    </Card>
  );
};
