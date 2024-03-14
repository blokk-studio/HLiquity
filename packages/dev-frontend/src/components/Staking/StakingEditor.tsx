import React, { useState } from "react";
import { Heading, Box, Card, Button } from "theme-ui";

import { Decimal, Decimalish, Difference, LiquityStoreState, HLQTYStake } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, GT } from "../../strings";

import { Icon } from "../Icon";
import { EditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";

import { useStakingView } from "./context/StakingViewContext";

const select = ({ hlqtyBalance, totalStakedHLQTY }: LiquityStoreState) => ({
  hlqtyBalance,
  totalStakedHLQTY
});

type StakingEditorProps = {
  title: string;
  originalStake: HLQTYStake;
  editedLQTY: Decimal;
  dispatch: (action: { type: "setStake"; newValue: Decimalish } | { type: "revert" }) => void;
};

export const StakingEditor: React.FC<StakingEditorProps> = ({
  children,
  title,
  originalStake,
  editedLQTY,
  dispatch
}) => {
  const { hlqtyBalance, totalStakedHLQTY } = useLiquitySelector(select);
  const { changePending } = useStakingView();
  const editingState = useState<string>();

  const edited = !editedLQTY.eq(originalStake.stakedHLQTY);

  const maxAmount = originalStake.stakedHLQTY.add(hlqtyBalance);
  const maxedOut = editedLQTY.eq(maxAmount);

  const totalStakedLQTYAfterChange = totalStakedHLQTY.sub(originalStake.stakedHLQTY).add(editedLQTY);

  const originalPoolShare = originalStake.stakedHLQTY.mulDiv(100, totalStakedHLQTY);
  const newPoolShare = editedLQTY.mulDiv(100, totalStakedLQTYAfterChange);
  const poolShareChange =
    originalStake.stakedHLQTY.nonZero && Difference.between(newPoolShare, originalPoolShare).nonZero;

  return (
    <Card>
      <Heading>
        {title}
        {edited && !changePending && (
          <Button
            variant="titleIcon"
            sx={{ ":enabled:hover": { color: "danger" } }}
            onClick={() => dispatch({ type: "revert" })}
          >
            <Icon name="history" size="lg" />
          </Button>
        )}
      </Heading>

      <Box sx={{ p: [2, 3] }}>
        <EditableRow
          label="Stake"
          inputId="stake-lqty"
          amount={editedLQTY.prettify()}
          maxAmount={maxAmount.toString()}
          maxedOut={maxedOut}
          unit={GT}
          {...{ editingState }}
          editedAmount={editedLQTY.toString(2)}
          setEditedAmount={newValue => dispatch({ type: "setStake", newValue })}
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
              amount={originalStake.collateralGain.prettify(4)}
              color={originalStake.collateralGain.nonZero && "success"}
              unit="ETH"
            />

            <StaticRow
              label="Issuance gain"
              inputId="stake-gain-lusd"
              amount={originalStake.hchfGain.prettify()}
              color={originalStake.hchfGain.nonZero && "success"}
              unit={COIN}
            />
          </>
        )}

        {children}
      </Box>

      {changePending && <LoadingOverlay />}
    </Card>
  );
};
