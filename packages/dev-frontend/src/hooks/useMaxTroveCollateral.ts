import { Decimal } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { useMemo } from "react";

export const maximumTransactionCost = Decimal.from(40);

/** returns the maximum collateral the user can spend while preserving some for transaction fees */
export const useMaxTroveCollateral = () => {
  const state = useLiquitySelector(state => {
    return {
      trove: state.trove,
      accountBalance: state.accountBalance
    };
  });

  const maxTroveCollateral = useMemo(() => {
    const availableCollateral = state.trove.collateral.add(state.accountBalance);
    if (availableCollateral.gt(maximumTransactionCost)) {
      return availableCollateral.sub(maximumTransactionCost);
    }

    return Decimal.ZERO;
  }, [state]);

  return maxTroveCollateral;
};
