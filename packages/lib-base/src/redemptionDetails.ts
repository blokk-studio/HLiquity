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
}): {
  redeemedHchf: Decimal;
  receivedHbar: Decimal;
  redemptionFeeInHbar: Decimal;
  slippage: Percent<Decimal, Decimal>;
} | null => {
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

  const receivedHbar = affectedHbar.mul(Decimal.ONE.sub(options.redemptionFee));
  const redemptionFeeInHbar = affectedHbar.mul(options.redemptionFee);
  const receivedHbarPerHchf = receivedHbar.div(affectedHchf);
  const targetHbarPerHchf = options.totalHbar.div(options.totalHchf);
  const recievedToTargetHbarPerHchfRatio = receivedHbarPerHchf.div(targetHbarPerHchf);
  if (Decimal.ONE.lt(recievedToTargetHbarPerHchfRatio)) {
    return null;
  }
  const slippage = new Percent(Decimal.ONE.sub(recievedToTargetHbarPerHchfRatio));

  return {
    redeemedHchf: affectedHchf,
    receivedHbar,
    redemptionFeeInHbar,
    slippage
  };
};
