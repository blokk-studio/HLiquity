import React, { useState, useCallback, useEffect, useRef } from "react";
// import { useLiquitySelector } from "@liquity/lib-react";
import { LiquityStoreState, Decimal } from "@liquity/lib-base";
import { MineViewContext } from "./MineViewContext";
import { transitions } from "./transitions";
import type { MineView, MineEvent } from "./transitions";
import { useLiquitySelector } from "@liquity/lib-react";

const transition = (view: MineView, event: MineEvent): MineView => {
  const nextView = transitions[view][event] ?? view;
  return nextView;
};

const getInitialView = (
  liquidityMiningStake: Decimal,
  remainingLiquidityMiningLQTYReward: Decimal
): MineView => {
  if (remainingLiquidityMiningLQTYReward.isZero) return "DISABLED";
  if (liquidityMiningStake.isZero) return "INACTIVE";
  return "ACTIVE";
};

const selector = ({
  liquidityMiningStake,
  remainingLiquidityMiningHLQTReward
}: LiquityStoreState) => ({ liquidityMiningStake, remainingLiquidityMiningHLQTReward });

export const MineViewProvider: React.FC = props => {
  const { children } = props;
  const { liquidityMiningStake, remainingLiquidityMiningHLQTReward } = useLiquitySelector(selector);

  const [view, setView] = useState<MineView>(
    getInitialView(liquidityMiningStake, remainingLiquidityMiningHLQTReward)
  );
  const viewRef = useRef<MineView>(view);

  const dispatchEvent = useCallback((event: MineEvent) => {
    const nextView = transition(viewRef.current, event);

    console.log(
      "dispatchEvent() [current-view, event, next-view]",
      viewRef.current,
      event,
      nextView
    );
    setView(nextView);
  }, []);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (liquidityMiningStake.isZero) {
      dispatchEvent("UNSTAKE_AND_CLAIM_CONFIRMED");
    }
  }, [liquidityMiningStake.isZero, dispatchEvent]);

  const provider = {
    view,
    dispatchEvent
  };

  return <MineViewContext.Provider value={provider}>{children}</MineViewContext.Provider>;
};
