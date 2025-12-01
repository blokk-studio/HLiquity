import React, { useEffect, useState } from "react";

import { Decimal, PopulatedLiquityTransaction, TroveChange } from "@liquity/lib-base";

import { useLiquity } from "../../hooks/LiquityContext";
import { Warning } from "../Warning";
import { HashgraphLiquity } from "@liquity/lib-hashgraph";

export type GasEstimationState =
  | { type: "idle" | "inProgress" }
  | { type: "complete"; populatedTx: PopulatedLiquityTransaction };

type ExpensiveTroveChangeWarningParams = {
  troveChange?: Exclude<TroveChange<Decimal>, { type: "invalidCreation" }>;
  maxBorrowingRate: Decimal;
  borrowingFeeDecayToleranceMinutes: number;
  onGasEstimationStateChange?: (newState: GasEstimationState) => void;
};

export const ExpensiveTroveChangeWarning: React.FC<ExpensiveTroveChangeWarningParams> = ({
  troveChange,
  maxBorrowingRate,
  borrowingFeeDecayToleranceMinutes,
  onGasEstimationStateChange
}) => {
  const { liquity } = useLiquity();
  // TODO: fix?
  borrowingFeeDecayToleranceMinutes;

  const [gasEstimationState, setGasEstimationState] = useState<GasEstimationState>({ type: "idle" });
  useEffect(() => {
    onGasEstimationStateChange?.(gasEstimationState);
  }, [onGasEstimationStateChange, gasEstimationState]);

  useEffect(() => {
    if (troveChange && troveChange.type !== "closure") {
      setGasEstimationState({ type: "inProgress" });

      let cancelled = false;

      const timeoutId = setTimeout(async () => {
        const populatedTx = await (troveChange.type === "creation"
          ? (liquity as HashgraphLiquity).populate.openTrove(
              troveChange.params,
              maxBorrowingRate
              // TODO: fix?
              // {
              //   borrowingFeeDecayToleranceMinutes,
              // }
            )
          : (liquity as HashgraphLiquity).populate.adjustTrove(
              troveChange.params,
              maxBorrowingRate
              // TODO: fix?
              // {
              //   borrowingFeeDecayToleranceMinutes
              // }
            ));

        if (!cancelled) {
          setGasEstimationState({ type: "complete", populatedTx });
          console.log("Estimated TX cost: " + Decimal.from(`${populatedTx.gasLimit}`).prettify(0));
        }
      }, 333);

      return () => {
        clearTimeout(timeoutId);
        cancelled = true;
      };
    } else {
      setGasEstimationState({ type: "idle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [troveChange]);

  if (
    troveChange &&
    gasEstimationState.type === "complete" &&
    "gasHeadroom" in gasEstimationState.populatedTx &&
    typeof gasEstimationState.populatedTx.gasHeadroom === "number" &&
    gasEstimationState.populatedTx.gasHeadroom >= 200000
  ) {
    return troveChange.type === "creation" ? (
      <Warning>
        The cost of opening a Trove in this collateral ratio range is rather high. To lower it,
        choose a slightly different collateral ratio.
      </Warning>
    ) : (
      <Warning>
        The cost of adjusting a Trove into this collateral ratio range is rather high. To lower it,
        choose a slightly different collateral ratio.
      </Warning>
    );
  }

  return null;
};
