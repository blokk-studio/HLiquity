import { Constants } from "./constants";
import { Decimal, Percent } from "./Decimal";
import { Trove } from "./Trove";

export const getRedemptionDetails = (options: {
  /** troves sorted by their ascending collateral ratio (lowest first) */
  sortedTroves: Trove[];
  /** the total amount of hbar (collateral) that is locked in the protocol */
  totalHchf: Decimal;
  /** the total amount of hchf (debt) that is locked in the protocol */
  totalHbar: Decimal;
  /** the amoubt of hchf a user wants to redeem */
  redeemedHchf: Decimal;
  /** the current redemption fee as a decimal percentage (0-1 ^= 0%-100%) */
  redemptionFee: Decimal;
  /**
   * the constants for the deployment
   *
   * the liquidation reserve has to be subtracted from the trove debt to get the amount of trove debt that can be redeemed.
   */
  constants: Pick<Constants, "HCHF_LIQUIDATION_RESERVE">;
  /**
   * the price of the collateral currency in chf (=hchf)
   *
   * 1 hbar = <price> chf
   */
  price: Decimal;
}): {
  redeemedHchf: Decimal;
  receivedHbar: Decimal;
  redemptionFeeInHbar: Decimal;
  slippage: Percent<Decimal, Decimal>;
} | null => {
  let remainingHchfWithWhichToPayOffTroveDebt = Decimal.from(options.redeemedHchf);
  let receivedHbarBeforeFee = Decimal.ZERO;
  let redeemedHchf = Decimal.ZERO;
  for (const trove of options.sortedTroves) {
    // stop if all hchf is redeemed
    if (remainingHchfWithWhichToPayOffTroveDebt.isZero) {
      break;
    }

    const usableTroveDebt = trove.debt.sub(options.constants.HCHF_LIQUIDATION_RESERVE);
    // calculate the value of the debt in the collateral currency. this (minus fee) is what the redeemer will get for paying the trove debt.
    const usableTroveCollateral = usableTroveDebt.div(options.price);

    if (usableTroveDebt.lte(remainingHchfWithWhichToPayOffTroveDebt)) {
      // entire trove will be consumed
      receivedHbarBeforeFee = receivedHbarBeforeFee.add(usableTroveCollateral);
      redeemedHchf = redeemedHchf.add(usableTroveDebt);
      remainingHchfWithWhichToPayOffTroveDebt =
        remainingHchfWithWhichToPayOffTroveDebt.sub(usableTroveDebt);
    } else {
      // trove will be partially consumed
      const paidOfDebtInCollateralCurrency = remainingHchfWithWhichToPayOffTroveDebt.div(
        options.price
      );
      receivedHbarBeforeFee = receivedHbarBeforeFee.add(paidOfDebtInCollateralCurrency);
      redeemedHchf = redeemedHchf.add(remainingHchfWithWhichToPayOffTroveDebt);
      remainingHchfWithWhichToPayOffTroveDebt = Decimal.ZERO;
    }
  }

  // HBAR the user gets
  const redemptionFeeInHbar = receivedHbarBeforeFee.mul(options.redemptionFee);
  const receivedHbarAfterFee = receivedHbarBeforeFee.sub(redemptionFeeInHbar);
  // slippage
  const receivedHbarPerHchf = receivedHbarAfterFee.div(redeemedHchf);
  const targetHbarPerHchf = options.totalHbar.div(options.totalHchf);
  const recievedToTargetHbarPerHchfRatio = receivedHbarPerHchf.div(targetHbarPerHchf);
  if (Decimal.ONE.lt(recievedToTargetHbarPerHchfRatio)) {
    return null;
  }
  const slippage = new Percent(Decimal.ONE.sub(recievedToTargetHbarPerHchfRatio));

  return {
    redeemedHchf,
    receivedHbar: receivedHbarAfterFee,
    redemptionFeeInHbar,
    slippage
  };
};
