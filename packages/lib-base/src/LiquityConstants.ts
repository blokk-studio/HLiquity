import { Decimal } from "./Decimal";

export interface LiquityConstants {
  /**
   * Total collateral ratio below which recovery mode is triggered.
   */
  CRITICAL_COLLATERAL_RATIO: Decimal;
  /**
   * Collateral ratio below which a Trove can be liquidated in normal mode.
   */
  MINIMUM_COLLATERAL_RATIO: Decimal;
  /**
   * Amount of HCHF that's reserved for compensating the liquidator of a Trove.
   */
  HCHF_LIQUIDATION_RESERVE: Decimal;
  /**
   * A Trove must always have at least this much debt on top of the
   * {@link HCHF_LIQUIDATION_RESERVE | liquidation reserve}.
   *
   * @remarks
   * Any transaction that would result in a Trove with less net debt than this will be reverted.
   */
  HCHF_MINIMUM_NET_DEBT: Decimal;
  /**
   * A Trove must always have at least this much debt.
   *
   * @remarks
   * Any transaction that would result in a Trove with less debt than this will be reverted.
   */
  HCHF_MINIMUM_DEBT: Decimal;
  /**
   * Value that the {@link Fees.borrowingRate | borrowing rate} will never decay below.
   *
   * @remarks
   * Note that the borrowing rate can still be lower than this during recovery mode, when it's
   * overridden by zero.
   */
  MINIMUM_BORROWING_RATE: Decimal;
  /**
   * Value that the {@link Fees.borrowingRate | borrowing rate} will never exceed.
   */
  MAXIMUM_BORROWING_RATE: Decimal;
  /**
   * Value that the {@link Fees.redemptionRate | redemption rate} will never decay below.
   */
  MINIMUM_REDEMPTION_RATE: Decimal;
  MINUTE_DECAY_FACTOR: Decimal;
  BETA: Decimal;
}

export const staticConstants: Omit<
  LiquityConstants,
  "HCHF_MINIMUM_NET_DEBT" | "HCHF_LIQUIDATION_RESERVE" | "HCHF_MINIMUM_DEBT"
> = {
  CRITICAL_COLLATERAL_RATIO: Decimal.from(1.5),
  MINIMUM_COLLATERAL_RATIO: Decimal.from(1.1),
  MINIMUM_BORROWING_RATE: Decimal.from(0.005),
  MAXIMUM_BORROWING_RATE: Decimal.from(0.05),
  MINIMUM_REDEMPTION_RATE: Decimal.from(0.005),
  MINUTE_DECAY_FACTOR: Decimal.from("0.999037758833783000"),
  BETA: Decimal.from(2)
};
