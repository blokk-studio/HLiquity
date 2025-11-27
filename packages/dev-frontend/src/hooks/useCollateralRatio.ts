import { Decimal, Difference, Trove } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { useMemo } from "react";

export const useCollateralRatio = (trove: Trove) => {
  const price = useLiquitySelector(state => state.price);

  const collateralRatio = useMemo(() => {
    return trove.collateralRatio(price);
  }, [trove, price]);

  return collateralRatio;
};

export const useCollateralRatioDifference = (ratio1: Decimal, ratio2: Decimal) => {
  const collateralRatioDifference = useMemo(() => {
    return Difference.between(ratio1, ratio2);
  }, [ratio1, ratio2]);

  return collateralRatioDifference;
};
