import { Decimal } from "./Decimal";
import { Trove } from "./Trove";

export const getSlippage = (options: {
  /** troves sorted by their ascending collateral ratio (lowest first) */
  sortedTroves: Trove[];
  /** the total amount of hbar (collateral) that is locked in the protocol */
  totalHchf: Decimal;
  /** the total amount of hchf (debt) that is locked in the protocol */
  totalHbar: Decimal;
  /** the amoubt of hchf a user wants to redeem */
  redeemedHchf: Decimal;
  /** the current redemption fee */
  redemptionFee: Decimal;
}): Decimal => {
  let remainingHchf = Decimal.from(options.redeemedHchf);
  let affectedHbar = Decimal.ZERO;
  let affectedHchf = Decimal.ZERO;
  for (const trove of options.sortedTroves) {
    // stop if all hchf is redeemed
    if (remainingHchf.isZero) {
      break;
    }

    if (trove.debt.lte(remainingHchf)) {
      // entire trove will be consumed
      affectedHbar = affectedHbar.add(trove.collateral);
      affectedHchf = affectedHbar.add(trove.debt);
      remainingHchf = remainingHchf.sub(trove.debt);
    } else {
      // trove will be partially consumed
      affectedHbar = trove.collateral.mulDiv(remainingHchf, trove.debt);
      affectedHchf = affectedHchf.add(remainingHchf);
      remainingHchf = Decimal.ZERO;
    }
  }

  const receivedHbarPerHchf = affectedHbar
    .div(affectedHchf)
    .mul(Decimal.ONE.sub(options.redemptionFee));
  const targetHbarPerHchf = options.totalHbar.div(options.totalHchf);
  const slippage = Decimal.ONE.sub(receivedHbarPerHchf.div(targetHbarPerHchf)).mul(100);

  return slippage;
};
