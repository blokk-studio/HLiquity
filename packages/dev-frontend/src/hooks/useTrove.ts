import { Decimal, Trove } from "@liquity/lib-base";
import { useMemo } from "react";
import { useConstants } from "./constants";
import { useFee } from "./useFee";

export const useTrove = (collateral: Decimal, netDebt: Decimal, previousTrove?: Trove) => {
  const constants = useConstants();

  const debtWithReserve = useMemo(() => {
    return netDebt.add(constants.HCHF_LIQUIDATION_RESERVE);
  }, [constants, netDebt]);

  const fee = useFee(debtWithReserve, previousTrove?.debt);

  const trove = useMemo(() => {
    const totalDebt = debtWithReserve.add(fee);
    const trove = new Trove(constants, collateral, totalDebt);

    return trove;
  }, [constants, collateral, debtWithReserve, fee]);

  return trove;
};
