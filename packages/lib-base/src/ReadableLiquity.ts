import { Decimal } from "./Decimal";
import { Trove, TroveWithPendingRedistribution, UserTrove } from "./Trove";
import { StabilityDeposit } from "./StabilityDeposit";
import { Fees } from "./Fees";
import { HLQTStake } from "./HLQTStake";

/**
 * Represents whether an address has been registered as a Liquity frontend.
 *
 * @remarks
 * Returned by the {@link ReadableLiquity.getFrontendStatus | getFrontendStatus()} function.
 *
 * When `status` is `"registered"`, `kickbackRate` gives the frontend's kickback rate as a
 * {@link Decimal} between 0 and 1.
 *
 * @public
 */
export type FrontendStatus =
  | { status: "unregistered" }
  | { status: "registered"; kickbackRate: Decimal };

/**
 * Parameters of the {@link ReadableLiquity.(getTroves:2) | getTroves()} function.
 *
 * @public
 */
export interface TroveListingParams {
  /** Number of Troves to retrieve. */
  readonly first: number;

  /** How the Troves should be sorted. */
  readonly sortedBy: "ascendingCollateralRatio" | "descendingCollateralRatio";

  /** Index of the first Trove to retrieve from the sorted list. */
  readonly startingAt?: number;

  /**
   * When set to `true`, the retrieved Troves won't include the liquidation shares received since
   * the last time they were directly modified.
   *
   * @remarks
   * Changes the type of returned Troves to {@link TroveWithPendingRedistribution}.
   */
  readonly beforeRedistribution?: boolean;
}

/**
 * Read the state of the Liquity protocol.
 *
 * @remarks
 * Implemented by {@link @liquity/lib-ethers#EthersLiquity}.
 *
 * @public
 */
export interface ReadableLiquity {
  /**
   * Get the total collateral and debt per stake that has been liquidated through redistribution.
   *
   * @remarks
   * Needed when dealing with instances of {@link @liquity/lib-base#TroveWithPendingRedistribution}.
   */
  getTotalRedistributed(): Promise<Trove>;

  /**
   * Get a Trove in its state after the last direct modification.
   *
   * @param address - Address that owns the Trove.
   *
   * @remarks
   * The current state of a Trove can be fetched using
   * {@link @liquity/lib-base#ReadableLiquity.getTrove | getTrove()}.
   */
  getTroveBeforeRedistribution(address?: string): Promise<TroveWithPendingRedistribution>;

  /**
   * Get the current state of a Trove.
   *
   * @param address - Address that owns the Trove.
   */
  getTrove(address?: string): Promise<UserTrove>;

  /**
   * Get number of Troves that are currently open.
   */
  getNumberOfTroves(): Promise<number>;

  /**
   * Get the current price of the native currency (e.g. Ether) in USD.
   */
  getPrice(): Promise<Decimal>;

  /**
   * Get the total amount of collateral and debt in the Liquity system.
   */
  getTotal(): Promise<Trove>;

  /**
   * Get the current state of a Stability Deposit.
   *
   * @param address - Address that owns the Stability Deposit.
   */
  getStabilityDeposit(address?: string): Promise<StabilityDeposit>;

  /**
   * Get the remaining HLQT that will be collectively rewarded to stability depositors.
   */
  getRemainingStabilityPoolHLQTReward(): Promise<Decimal>;

  /**
   * Get the total amount of HCHF currently deposited in the Stability Pool.
   */
  getHCHFInStabilityPool(): Promise<Decimal>;

  /**
   * Get the amount of HCHF held by an address.
   *
   * @param address - Address whose balance should be retrieved.
   */
  getHCHFBalance(address?: string): Promise<Decimal>;

  /**
   * Get the address of the HST Token of HCHF (HCHF)
   *
   */
  getHCHFTokenAddress(): Promise<string>;

  /**
   * Get the address of the HST Token of HLQT
   *
   */
  getHLQTTokenAddress(): Promise<string>;

  /**
   * Get the amount of HLQT held by an address.
   *
   * @param address - Address whose balance should be retrieved.
   */
  getHLQTBalance(address?: string): Promise<Decimal>;

  /**
   * Get the amount of LP held by an address.
   *
   * @param address - Address whose balance should be retrieved.
   */
  getLPBalance(address?: string): Promise<Decimal>;

  /**
   * Get the reward of LP held by an address.
   *
   * @param address - Address whose balance should be retrieved.
   */
  getLPReward(address?: string): Promise<Decimal>;

  /**
   * Get LP earnings.
   *
   * @param address - Address whose balance should be retrieved.
   */
  getLPEarnings(address?: string): Promise<Decimal>;

  /**
   * Get the amount of Uniswap ETH/HCHF LP tokens held by an address.
   *
   * @param address - Address whose balance should be retrieved.
   */
  getUniTokenBalance(address?: string): Promise<Decimal>;

  /**_CachedReadableLiquity
   * Get the liquidity mining contract's allowance of a holder's Uniswap ETH/HCHF LP tokens.
   *
   * @param address - Address holding the Uniswap ETH/HCHF LP tokens.
   */
  getUniTokenAllowance(address?: string): Promise<Decimal>;

  /**
   * Get the remaining HLQT that will be collectively rewarded to liquidity miners.
   */
  getRemainingLiquidityMiningHLQTReward(): Promise<Decimal>;

  /**
   * Get the amount of Uniswap ETH/HCHF LP tokens currently staked by an address in liquidity mining.
   *
   * @param address - Address whose LP stake should be retrieved.
   */
  getLiquidityMiningStake(address?: string): Promise<Decimal>;

  /**
   * Get the total amount of Uniswap ETH/HCHF LP tokens currently staked in liquidity mining.
   */
  getTotalStakedUniTokens(): Promise<Decimal>;

  /**
   * Get the amount of HLQT earned by an address through mining liquidity.
   *
   * @param address - Address whose HLQT reward should be retrieved.
   */
  getLiquidityMiningHLQTReward(address?: string): Promise<Decimal>;

  /**
   * Get the amount of leftover collateral available for withdrawal by an address.
   *
   * @remarks
   * When a Trove gets liquidated or redeemed, any collateral it has above 110% (in case of
   * liquidation) or 100% collateralization (in case of redemption) gets sent to a pool, where it
   * can be withdrawn from using
   * {@link @liquity/lib-base#TransactableLiquity.claimCollateralSurplus | claimCollateralSurplus()}.
   */
  getCollateralSurplusBalance(address?: string): Promise<Decimal>;

  /** @internal */
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true }
  ): Promise<TroveWithPendingRedistribution[]>;

  /**
   * Get a slice from the list of Troves.
   *
   * @param params - Controls how the list is sorted, and where the slice begins and ends.
   * @returns Pairs of owner addresses and their Troves.
   */
  getTroves(params: TroveListingParams): Promise<UserTrove[]>;

  /**
   * Get a calculator for current fees.
   */
  getFees(): Promise<Fees>;

  /**
   * Get the current state of an HLQT Stake.
   *
   * @param address - Address that owns the HLQT Stake.
   */
  getHLQTStake(address?: string): Promise<HLQTStake>;

  /**
   * Get the total amount of HLQT currently staked.
   */
  getTotalStakedHLQT(): Promise<Decimal>;

  /**
   * Check whether an address is registered as a Liquity frontend, and what its kickback rate is.
   *
   * @param address - Address to check.
   */
  getFrontendStatus(address?: string): Promise<FrontendStatus>;
}
