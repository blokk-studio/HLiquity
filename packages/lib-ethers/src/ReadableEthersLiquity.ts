import { BigNumber } from "@ethersproject/bignumber";

import {
  Decimal,
  Fees,
  FrontendStatus,
  HLiquityStore,
  HLQTStake,
  ReadableLiquity,
  StabilityDeposit,
  Trove,
  TroveListingParams,
  TroveWithPendingRedistribution,
  UserTrove,
  UserTroveStatus,
  _CachedReadableLiquity,
  _LiquityReadCache
} from "@liquity/lib-base";

import { MultiTroveGetter } from "../types";

import { EthersCallOverrides, EthersProvider, EthersSigner } from "./types";

import {
  EthersLiquityConnection,
  EthersLiquityConnectionOptionalParams,
  EthersLiquityStoreOption,
  _connect,
  _getBlockTimestamp,
  _getBlockTimestampAsNumber,
  _getContracts,
  _requireAddress,
  _requireFrontendAddress
} from "./EthersLiquityConnection";

import { BlockPolledLiquityStore } from "./BlockPolledLiquityStore";
import { Fetch } from "./fetch";

// TODO: these are constant in the contracts, so it doesn't make sense to make a call for them,
// but to avoid having to update them here when we change them in the contracts, we could read
// them once after deployment and save them to LiquityDeployment.
const MINUTE_DECAY_FACTOR = Decimal.from("0.999037758833783000");
const BETA = Decimal.from(2);

enum BackendTroveStatus {
  nonExistent,
  active,
  closedByOwner,
  closedByLiquidation,
  closedByRedemption
}

const panic = <T>(error: Error): T => {
  throw error;
};

const userTroveStatusFrom = (backendStatus: BackendTroveStatus): UserTroveStatus =>
  backendStatus === BackendTroveStatus.nonExistent
    ? "nonExistent"
    : backendStatus === BackendTroveStatus.active
      ? "open"
      : backendStatus === BackendTroveStatus.closedByOwner
        ? "closedByOwner"
        : backendStatus === BackendTroveStatus.closedByLiquidation
          ? "closedByLiquidation"
          : backendStatus === BackendTroveStatus.closedByRedemption
            ? "closedByRedemption"
            : panic(new Error(`invalid backendStatus ${backendStatus}`));

const decimalify = (bigNumber: BigNumber) => Decimal.fromBigNumberString(bigNumber.toHexString());
const numberify = (bigNumber: BigNumber) => bigNumber.toNumber();
const convertToDate = (timestamp: number) => new Date(timestamp * 1000);

const validSortingOptions = ["ascendingCollateralRatio", "descendingCollateralRatio"];

const expectPositiveInt = <K extends string>(obj: { [P in K]?: number }, key: K) => {
  const value: number | undefined = obj[key];
  if (value !== undefined) {
    if (!Number.isInteger(value)) {
      throw new Error(`${key} must be an integer`);
    }

    if (value < 0) {
      throw new Error(`${key} must not be negative`);
    }
  }
};

/**
 * Ethers-based implementation of {@link @liquity/lib-base#ReadableLiquity}.
 *
 * @public
 */
export class ReadableEthersLiquity implements ReadableLiquity {
  readonly connection: EthersLiquityConnection;

  /** @internal */
  constructor(connection: EthersLiquityConnection) {
    this.connection = connection;
  }

  /** @internal */
  static _from(options: {
    connection: EthersLiquityConnection & { useStore: "blockPolled" };
    mirrorNodeBaseUrl: string;
    fetch: Fetch;
  }): ReadableEthersLiquityWithStore<BlockPolledLiquityStore>;

  /** @internal */
  static _from(options: {
    connection: EthersLiquityConnection;
    mirrorNodeBaseUrl: string;
    fetch: Fetch;
  }): ReadableEthersLiquity;

  /** @internal */
  static _from(options: {
    connection: EthersLiquityConnection;
    mirrorNodeBaseUrl: string;
    fetch: Fetch;
  }): ReadableEthersLiquity {
    const readable = new ReadableEthersLiquity(options.connection);

    return options.connection.useStore === "blockPolled"
      ? new _BlockPolledReadableEthersLiquity({
        readable,
        mirrorNodeBaseUrl: options.mirrorNodeBaseUrl,
        fetch: options.fetch
      })
      : readable;
  }

  /** @internal */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams: EthersLiquityConnectionOptionalParams & { useStore: "blockPolled" }
  ): Promise<ReadableEthersLiquityWithStore<BlockPolledLiquityStore>>;

  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersLiquityConnectionOptionalParams
  ): Promise<ReadableEthersLiquity>;

  /**
   * Connect to the Liquity protocol and create a `ReadableEthersLiquity` object.
   *
   * @param signerOrProvider - Ethers `Signer` or `Provider` to use for connecting to the Ethereum
   *                           network.
   * @param optionalParams - Optional parameters that can be used to customize the connection.
   */
  static async connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersLiquityConnectionOptionalParams
  ): Promise<ReadableEthersLiquity> {
    if (!optionalParams) {
      throw new Error(
        "you need to pass `mirrorNodeBaseUrl` and `fetch` with the `optionalParams` argument. they're not optional anymore."
      );
    }
    const connection = await _connect(signerOrProvider, optionalParams);

    return ReadableEthersLiquity._from({
      connection,
      mirrorNodeBaseUrl: optionalParams.mirrorNodeBaseUrl,
      fetch: optionalParams.fetch
    });
  }

  /**
   * Check whether this `ReadableEthersLiquity` is a {@link ReadableEthersLiquityWithStore}.
   */
  hasStore(): this is ReadableEthersLiquityWithStore;

  /**
   * Check whether this `ReadableEthersLiquity` is a
   * {@link ReadableEthersLiquityWithStore}\<{@link BlockPolledLiquityStore}\>.
   */
  hasStore(store: "blockPolled"): this is ReadableEthersLiquityWithStore<BlockPolledLiquityStore>;

  hasStore(): boolean {
    return false;
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalRedistributed} */
  async getTotalRedistributed(overrides?: EthersCallOverrides): Promise<Trove> {
    const { troveManager } = _getContracts(this.connection);

    const [collateral, debt] = await Promise.all([
      troveManager.L_ETH({ ...overrides }).then(decimalify),
      troveManager.L_HCHFDebt({ ...overrides }).then(decimalify)
    ]);

    return new Trove(collateral, debt);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTroveBeforeRedistribution} */
  async getTroveBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution> {
    address ??= _requireAddress(this.connection);
    const { troveManager } = _getContracts(this.connection);

    const [trove, snapshot] = await Promise.all([
      troveManager.Troves(address, { ...overrides }),
      troveManager.rewardSnapshots(address, { ...overrides })
    ]);

    if (trove.status === BackendTroveStatus.active) {
      return new TroveWithPendingRedistribution(
        address,
        userTroveStatusFrom(trove.status),
        decimalify(trove.coll),
        decimalify(trove.debt),
        decimalify(trove.stake),
        new Trove(decimalify(snapshot.ETH), decimalify(snapshot.HCHFDebt))
      );
    } else {
      return new TroveWithPendingRedistribution(address, userTroveStatusFrom(trove.status));
    }
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTrove} */
  async getTrove(address?: string, overrides?: EthersCallOverrides): Promise<UserTrove> {
    const [trove, totalRedistributed] = await Promise.all([
      this.getTroveBeforeRedistribution(address, overrides),
      this.getTotalRedistributed(overrides)
    ]);

    return trove.applyRedistribution(totalRedistributed);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getNumberOfTroves} */
  async getNumberOfTroves(overrides?: EthersCallOverrides): Promise<number> {
    const { troveManager } = _getContracts(this.connection);

    return (await troveManager.getTroveOwnersCount({ ...overrides })).toNumber();
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getPrice} */
  getPrice(overrides?: EthersCallOverrides): Promise<Decimal> {
    const { priceFeed } = _getContracts(this.connection);

    return priceFeed.callStatic.fetchPrice({ ...overrides }).then(price => {
      return decimalify(price);
    });
  }

  /** @internal */
  async _getActivePool(overrides?: EthersCallOverrides): Promise<Trove> {
    const { activePool } = _getContracts(this.connection);

    const [activeCollateral, activeDebt] = await Promise.all(
      [activePool.getETH({ ...overrides }), activePool.getHCHFDebt({ ...overrides })].map(
        getBigNumber => getBigNumber.then(decimalify)
      )
    );

    return new Trove(activeCollateral, activeDebt);
  }

  /** @internal */
  async _getDefaultPool(overrides?: EthersCallOverrides): Promise<Trove> {
    const { defaultPool } = _getContracts(this.connection);

    const [liquidatedCollateral, closedDebt] = await Promise.all(
      [defaultPool.getETH({ ...overrides }), defaultPool.getHCHFDebt({ ...overrides })].map(
        getBigNumber => getBigNumber.then(decimalify)
      )
    );

    return new Trove(liquidatedCollateral, closedDebt);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotal} */
  async getTotal(overrides?: EthersCallOverrides): Promise<Trove> {
    const [activePool, defaultPool] = await Promise.all([
      this._getActivePool(overrides),
      this._getDefaultPool(overrides)
    ]);

    return activePool.add(defaultPool);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getStabilityDeposit} */
  async getStabilityDeposit(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<StabilityDeposit> {
    address ??= _requireAddress(this.connection);
    const { stabilityPool } = _getContracts(this.connection);

    const [{ frontEndTag, initialValue }, currentHCHF, collateralGain, hlqtReward] =
      await Promise.all([
        stabilityPool.deposits(address, { ...overrides }),
        stabilityPool.getCompoundedHCHFDeposit(address, { ...overrides }),
        stabilityPool.getDepositorETHGain(address, { ...overrides }),
        stabilityPool.getDepositorHLQTGain(address, { ...overrides })
      ]);

    return new StabilityDeposit(
      decimalify(initialValue),
      decimalify(currentHCHF),
      decimalify(collateralGain),
      decimalify(hlqtReward),
      frontEndTag
    );
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingStabilityPoolHLQTReward} */
  async getRemainingStabilityPoolHLQTReward(overrides?: EthersCallOverrides): Promise<Decimal> {
    const { communityIssuance } = _getContracts(this.connection);

    const issuanceCap = this.connection.totalStabilityPoolHLQTReward;
    const totalHLQTIssued = decimalify(await communityIssuance.totalHLQTIssued({ ...overrides }));

    // totalHLQTIssued approaches but never reaches issuanceCap
    return issuanceCap.sub(totalHLQTIssued);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getHCHFInStabilityPool} */
  getHCHFInStabilityPool(overrides?: EthersCallOverrides): Promise<Decimal> {
    const { stabilityPool } = _getContracts(this.connection);

    return stabilityPool.getTotalHCHFDeposits({ ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getHCHFBalance} */
  getHCHFBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { hchfToken } = _getContracts(this.connection);

    return hchfToken.balanceOf(address, { ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLPBalance} */
  getLPBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { saucerSwapPool, uniToken } = _getContracts(this.connection);

    return saucerSwapPool.balanceOf(address, { ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLPReward} */
  getLPReward(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { saucerSwapPool, uniToken } = _getContracts(this.connection);

    return saucerSwapPool.rewardPerToken().then(decimalify);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLPEarnings} */
  getLPEarnings(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { saucerSwapPool, uniToken } = _getContracts(this.connection);

    return saucerSwapPool.earned(address, { ...overrides }).then(decimalify);
  }

  getHLQTTokenAddress(overrides?: EthersCallOverrides): Promise<string> {
    const { hlqtToken } = _getContracts(this.connection);

    return hlqtToken.getTokenAddress({ ...overrides });
  }

  getHCHFTokenAddress(overrides?: EthersCallOverrides): Promise<string> {
    const { hchfToken } = _getContracts(this.connection);

    return hchfToken.getTokenAddress({ ...overrides });
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getHLQTBalance} */
  getHLQTBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { hlqtToken } = _getContracts(this.connection);

    return hlqtToken.balanceOf(address, { ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenBalance} */
  getUniTokenBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    // return new Promise(resolve => {
    //   const decimal = Decimal.from(0);
    //   resolve(decimal);
    // });

    address ??= _requireAddress(this.connection);
    const { saucerSwapPool } = _getContracts(this.connection);

    return saucerSwapPool.balanceOf(address, { ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenAllowance} */
  getUniTokenAllowance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    // return new Promise(resolve => {
    //   const decimal = Decimal.from(0);
    //   resolve(decimal);
    // });
    // throw "unitoken";
    address ??= _requireAddress(this.connection);
    const { uniToken, saucerSwapPool } = _getContracts(this.connection);

    return uniToken.allowance(address, saucerSwapPool.address, { ...overrides }).then(decimalify);
  }

  /** @internal */
  async _getRemainingLiquidityMiningHLQTRewardCalculator(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number) => Decimal> {
    const { saucerSwapPool } = _getContracts(this.connection);

    const [totalSupply, rewardRate, periodFinish, lastUpdateTime] = await Promise.all([
      saucerSwapPool.totalSupply({ ...overrides }),
      saucerSwapPool.rewardRate({ ...overrides }).then(decimalify),
      saucerSwapPool.periodFinish({ ...overrides }).then(numberify),
      saucerSwapPool.lastUpdateTime({ ...overrides }).then(numberify)
    ]);

    return (blockTimestamp: number) =>
      rewardRate.mul(
        Math.max(0, periodFinish - (totalSupply.isZero() ? lastUpdateTime : blockTimestamp))
      );
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingLiquidityMiningHLQTReward} */
  async getRemainingLiquidityMiningHLQTReward(overrides?: EthersCallOverrides): Promise<Decimal> {
    const [calculateRemainingHLQT, blockTimestamp] = await Promise.all([
      this._getRemainingLiquidityMiningHLQTRewardCalculator(overrides),
      _getBlockTimestamp(this.connection, overrides?.blockTag)
    ]);

    return calculateRemainingHLQT(blockTimestamp);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningStake} */
  getLiquidityMiningStake(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { saucerSwapPool } = _getContracts(this.connection);

    return saucerSwapPool.balanceOf(address, { ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedUniTokens} */
  getTotalStakedUniTokens(overrides?: EthersCallOverrides): Promise<Decimal> {
    const { saucerSwapPool } = _getContracts(this.connection);

    return saucerSwapPool.totalSupply({ ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningHLQTReward} */
  getLiquidityMiningHLQTReward(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { saucerSwapPool } = _getContracts(this.connection);

    return saucerSwapPool.earned(address, { ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getCollateralSurplusBalance} */
  getCollateralSurplusBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    address ??= _requireAddress(this.connection);
    const { collSurplusPool } = _getContracts(this.connection);

    return collSurplusPool.getCollateral(address, { ...overrides }).then(decimalify);
  }

  /** @internal */
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution[]>;

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.(getTroves:2)} */
  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]>;

  async getTroves(
    params: TroveListingParams,
    overrides?: EthersCallOverrides
  ): Promise<UserTrove[]> {
    const { multiTroveGetter } = _getContracts(this.connection);

    expectPositiveInt(params, "first");
    expectPositiveInt(params, "startingAt");

    if (!validSortingOptions.includes(params.sortedBy)) {
      throw new Error(
        `sortedBy must be one of: ${validSortingOptions.map(x => `"${x}"`).join(", ")}`
      );
    }

    const [totalRedistributed, backendTroves] = await Promise.all([
      params.beforeRedistribution ? undefined : this.getTotalRedistributed({ ...overrides }),
      multiTroveGetter.getMultipleSortedTroves(
        params.sortedBy === "descendingCollateralRatio"
          ? params.startingAt ?? 0
          : -((params.startingAt ?? 0) + 1),
        params.first,
        { ...overrides }
      )
    ]);

    const troves = mapBackendTroves(backendTroves);

    if (totalRedistributed) {
      return troves.map(trove => trove.applyRedistribution(totalRedistributed));
    } else {
      return troves;
    }
  }

  /** @internal */
  async _getFeesFactory(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    const { troveManager } = _getContracts(this.connection);

    const [lastFeeOperationTime, baseRateWithoutDecay] = await Promise.all([
      troveManager.lastFeeOperationTime({ ...overrides }),
      troveManager.baseRate({ ...overrides }).then(decimalify)
    ]);

    return (blockTimestamp, recoveryMode) =>
      new Fees(
        baseRateWithoutDecay,
        MINUTE_DECAY_FACTOR,
        BETA,
        convertToDate(lastFeeOperationTime.toNumber()),
        convertToDate(blockTimestamp),
        recoveryMode
      );
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFees} */
  async getFees(overrides?: EthersCallOverrides): Promise<Fees> {
    const [createFees, total, price, blockTimestamp] = await Promise.all([
      this._getFeesFactory(overrides),
      this.getTotal(overrides),
      this.getPrice(overrides),
      _getBlockTimestamp(this.connection, overrides?.blockTag)
    ]);

    return createFees(blockTimestamp, total.collateralRatioIsBelowCritical(price));
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getHLQTStake} */
  async getHLQTStake(address?: string, overrides?: EthersCallOverrides): Promise<HLQTStake> {
    address ??= _requireAddress(this.connection);
    const { hlqtStaking } = _getContracts(this.connection);

    const [stakedHLQT, collateralGain, hchfGain] = await Promise.all(
      [
        hlqtStaking.stakes(address, { ...overrides }),
        hlqtStaking.getPendingETHGain(address, { ...overrides }),
        hlqtStaking.getPendingHCHFGain(address, { ...overrides })
      ].map(getBigNumber => getBigNumber.then(decimalify))
    );

    return new HLQTStake(stakedHLQT, collateralGain, hchfGain);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedHLQT} */
  async getTotalStakedHLQT(overrides?: EthersCallOverrides): Promise<Decimal> {
    const { hlqtStaking } = _getContracts(this.connection);

    return hlqtStaking.totalHLQTStaked({ ...overrides }).then(decimalify);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFrontendStatus} */
  async getFrontendStatus(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<FrontendStatus> {
    address ??= _requireFrontendAddress(this.connection);
    const { stabilityPool } = _getContracts(this.connection);

    const { registered, kickbackRate } = await stabilityPool.frontEnds(address, { ...overrides });

    return registered
      ? { status: "registered", kickbackRate: decimalify(kickbackRate) }
      : { status: "unregistered" };
  }
}

type Resolved<T> = T extends Promise<infer U> ? U : T;
type BackendTroves = Resolved<ReturnType<MultiTroveGetter["getMultipleSortedTroves"]>>;

const mapBackendTroves = (troves: BackendTroves): TroveWithPendingRedistribution[] =>
  troves.map(
    trove =>
      new TroveWithPendingRedistribution(
        trove.owner,
        "open", // These Troves are coming from the SortedTroves list, so they must be open
        decimalify(trove.coll),
        decimalify(trove.debt),
        decimalify(trove.stake),
        new Trove(decimalify(trove.snapshotETH), decimalify(trove.snapshotHCHFDebt))
      )
  );

/**
 * Variant of {@link ReadableEthersLiquity} that exposes a {@link @liquity/lib-base#HLiquityStore}.
 *
 * @public
 */
export interface ReadableEthersLiquityWithStore<T extends HLiquityStore = HLiquityStore>
  extends ReadableEthersLiquity {
  /** An object that implements HLiquityStore. */
  readonly store: T;
}

class BlockPolledLiquityStoreBasedCache
  implements _LiquityReadCache<[overrides?: EthersCallOverrides]> {
  private _store: BlockPolledLiquityStore;

  constructor(store: BlockPolledLiquityStore) {
    this._store = store;
  }

  private _blockHit(overrides?: EthersCallOverrides): boolean {
    return (
      !overrides ||
      overrides.blockTag === undefined ||
      overrides.blockTag === this._store.state.blockTag
    );
  }

  private _userHit(address?: string, overrides?: EthersCallOverrides): boolean {
    return (
      this._blockHit(overrides) &&
      (address === undefined || address === this._store.connection.userAddress)
    );
  }

  private _frontendHit(address?: string, overrides?: EthersCallOverrides): boolean {
    return (
      this._blockHit(overrides) &&
      (address === undefined || address === this._store.connection.frontendTag)
    );
  }

  getTotalRedistributed(overrides?: EthersCallOverrides): Trove | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.totalRedistributed;
    }
  }

  getTroveBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): TroveWithPendingRedistribution | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.troveBeforeRedistribution;
    }
  }

  getTrove(address?: string, overrides?: EthersCallOverrides): UserTrove | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.trove;
    }
  }

  getNumberOfTroves(overrides?: EthersCallOverrides): number | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.numberOfTroves;
    }
  }

  getPrice(overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.price;
    }
  }

  getTotal(overrides?: EthersCallOverrides): Trove | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.total;
    }
  }

  getStabilityDeposit(
    address?: string,
    overrides?: EthersCallOverrides
  ): StabilityDeposit | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.stabilityDeposit;
    }
  }

  getRemainingStabilityPoolHLQTReward(overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.remainingStabilityPoolHLQTReward;
    }
  }

  getHCHFInStabilityPool(overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.hchfInStabilityPool;
    }
  }

  getHCHFBalance(address?: string, overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.hchfBalance;
    }
  }

  getLPBalance(address?: string, overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.lpBalance;
    }
  }

  getLPReward(address?: string, overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.lpReward
    }
  }

  getLPEarnings(address?: string, overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.lpEarnings;
    }
  }

  getHCHFTokenAddress(overrides?: EthersCallOverrides): string | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.hchfTokenAddress;
    }
  }

  getHLQTTokenAddress(overrides?: EthersCallOverrides): string | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.hlqtTokenAddress;
    }
  }

  getHLQTBalance(address?: string, overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.hlqtBalance;
    }
  }

  getUniTokenBalance(address?: string, overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.uniTokenBalance;
    }
  }

  getUniTokenAllowance(address?: string, overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.uniTokenAllowance;
    }
  }

  getRemainingLiquidityMiningHLQTReward(overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.remainingLiquidityMiningHLQTReward;
    }
  }

  getLiquidityMiningStake(address?: string, overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.liquidityMiningStake;
    }
  }

  getTotalStakedUniTokens(overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.totalStakedUniTokens;
    }
  }

  getLiquidityMiningHLQTReward(
    address?: string,
    overrides?: EthersCallOverrides
  ): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.liquidityMiningHLQTReward;
    }
  }

  getCollateralSurplusBalance(
    address?: string,
    overrides?: EthersCallOverrides
  ): Decimal | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.collateralSurplusBalance;
    }
  }

  getFees(overrides?: EthersCallOverrides): Fees | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.fees;
    }
  }

  getHLQTStake(address?: string, overrides?: EthersCallOverrides): HLQTStake | undefined {
    if (this._userHit(address, overrides)) {
      return this._store.state.hlqtStake;
    }
  }

  getTotalStakedHLQT(overrides?: EthersCallOverrides): Decimal | undefined {
    if (this._blockHit(overrides)) {
      return this._store.state.totalStakedHLQT;
    }
  }

  getFrontendStatus(
    address?: string,
    overrides?: EthersCallOverrides
  ): { status: "unregistered" } | { status: "registered"; kickbackRate: Decimal } | undefined {
    if (this._frontendHit(address, overrides)) {
      return this._store.state.frontend;
    }
  }

  getTroves() {
    return undefined;
  }
}

class _BlockPolledReadableEthersLiquity
  extends _CachedReadableLiquity<[overrides?: EthersCallOverrides]>
  implements ReadableEthersLiquityWithStore<BlockPolledLiquityStore> {
  readonly connection: EthersLiquityConnection;
  readonly store: BlockPolledLiquityStore;

  constructor(options: {
    readable: ReadableEthersLiquity;
    mirrorNodeBaseUrl: string;
    fetch: Fetch;
  }) {
    const store = new BlockPolledLiquityStore(options);

    super(options.readable, new BlockPolledLiquityStoreBasedCache(store));

    this.store = store;
    this.connection = options.readable.connection;
  }

  hasStore(store?: EthersLiquityStoreOption): boolean {
    return store === undefined || store === "blockPolled";
  }

  _getActivePool(): Promise<Trove> {
    throw new Error("Method not implemented.");
  }

  _getDefaultPool(): Promise<Trove> {
    throw new Error("Method not implemented.");
  }

  _getFeesFactory(): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    throw new Error("Method not implemented.");
  }

  _getRemainingLiquidityMiningHLQTRewardCalculator(): Promise<(blockTimestamp: number) => Decimal> {
    throw new Error("Method not implemented.");
  }
}
