import { Decimal, TroveChange } from "@liquity/lib-base";
import { useTxFunction } from "../components/Transaction";
import { useLiquity } from "./LiquityContext";
import { useLiquitySelector } from "@liquity/lib-react";
import { useMemo } from "react";

export const useTroveTransactionFunction = (
  transactionId: string,
  troveChange: TroveChange<Decimal> | undefined
) => {
  const { liquity } = useLiquity();
  const state = useLiquitySelector(state => {
    return {
      maxBorrowingRate: state.fees.borrowingRate().add(0.005)
    };
  });
  const txFunction = useMemo(() => {
    if (!troveChange || troveChange.type === "invalidCreation") {
      return () => {
        throw new Error("You cannot modify your trove like this.");
      };
    }

    switch (troveChange.type) {
      case "creation":
        return liquity.send.openTrove.bind(liquity.send, troveChange.params, state.maxBorrowingRate);

      case "closure":
        return liquity.send.closeTrove.bind(liquity.send);
    }

    return liquity.send.adjustTrove.bind(liquity.send, troveChange.params, state.maxBorrowingRate);
  }, [troveChange, liquity, state]);

  return useTxFunction(transactionId, txFunction);
};
