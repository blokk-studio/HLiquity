import React from "react";
import { Button, Flex } from "theme-ui";

import { Decimal, Decimalish, Difference, LiquityStoreState, HLQTStake } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, COLLATERAL_COIN, GT } from "../../strings";

import { Icon } from "../Icon";
import { StaticRow } from "../Trove/Editor";
import { DecimalInput } from "../DecimalInput";

import { useStakingView } from "./context/StakingViewContext";
import { Step, Steps } from "../Steps";
import { HeadingWithChildren } from "../shared";

const select = ({ hlqtBalance, totalStakedHLQT }: LiquityStoreState) => ({
  hlqtBalance,
  totalStakedHLQT
});

type StakingEditorProps = {
  title: string;
  originalStake: HLQTStake;
  editedLQTY: Decimal;
  dispatch: (action: { type: "setStake"; newValue: Decimalish } | { type: "revert" }) => void;
  transactionSteps: Step[];
};

export const StakingEditor: React.FC<React.PropsWithChildren<StakingEditorProps>> = ({
  children,
  title,
  originalStake,
  editedLQTY,
  transactionSteps,
  dispatch
}) => {
  const { hlqtBalance, totalStakedHLQT } = useLiquitySelector(select);
  const { changePending } = useStakingView();

  const edited = !editedLQTY.eq(originalStake.stakedHLQT);

  const maxAmount = originalStake.stakedHLQT.add(hlqtBalance);
  const maxedOut = editedLQTY.eq(maxAmount);

  const totalStakedLQTYAfterChange = totalStakedHLQT.sub(originalStake.stakedHLQT).add(editedLQTY);

  const originalPoolShare = originalStake.stakedHLQT.mulDiv(100, totalStakedHLQT);
  const newPoolShare = editedLQTY.mulDiv(100, totalStakedLQTYAfterChange);
  const poolShareChange =
    originalStake.stakedHLQT.nonZero && Difference.between(newPoolShare, originalPoolShare).nonZero;

  return (
    <div>
      <HeadingWithChildren text={title || 'Adjust your HLQT stake'}>

        <Flex sx={{gap: 16}}>
          <Steps steps={transactionSteps} />

          {edited && !changePending && (
            <Button
              variant="titleIcon"
              sx={{ width: 24, height: 24, ":enabled:hover": { color: "danger" }, marginLeft: "0.5rem" }}
              onClick={() => dispatch({ type: "revert" })}
            >
              <Icon style={{width: 24, height: 24}} name="history" size="lg" />
            </Button>
          )}
        </Flex>
      </HeadingWithChildren>

      <DecimalInput
        label=""
        value={editedLQTY}
        onInput={newValue => dispatch({ type: "setStake", newValue })}
        max={maxAmount}
      />

      {newPoolShare.infinite ? (
        <StaticRow label="Pool share" inputId="stake-share" amount="N/A" />
      ) : (
        <StaticRow
          label="Pool share"
          inputId="stake-share"
          amount={newPoolShare.prettify(4)}
          pendingAmount={poolShareChange?.prettify(4).concat("%")}
          pendingColor={poolShareChange?.positive ? "success" : "danger"}
          unit="%"
        />
      )}

      {!originalStake.isEmpty && (
        <>
          <StaticRow
            label="Redemption gain"
            inputId="stake-gain-eth"
            amount={originalStake.collateralGain.prettify(6)}
            color={originalStake.collateralGain.nonZero && "success"}
            unit={COLLATERAL_COIN}
          />

          <StaticRow
            label="Issuance gain"
            inputId="stake-gain-lusd"
            amount={originalStake.hchfGain.prettify(4)}
            color={originalStake.hchfGain.nonZero && "success"}
            unit={COIN}
          />
        </>
      )}

      {children}
    </div>
  );
};
