import { Decimal } from "./Decimal";

/**
 * Total collateral ratio below which recovery mode is triggered.
 *
 * @public
 */
export const CRITICAL_COLLATERAL_RATIO = Decimal.from(1.5);

/**
 * Collateral ratio below which a Trove can be liquidated in normal mode.
 *
 * @public
 */
export const MINIMUM_COLLATERAL_RATIO = Decimal.from(1.1);

/**
 * Amount of HCHF that's reserved for compensating the liquidator of a Trove.
 *
 * @public
 */
export const HCHF_LIQUIDATION_RESERVE = Decimal.from(20);

/**
 * A Trove must always have at least this much debt on top of the
 * {@link HCHF_LIQUIDATION_RESERVE | liquidation reserve}.
 *
 * @remarks
 * Any transaction that would result in a Trove with less net debt than this will be reverted.
 *
 * @public
 */
export const HCHF_MINIMUM_NET_DEBT = Decimal.from(1780);

/**
 * A Trove must always have at least this much debt.
 *
 * @remarks
 * Any transaction that would result in a Trove with less debt than this will be reverted.
 *
 * @public
 */
export const HCHF_MINIMUM_DEBT = HCHF_LIQUIDATION_RESERVE.add(HCHF_MINIMUM_NET_DEBT);

/**
 * Value that the {@link Fees.borrowingRate | borrowing rate} will never decay below.
 *
 * @remarks
 * Note that the borrowing rate can still be lower than this during recovery mode, when it's
 * overridden by zero.
 *
 * @public
 */
export const MINIMUM_BORROWING_RATE = Decimal.from(0.005);

/**
 * Value that the {@link Fees.borrowingRate | borrowing rate} will never exceed.
 *
 * @public
 */
export const MAXIMUM_BORROWING_RATE = Decimal.from(0.05);

/**
 * Value that the {@link Fees.redemptionRate | redemption rate} will never decay below.
 *
 * @public
 */
export const MINIMUM_REDEMPTION_RATE = Decimal.from(0.005);

// TODO: deal with this shit: "TODO: these are constant in the contracts, so it doesn't make sense to make a call for them,
// but to avoid having to update them here when we change them in the contracts, we could read
// them once after deployment and save them to LiquityDeployment."
/**
 * @public
 */
export const MINUTE_DECAY_FACTOR = Decimal.from("0.999037758833783000");
/**
 * @public
 */
export const BETA = Decimal.from(2);
