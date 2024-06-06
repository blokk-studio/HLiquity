import { AddressZero } from "@ethersproject/constants";

import {
  Decimal,
  LiquityStoreState,
  LiquityStoreBaseState,
  TroveWithPendingRedistribution,
  StabilityDeposit,
  HLQTStake,
  HLiquityStore,
  Address
} from "@liquity/lib-base";

import { ReadableEthersLiquity } from "./ReadableEthersLiquity";
import {
  EthersLiquityConnection,
  _getBlockTimestamp,
  _getContracts,
  _getProvider,
  getTokenIds
} from "./EthersLiquityConnection";
import { EthersCallOverrides, EthersProvider } from "./types";
import { Fetch, fetchTokens } from "@liquity/mirror-node";
import { TokenId } from "@hashgraph/sdk";

/**
 * Extra state added to {@link @liquity/lib-base#LiquityStoreState} by
 * {@link BlockPolledLiquityStore}.
 *
 * @public
 */
export interface BlockPolledLiquityStoreExtraState {
  /**
   * Number of block that the store state was fetched from.
   *
   * @remarks
   * May be undefined when the store state is fetched for the first time.
   */
  blockTag?: number;

  /**
   * Timestamp of latest block (number of seconds since epoch).
   */
  blockTimestamp: number;
}

/**
 * The type of {@link BlockPolledLiquityStore}'s
 * {@link @liquity/lib-base#LiquityStore.state | state}.
 *
 * @public
 */
export type BlockPolledLiquityStoreState = LiquityStoreState<BlockPolledLiquityStoreExtraState>;

type Resolved<T> = T extends Promise<infer U> ? U : T;
type ResolvedValues<T> = { [P in keyof T]: Resolved<T[P]> };

const promiseAllValues = <T extends Record<string, unknown>>(object: T) => {
  const keys = Object.keys(object);

  return Promise.all(Object.values(object)).then(values =>
    Object.fromEntries(values.map((value, i) => [keys[i], value]))
  ) as Promise<ResolvedValues<T>>;
};

/**
 * Ethers-based {@link @liquity/lib-base#LiquityStore} that updates state whenever there's a new
 * block.
 *
 * @public
 */
export class BlockPolledLiquityStore extends HLiquityStore<BlockPolledLiquityStoreExtraState> {
  readonly connection: EthersLiquityConnection;

  private readonly _readable: ReadableEthersLiquity;
  private readonly _provider: EthersProvider;
  private readonly mirrorNodeBaseUrl: string;
  private readonly fetch: Fetch;

  constructor(options: {
    readable: ReadableEthersLiquity;
    mirrorNodeBaseUrl: string;
    fetch: Fetch;
  }) {
    super();

    this.connection = options.readable.connection;
    this._readable = options.readable;
    this._provider = _getProvider(options.readable.connection);
    this.mirrorNodeBaseUrl = options.mirrorNodeBaseUrl;
    this.fetch = options.fetch;
  }

  private async _getRiskiestTroveBeforeRedistribution(
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution> {
    const riskiestTroves = await this._readable.getTroves(
      { first: 1, sortedBy: "ascendingCollateralRatio", beforeRedistribution: true },
      overrides
    );

    if (riskiestTroves.length === 0) {
      return new TroveWithPendingRedistribution(AddressZero, "nonExistent");
    }

    return riskiestTroves[0];
  }

  private async _get(
    blockTag?: number
  ): Promise<[baseState: LiquityStoreBaseState, extraState: BlockPolledLiquityStoreExtraState]> {
    const { userAddress, frontendTag } = this.connection;
    const { hchfToken, hlqtToken, saucerSwapPool } = _getContracts(this.connection);
    const tokenIds = await getTokenIds(this.connection);

    const tokenAssociationsPromise = (async () => {
      const [tokens, hchfTokenAddress, hlqtTokenAddress, lpTokenAddress] = await Promise.all([
        fetchTokens({
          tokenIds: Object.values(tokenIds),
          apiBaseUrl: this.mirrorNodeBaseUrl,
          evmAddress: userAddress as Address,
          fetch: this.fetch
        }).catch(() => {
          return [] as { id: `0.0.${number}` }[];
        }),
        hchfToken.tokenAddress(),
        hlqtToken.tokenAddress(),
        saucerSwapPool.uniToken()
      ]);

      const tokenIdStringSet = new Set(tokens.map(token => token.id));

      const tokenAddresses = [hchfTokenAddress, hlqtTokenAddress, lpTokenAddress];
      const tokenIdStrings = tokenAddresses.map(
        tokenAddress => TokenId.fromSolidityAddress(tokenAddress).toString() as `0.0.${number}`
      );
      const [userHasAssociatedWithHchf, userHasAssociatedWithHlqt, userHasAssociatedWithLpToken] =
        tokenIdStrings.map(tokenIdString => tokenIdStringSet.has(tokenIdString));

      return {
        userHasAssociatedWithHchf,
        userHasAssociatedWithHlqt,
        userHasAssociatedWithLpToken
      };
    })();

    const { blockTimestamp, createFees, calculateRemainingHLQT, ...baseState } =
      await promiseAllValues({
        blockTimestamp: _getBlockTimestamp(this.connection, blockTag),
        createFees: this._readable._getFeesFactory({ blockTag }),
        calculateRemainingHLQT: this._readable._getRemainingLiquidityMiningHLQTRewardCalculator({
          blockTag
        }),

        price: this._readable.getPrice({ blockTag }),
        numberOfTroves: this._readable.getNumberOfTroves({ blockTag }),
        totalRedistributed: this._readable.getTotalRedistributed({ blockTag }),
        total: this._readable.getTotal({ blockTag }),
        hchfInStabilityPool: this._readable.getHCHFInStabilityPool({ blockTag }),
        totalStakedHLQT: this._readable.getTotalStakedHLQT({ blockTag }),
        _riskiestTroveBeforeRedistribution: this._getRiskiestTroveBeforeRedistribution({ blockTag }),
        totalStakedUniTokens: this._readable.getTotalStakedUniTokens({ blockTag }),
        remainingStabilityPoolHLQTReward: this._readable.getRemainingStabilityPoolHLQTReward({
          blockTag
        }),

        frontend: frontendTag
          ? this._readable.getFrontendStatus(frontendTag, { blockTag })
          : { status: "unregistered" as const },
        userHasAssociatedWithHchf: tokenAssociationsPromise.then(
          associations => associations.userHasAssociatedWithHchf
        ),
        userHasAssociatedWithHlqt: tokenAssociationsPromise.then(
          associations => associations.userHasAssociatedWithHlqt
        ),
        userHasAssociatedWithLpToken: tokenAssociationsPromise.then(
          associations => associations.userHasAssociatedWithLpToken
        ),

        ...(userAddress
          ? {
              accountBalance: this._provider
                .getBalance(userAddress, blockTag)
                .then(bigNumber =>
                  Decimal.fromBigNumberStringWithPrecision(bigNumber.toHexString(), 18)
                ),
              hchfBalance: this._readable.getHCHFBalance(userAddress, { blockTag }),
              hchfTokenAddress: this._readable.getHCHFTokenAddress({ blockTag }),
              hlqtTokenAddress: this._readable.getHLQTTokenAddress({ blockTag }),
              hlqtBalance: this._readable.getHLQTBalance(userAddress, { blockTag }),
              uniTokenBalance: this._readable.getUniTokenBalance(userAddress, { blockTag }),
              uniTokenAllowance: this._readable.getUniTokenAllowance(userAddress, { blockTag }),
              liquidityMiningStake: this._readable.getLiquidityMiningStake(userAddress, {
                blockTag
              }),
              liquidityMiningHLQTReward: this._readable.getLiquidityMiningHLQTReward(userAddress, {
                blockTag
              }),
              collateralSurplusBalance: this._readable.getCollateralSurplusBalance(userAddress, {
                blockTag
              }),
              troveBeforeRedistribution: this._readable.getTroveBeforeRedistribution(userAddress, {
                blockTag
              }),
              stabilityDeposit: this._readable.getStabilityDeposit(userAddress, { blockTag }),
              hlqtStake: this._readable.getHLQTStake(userAddress, { blockTag }),
              ownFrontend: this._readable.getFrontendStatus(userAddress, { blockTag }),
              hchfTokenAllowanceOfHchfContract: this._readable.getHchfTokenAllowanceOfHchfContract(
                userAddress,
                { blockTag }
              ),
              hlqtTokenAllowanceOfHlqtContract: this._readable.getHlqtTokenAllowanceOfHlqtContract(
                userAddress,
                { blockTag }
              )
            }
          : {
              accountBalance: Decimal.ZERO,
              hchfBalance: Decimal.ZERO,
              hlqtBalance: Decimal.ZERO,
              hchfTokenAddress: "0x",
              hlqtTokenAddress: "0x",
              uniTokenBalance: Decimal.ZERO,
              uniTokenAllowance: Decimal.ZERO,
              liquidityMiningStake: Decimal.ZERO,
              liquidityMiningHLQTReward: Decimal.ZERO,
              collateralSurplusBalance: Decimal.ZERO,
              troveBeforeRedistribution: new TroveWithPendingRedistribution(
                AddressZero,
                "nonExistent"
              ),
              stabilityDeposit: new StabilityDeposit(
                Decimal.ZERO,
                Decimal.ZERO,
                Decimal.ZERO,
                Decimal.ZERO,
                AddressZero
              ),
              hlqtStake: new HLQTStake(),
              ownFrontend: { status: "unregistered" as const },
              hchfTokenAllowanceOfHchfContract: Decimal.ZERO,
              hlqtTokenAllowanceOfHlqtContract: Decimal.ZERO
            })
      });

    return [
      {
        ...baseState,
        _feesInNormalMode: createFees(blockTimestamp, false),
        remainingLiquidityMiningHLQTReward: calculateRemainingHLQT(blockTimestamp)
      },
      {
        blockTag,
        blockTimestamp
      }
    ];
  }

  /** @internal @override */
  protected _doStart(): () => void {
    this._get().then(state => {
      if (!this._loaded) {
        this._load(...state);
      }
    });

    let doUpdate = false;
    const interval = setInterval(() => {
      doUpdate = true;
    }, 20000);

    const blockListener = async (blockTag: number) => {
      if (!doUpdate) {
        return;
      }

      doUpdate = false;
      const state = await this._get(blockTag);

      if (this._loaded) {
        this._update(...state);
      } else {
        this._load(...state);
      }
    };

    this._provider.on("block", blockListener);

    return () => {
      clearInterval(interval);
      this._provider.off("block", blockListener);
    };
  }

  public async refresh(): Promise<LiquityStoreState<BlockPolledLiquityStoreExtraState>> {
    const state = await this._get();

    if (this._loaded) {
      this._update(...state);

      return this.state;
    } else {
      this._load(...state);
      return this.state;
    }
  }

  /** @internal @override */
  protected _reduceExtra(
    oldState: BlockPolledLiquityStoreExtraState,
    stateUpdate: Partial<BlockPolledLiquityStoreExtraState>
  ): BlockPolledLiquityStoreExtraState {
    return {
      blockTag: stateUpdate.blockTag ?? oldState.blockTag,
      blockTimestamp: stateUpdate.blockTimestamp ?? oldState.blockTimestamp
    };
  }
}
