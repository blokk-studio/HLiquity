import { Decimal } from "./Decimal";

export interface Constants {
  CRITICAL_COLLATERAL_RATIO: Decimal;
  MINIMUM_COLLATERAL_RATIO: Decimal;
  HCHF_LIQUIDATION_RESERVE: Decimal;
  HCHF_MINIMUM_NET_DEBT: Decimal;
  HCHF_MINIMUM_DEBT: Decimal;
  MINIMUM_BORROWING_RATE: Decimal;
  MAXIMUM_BORROWING_RATE: Decimal;
  MINIMUM_REDEMPTION_RATE: Decimal;
  MINUTE_DECAY_FACTOR: Decimal;
  BETA: Decimal;
}

/**
 * Total collateral ratio below which recovery mode is triggered.
 *
 * @public
 */
const CRITICAL_COLLATERAL_RATIO = Decimal.from(1.5);

/**
 * Collateral ratio below which a Trove can be liquidated in normal mode.
 *
 * @public
 */
const MINIMUM_COLLATERAL_RATIO = Decimal.from(1.1);

/**
 * Amount of HCHF that's reserved for compensating the liquidator of a Trove.
 *
 * @public
 */
const HCHF_LIQUIDATION_RESERVE = Decimal.from(20);

/**
 * A Trove must always have at least this much debt on top of the
 * {@link HCHF_LIQUIDATION_RESERVE | liquidation reserve}.
 *
 * @remarks
 * Any transaction that would result in a Trove with less net debt than this will be reverted.
 *
 * @public
 */
const HCHF_MINIMUM_NET_DEBT = Decimal.from(1780);

/**
 * A Trove must always have at least this much debt.
 *
 * @remarks
 * Any transaction that would result in a Trove with less debt than this will be reverted.
 *
 * @public
 */
const HCHF_MINIMUM_DEBT = HCHF_LIQUIDATION_RESERVE.add(HCHF_MINIMUM_NET_DEBT);

/**
 * Value that the {@link Fees.borrowingRate | borrowing rate} will never decay below.
 *
 * @remarks
 * Note that the borrowing rate can still be lower than this during recovery mode, when it's
 * overridden by zero.
 *
 * @public
 */
const MINIMUM_BORROWING_RATE = Decimal.from(0.005);

/**
 * Value that the {@link Fees.borrowingRate | borrowing rate} will never exceed.
 *
 * @public
 */
const MAXIMUM_BORROWING_RATE = Decimal.from(0.05);

/**
 * Value that the {@link Fees.redemptionRate | redemption rate} will never decay below.
 *
 * @public
 */
const MINIMUM_REDEMPTION_RATE = Decimal.from(0.005);

/**
 * @public
 */
const MINUTE_DECAY_FACTOR = Decimal.from("0.999037758833783000");
/**
 * @public
 */
const BETA = Decimal.from(2);

export const getConstants = (
  configuration: Record<string, string | undefined>,
  defaultValues: Constants
): Constants => {
  const constants = Object.fromEntries(
    Object.entries(defaultValues).map(([key, defaultValue]) => {
      const configurationValue = configuration[key];
      const constant = configurationValue ? Decimal.from(configurationValue) : defaultValue;

      return [key, constant];
    })
  ) as Constants;

  return constants;
};

/**
 * default valies for constants
 *
 * only directly use this for tests. do not use this in application code.
 */
export const defaults: Constants = {
  BETA,
  CRITICAL_COLLATERAL_RATIO,
  HCHF_LIQUIDATION_RESERVE,
  HCHF_MINIMUM_DEBT,
  HCHF_MINIMUM_NET_DEBT,
  MAXIMUM_BORROWING_RATE,
  MINIMUM_BORROWING_RATE,
  MINIMUM_COLLATERAL_RATIO,
  MINIMUM_REDEMPTION_RATE,
  MINUTE_DECAY_FACTOR
};

export const getConstantsFromJsonObjectString = (jsonObjectString?: string): Constants => {
  let configuration: Record<string, string | undefined> = {};
  if (jsonObjectString) {
    try {
      configuration = JSON.parse(jsonObjectString);
    } catch {
      console.warn(
        `json object string ${JSON.stringify(
          jsonObjectString
        )} is malfomed. default constants will be used.`
      );
    }
  }

  const constants = getConstants(configuration, defaults);

  return constants;
};
