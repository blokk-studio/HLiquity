import React, { useState } from "react";
import { Box, Card, Button, Flex } from "theme-ui";

import {
  Decimal,
  Decimalish,
  StabilityDeposit,
  LiquityStoreState,
  Difference
} from "@liquity/lib-base";

import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, COLLATERAL_COIN, GT } from "../../strings";

import { Icon } from "../Icon";
import { EditableRow, StaticRow } from "../Trove/Editor";
import { InfoIcon } from "../InfoIcon";
import { Step, Steps } from "../Steps";
import { HeadingWithChildren } from "../shared";
import { DecimalInput } from "../DecimalInput.tsx";

const select = ({ hchfBalance, hchfInStabilityPool }: LiquityStoreState) => ({
  hchfBalance,
  hchfInStabilityPool
});

type StabilityDepositEditorProps = {
  originalDeposit: StabilityDeposit;
  editedHCHF: Decimal;
  changePending: boolean;
  dispatch: (action: { type: "setDeposit"; newValue: Decimalish } | { type: "revert" }) => void;
  transactionSteps: Step[];
};

export const StabilityDepositEditor: React.FC<
  React.PropsWithChildren<StabilityDepositEditorProps>
> = ({ originalDeposit, editedHCHF, changePending, dispatch, transactionSteps, children }) => {
  const { hchfBalance, hchfInStabilityPool } = useLiquitySelector(select);
  const editingState = useState<string>();

  const edited = !editedHCHF.eq(originalDeposit.currentHCHF);

  const maxAmount = originalDeposit.currentHCHF.add(hchfBalance);
  const maxedOut = editedHCHF.eq(maxAmount);

  const lusdInStabilityPoolAfterChange = hchfInStabilityPool
    .sub(originalDeposit.currentHCHF)
    .add(editedHCHF);

  const originalPoolShare = originalDeposit.currentHCHF.mulDiv(100, hchfInStabilityPool);
  const newPoolShare = editedHCHF.mulDiv(100, lusdInStabilityPoolAfterChange);
  const poolShareChange =
    originalDeposit.currentHCHF.nonZero &&
    Difference.between(newPoolShare, originalPoolShare).nonZero;

  return (
    <div>
      <HeadingWithChildren text="Stability Pool">

        <Flex sx={{ gap: 16 }}>
          <Steps steps={transactionSteps} />

          {edited && !changePending && (
            <Button
              variant="titleIcon"
              sx={{ width: 24, height: 24, ":enabled:hover": { color: "danger" }, marginLeft: "0.5rem" }}
              onClick={() => dispatch({ type: "revert" })}
            >
              <Icon style={{ width: 24, height: 24 }} name="history" size="lg" />
            </Button>
          )}
        </Flex>
      </HeadingWithChildren>

      <Box>
        <DecimalInput max={maxAmount} label="" value={editedHCHF}
                      onInput={newValue => dispatch({ type: "setDeposit", newValue })} {...{ editingState }} />

        {newPoolShare.infinite ? (
          <StaticRow label="Pool share" inputId="deposit-share" amount="N/A" />
        ) : (
          <StaticRow
            label="Pool share"
            inputId="deposit-share"
            amount={newPoolShare.prettify(4)}
            pendingAmount={poolShareChange?.prettify(4).concat("%")}
            pendingColor={poolShareChange?.positive ? "success" : "danger"}
            unit="%"
          />
        )}

        {!originalDeposit.isEmpty && (
          <>
            <StaticRow
              label="Liquidation gain"
              inputId="deposit-gain"
              amount={originalDeposit.collateralGain.prettify(4)}
              color={originalDeposit.collateralGain.nonZero && "success"}
              unit={COLLATERAL_COIN}
            />

            <StaticRow
              label="Reward"
              inputId="deposit-reward"
              amount={originalDeposit.hlqtReward.prettify()}
              color={originalDeposit.hlqtReward.nonZero && "success"}
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
          </>
        )}
        {children}
      </Box>
    </div>
  );
};
