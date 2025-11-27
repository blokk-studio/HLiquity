import { Decimal } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { useMemo } from "react";
import { useConstants } from "./constants";
import { useFee } from "./useFee";

/** returns the maximum net debt that can be added to a trove for the given collateral */
export const useMaxNetDebt = (collateral: Decimal, previousDebt = Decimal.ZERO) => {
  const constants = useConstants();
  const state = useLiquitySelector(state => {
    return {
      price: state.price,
      borrowingRate: state.fees.borrowingRate()
    };
  });

  const maxTotalDebt = useMemo(() => {
    const maxTotalDebt = collateral.mul(state.price).div(constants.MINIMUM_COLLATERAL_RATIO);

    return maxTotalDebt;
  }, [constants, state, collateral]);
  const fee = useFee(maxTotalDebt, previousDebt);

  const maxNetDebt = useMemo(() => {
    if (maxTotalDebt.lt(constants.HCHF_LIQUIDATION_RESERVE.add(fee))) {
      return Decimal.ZERO;
    }

    const maxNetDebt = maxTotalDebt.sub(constants.HCHF_LIQUIDATION_RESERVE).sub(fee);

    return maxNetDebt;
  }, [constants, maxTotalDebt, fee]);

  return maxNetDebt;
};
