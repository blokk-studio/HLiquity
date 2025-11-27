import { Decimal } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { useMemo } from "react";

const getFee = (borrowingRate: Decimal, totalDebt: Decimal, previousTotalDebt = Decimal.ZERO) => {
  // reducing debt is free
  if (totalDebt.lte(previousTotalDebt)) {
    return Decimal.ZERO;
  }

  const fee = totalDebt.sub(previousTotalDebt).mul(borrowingRate);

  return fee;
};

export const useFee = (totalDebt: Decimal, previousTotalDebt = Decimal.ZERO) => {
  const state = useLiquitySelector(state => {
    return {
      borrowingRate: state.fees.borrowingRate()
    };
  });

  const fee = useMemo(() => {
    const fee = getFee(state.borrowingRate, totalDebt, previousTotalDebt);

    return fee;
  }, [state, totalDebt, previousTotalDebt]);

  return fee;
};
