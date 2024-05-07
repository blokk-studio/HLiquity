import {
  BETA,
  Decimal,
  Fees,
  FrontendStatus,
  HLQTStake,
  HLiquityStore,
  LiquityStoreBaseState,
  MINUTE_DECAY_FACTOR,
  ReadableLiquity,
  StabilityDeposit,
  Trove,
  TroveListingParams,
  TroveWithPendingRedistribution,
  UserTrove,
  UserTroveStatus,
} from '@liquity/lib-base'
import { HashConnect } from 'hashconnect'
import Web3, { Contract, MatchPrimitiveType } from 'web3'

import { Address } from './address'
import { DeploymentAddressesKey } from './deployment'
// contracts
import { ActivePoolAbi, activePoolAbi } from '../abi/ActivePool'
import { BorrowerOperationsAbi, borrowerOperationsAbi } from '../abi/BorrowerOperations'
import { CollSurplusPoolAbi, collSurplusPoolAbi } from '../abi/CollSurplusPool'
import { CommunityIssuanceAbi, communityIssuanceAbi } from '../abi/CommunityIssuance'
import { DefaultPoolAbi, defaultPoolAbi } from '../abi/DefaultPool'
import { GasPoolAbi, gasPoolAbi } from '../abi/GasPool'
import { HCHFTokenAbi, hCHFTokenAbi } from '../abi/HCHFToken'
import { HLQTStakingAbi, hLQTStakingAbi } from '../abi/HLQTStaking'
import { HLQTTokenAbi, hLQTTokenAbi } from '../abi/HLQTToken'
import { HintHelpersAbi, hintHelpersAbi } from '../abi/HintHelpers'
import { LockupContractFactoryAbi, lockupContractFactoryAbi } from '../abi/LockupContractFactory'
import { MultiTroveGetterAbi, multiTroveGetterAbi } from '../abi/MultiTroveGetter'
import { PriceFeedAbi, priceFeedAbi } from '../abi/PriceFeed'
import { SortedTrovesAbi, sortedTrovesAbi } from '../abi/SortedTroves'
import { StabilityPoolAbi, stabilityPoolAbi } from '../abi/StabilityPool'
import { TroveManagerAbi, troveManagerAbi } from '../abi/TroveManager'
import { UnipoolAbi, unipoolAbi } from '../abi/Unipool'

export const getHashgraphLiquity = () => {}

interface HashgraphLiquityStoreState {}

enum BackendTroveStatus {
  nonExistent,
  active,
  closedByOwner,
  closedByLiquidation,
  closedByRedemption,
}

const userTroveStatusFrom = (backendStatus: BackendTroveStatus): UserTroveStatus => {
  switch (backendStatus) {
    case BackendTroveStatus.nonExistent:
      return 'nonExistent'
    case BackendTroveStatus.active:
      return 'open'
    case BackendTroveStatus.closedByOwner:
      return 'closedByOwner'
    case BackendTroveStatus.closedByLiquidation:
      return 'closedByLiquidation'
    case BackendTroveStatus.closedByRedemption:
      return 'closedByRedemption'
  }

  throw new Error(`invalid backendStatus ${backendStatus}`)
}

const decimalify = (matchPrimitiveType: MatchPrimitiveType<'uint256', unknown>) => {
  const decimal = Decimal.fromBigNumberString(matchPrimitiveType.toString())

  return decimal
}

type Resolved<T> = T extends Promise<infer U> ? U : T
type ResolvedValues<T> = { [P in keyof T]: Resolved<T[P]> }

const promiseAllValues = async <T extends Record<string, unknown>>(object: T) => {
  const entryPromises = Object.entries(object).map(async ([key, promise]) => {
    try {
      const value = await promise

      return [key, value]
    } catch (error) {
      throw error
    }
  })
  const entries = await Promise.all(entryPromises)

  return Object.fromEntries(entries) as ResolvedValues<T>
}

const AddressZero = '0x0000000000000000000000000000000000000000'

const getBlockTimestamp = async (web3: Web3, blockTag?: string | number) => {
  const block = await web3.eth.getBlock(blockTag)

  const blockTimestamp = Number(block.timestamp)

  return blockTimestamp
}

interface ContractCallOptions {
  blockTag?: string | number
}

export class HashgraphLiquity extends HLiquityStore implements ReadableLiquity {
  /* , TransactableLiquity */

  // private readonly userAccountId: AccountId
  private readonly userAccountAddress: Address
  // only use required properties, so that we don't make any mistakes (f.e. taking the account ids from hashconnect rather than the liquity instance)
  private readonly hashConnect: Pick<HashConnect, 'sendTransaction'>
  private readonly web3: Web3
  private readonly totalStabilityPoolHlqtReward: Decimal
  private readonly frontendAddress: Address

  // contracts
  private readonly activePool: Contract<ActivePoolAbi>
  private readonly borrowerOperations: Contract<BorrowerOperationsAbi>
  private readonly collSurplusPool: Contract<CollSurplusPoolAbi>
  private readonly communityIssuance: Contract<CommunityIssuanceAbi>
  private readonly defaultPool: Contract<DefaultPoolAbi>
  private readonly gasPool: Contract<GasPoolAbi>
  private readonly hchfToken: Contract<HCHFTokenAbi>
  private readonly hintHelpers: Contract<HintHelpersAbi>
  private readonly hlqtStaking: Contract<HLQTStakingAbi>
  private readonly hlqtToken: Contract<HLQTTokenAbi>
  // private readonly ierc20: Contract<IERC20Abi>
  private readonly lockupContractFactory: Contract<LockupContractFactoryAbi>
  private readonly multiTroveGetter: Contract<MultiTroveGetterAbi>
  private readonly priceFeed: Contract<PriceFeedAbi>
  private readonly sortedTroves: Contract<SortedTrovesAbi>
  private readonly stabilityPool: Contract<StabilityPoolAbi>
  private readonly troveManager: Contract<TroveManagerAbi>
  private readonly unipool: Contract<UnipoolAbi>

  private constructor(options: {
    // userAccountId: AccountId
    userAccountAddress: Address
    userHashConnect: HashConnect
    web3: Web3
    totalStabilityPoolHlqtReward: Decimal
    frontendAddress: Address
    // contracts
    activePool: Contract<ActivePoolAbi>
    borrowerOperations: Contract<BorrowerOperationsAbi>
    collSurplusPool: Contract<CollSurplusPoolAbi>
    communityIssuance: Contract<CommunityIssuanceAbi>
    defaultPool: Contract<DefaultPoolAbi>
    gasPool: Contract<GasPoolAbi>
    hchfToken: Contract<HCHFTokenAbi>
    hintHelpers: Contract<HintHelpersAbi>
    hlqtStaking: Contract<HLQTStakingAbi>
    hlqtToken: Contract<HLQTTokenAbi>
    lockupContractFactory: Contract<LockupContractFactoryAbi>
    multiTroveGetter: Contract<MultiTroveGetterAbi>
    priceFeed: Contract<PriceFeedAbi>
    sortedTroves: Contract<SortedTrovesAbi>
    stabilityPool: Contract<StabilityPoolAbi>
    troveManager: Contract<TroveManagerAbi>
    unipool: Contract<UnipoolAbi>
  }) {
    super()

    // this.userAccountId = options.userAccountId
    this.userAccountAddress = options.userAccountAddress
    this.hashConnect = options.userHashConnect
    this.web3 = options.web3
    this.totalStabilityPoolHlqtReward = options.totalStabilityPoolHlqtReward
    this.frontendAddress = options.frontendAddress

    this.activePool = options.activePool
    this.borrowerOperations = options.borrowerOperations
    this.collSurplusPool = options.collSurplusPool
    this.communityIssuance = options.communityIssuance
    this.defaultPool = options.defaultPool
    this.gasPool = options.gasPool
    this.hchfToken = options.hchfToken
    this.hintHelpers = options.hintHelpers
    this.hlqtStaking = options.hlqtStaking
    this.hlqtToken = options.hlqtToken
    // this.ierc20 = options.ierc20
    this.lockupContractFactory = options.lockupContractFactory
    this.multiTroveGetter = options.multiTroveGetter
    this.priceFeed = options.priceFeed
    this.sortedTroves = options.sortedTroves
    this.stabilityPool = options.stabilityPool
    this.troveManager = options.troveManager
    this.unipool = options.unipool
  }

  private async fetchStoreValues(
    blockTag?: string | number,
  ): Promise<[baseState: LiquityStoreBaseState, extraState: HashgraphLiquityStoreState]> {
    const { blockTimestamp, createFees, calculateRemainingHLQT, ...baseState } =
      await promiseAllValues({
        // _getFeesFactory({ blockTag }),
        // calculateRemainingHLQT: this._readable._getRemainingLiquidityMiningHLQTRewardCalculator({
        //   blockTag,
        // }),
        blockTimestamp: getBlockTimestamp(this.web3, blockTag),
        createFees: (blockTimestamp: number, isInRecoveryMode: boolean) =>
          new Fees(
            0,
            MINUTE_DECAY_FACTOR,
            BETA,
            new Date(),
            new Date(blockTimestamp * 100),
            isInRecoveryMode,
          ),
        calculateRemainingHLQT: (blockTimestamp: number) => Decimal.from(0),

        price: this.getPrice({ blockTag }),
        numberOfTroves: this.getNumberOfTroves({ blockTag }),
        totalRedistributed: this.getTotalRedistributed({ blockTag }),
        total: this.getTotal({ blockTag }),
        hchfInStabilityPool: this.getHCHFInStabilityPool({ blockTag }),
        totalStakedHLQT: this.getTotalStakedHLQT({ blockTag }),
        // _riskiestTroveBeforeRedistribution: this._getRiskiestTroveBeforeRedistribution({
        //   blockTag,
        // }),
        _riskiestTroveBeforeRedistribution: new TroveWithPendingRedistribution(
          this.userAccountAddress,
          userTroveStatusFrom(BackendTroveStatus.nonExistent),
        ),
        totalStakedUniTokens: this.getTotalStakedUniTokens({ blockTag }),
        remainingStabilityPoolHLQTReward: this.getRemainingStabilityPoolHLQTReward({
          blockTag,
        }),

        frontend: this.frontendAddress
          ? this.getFrontendStatus(this.frontendAddress, { blockTag })
          : { status: 'unregistered' as const },

        ...(this.userAccountAddress && false
          ? {
              accountBalance: this.web3.eth
                .getBalance(this.userAccountAddress, blockTag)
                .then((bigInt) =>
                  Decimal.fromBigNumberStringWithPrecision(bigInt.toString(16), 18),
                ),
              hchfBalance: this.getHCHFBalance(this.userAccountAddress, { blockTag }),
              hchfTokenAddress: this.getHCHFTokenAddress({ blockTag }),
              hlqtTokenAddress: this.getHLQTTokenAddress({ blockTag }),
              hlqtBalance: this.getHLQTBalance(this.userAccountAddress, { blockTag }),
              // uniTokenBalance: this.getUniTokenBalance(this.userAccountAddress, { blockTag }),
              // uniTokenAllowance: this.getUniTokenAllowance(this.userAccountAddress, { blockTag }),
              uniTokenBalance: Decimal.ZERO,
              uniTokenAllowance: Decimal.ZERO,
              liquidityMiningStake: this.getLiquidityMiningStake(this.userAccountAddress, {
                blockTag,
              }),
              liquidityMiningHLQTReward: this.getLiquidityMiningHLQTReward(
                this.userAccountAddress,
                {
                  blockTag,
                },
              ),
              collateralSurplusBalance: this.getCollateralSurplusBalance(this.userAccountAddress, {
                blockTag,
              }),
              troveBeforeRedistribution: this.getTroveBeforeRedistribution(
                this.userAccountAddress,
                {
                  blockTag,
                },
              ),
              stabilityDeposit: this.getStabilityDeposit(this.userAccountAddress, { blockTag }),
              hlqtStake: this.getHLQTStake(this.userAccountAddress, { blockTag }),
              ownFrontend: this.getFrontendStatus(this.userAccountAddress, { blockTag }),
            }
          : {
              accountBalance: Decimal.ZERO,
              hchfBalance: Decimal.ZERO,
              hlqtBalance: Decimal.ZERO,
              hchfTokenAddress: '0x',
              hlqtTokenAddress: '0x',
              uniTokenBalance: Decimal.ZERO,
              uniTokenAllowance: Decimal.ZERO,
              liquidityMiningStake: Decimal.ZERO,
              liquidityMiningHLQTReward: Decimal.ZERO,
              collateralSurplusBalance: Decimal.ZERO,
              troveBeforeRedistribution: new TroveWithPendingRedistribution(
                AddressZero,
                'nonExistent',
              ),
              stabilityDeposit: new StabilityDeposit(
                Decimal.ZERO,
                Decimal.ZERO,
                Decimal.ZERO,
                Decimal.ZERO,
                AddressZero,
              ),
              hlqtStake: new HLQTStake(),
              ownFrontend: { status: 'unregistered' as const },
            }),
      })

    return [
      {
        ...baseState,
        _feesInNormalMode: createFees(blockTimestamp, false),
        remainingLiquidityMiningHLQTReward: calculateRemainingHLQT(blockTimestamp),
      },
      {
        blockTag,
        blockTimestamp,
      },
    ]
  }

  // store
  protected _doStart(): () => void {
    this.fetchStoreValues().then((stateUpdates) => {
      if (this._loaded) {
        return this._update(...stateUpdates)
      }

      this._load(...stateUpdates)
    })

    const stop = () => undefined

    return stop
  }

  protected _reduceExtra(
    extraState: HashgraphLiquityStoreState,
    extraStateUpdate: Partial<HashgraphLiquityStoreState>,
  ): HashgraphLiquityStoreState {
    return {
      ...extraState,
      ...extraStateUpdate,
    }
  }

  private getAddressOrUserAddress(address?: Address): Address {
    if (address) {
      return address
    }

    return this.userAccountAddress
  }

  async getCollateralSurplusBalance(
    address?: Address,
    options?: ContractCallOptions,
  ): Promise<Decimal> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)

    const result = await this.collSurplusPool.methods
      .getCollateral(addressOrUserAddress)
      .call(undefined, options?.blockTag)
    const decimal = decimalify(result)

    return decimal
  }

  async getTotalRedistributed(options?: ContractCallOptions): Promise<Trove> {
    const [collateralResult, debtResult] = await Promise.all([
      this.troveManager.methods.L_ETH().call(undefined, options?.blockTag),
      this.troveManager.methods.L_HCHFDebt().call(undefined, options?.blockTag),
    ])

    const collateral = decimalify(collateralResult)
    const debt = decimalify(debtResult)

    return new Trove(collateral, debt)
  }

  async getTroveBeforeRedistribution(
    address?: Address,
    options?: ContractCallOptions,
  ): Promise<TroveWithPendingRedistribution> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)

    const [troveResult, snapshotResult] = await Promise.all([
      this.troveManager.methods.Troves(addressOrUserAddress).call(undefined, options?.blockTag),
      this.troveManager.methods
        .rewardSnapshots(addressOrUserAddress)
        .call(undefined, options?.blockTag),
    ])

    const userTroveStatus = userTroveStatusFrom(troveResult.status as BackendTroveStatus)

    if (troveResult.status === BackendTroveStatus.active) {
      const trove = new Trove(decimalify(snapshotResult.ETH), decimalify(snapshotResult.HCHFDebt))

      return new TroveWithPendingRedistribution(
        addressOrUserAddress,
        userTroveStatus,
        decimalify(troveResult.coll),
        decimalify(troveResult.debt),
        decimalify(troveResult.stake),
        trove,
      )
    }

    return new TroveWithPendingRedistribution(addressOrUserAddress, userTroveStatus)
  }

  async getTrove(address?: Address): Promise<UserTrove> {
    const [trove, totalRedistributed] = await Promise.all([
      this.getTroveBeforeRedistribution(address),
      this.getTotalRedistributed(),
    ])

    return trove.applyRedistribution(totalRedistributed)
  }

  async getNumberOfTroves(options?: ContractCallOptions): Promise<number> {
    const troveOwnersCountResult = await this.troveManager.methods
      .getTroveOwnersCount()
      .call(undefined, options?.blockTag)
    const troveOwnersCount = parseInt(troveOwnersCountResult.toString())

    return troveOwnersCount
  }

  async getPrice(options?: ContractCallOptions): Promise<Decimal> {
    const priceResult = await this.priceFeed.methods.fetchPrice().call(undefined, options?.blockTag)
    const price = decimalify(priceResult)

    return price
  }

  async getTotal(options?: ContractCallOptions): Promise<Trove> {
    const [activeCollateralResult, activeDebtResult, liquidatedCollateralResult, closedDebtResult] =
      await Promise.all([
        this.activePool.methods.getETH().call(undefined, options?.blockTag),
        this.activePool.methods.getHCHFDebt().call(undefined, options?.blockTag),
        this.defaultPool.methods.getETH().call(undefined, options?.blockTag),
        this.defaultPool.methods.getHCHFDebt().call(undefined, options?.blockTag),
      ])

    const activePool = new Trove(decimalify(activeCollateralResult), decimalify(activeDebtResult))
    const defaultPool = new Trove(
      decimalify(liquidatedCollateralResult),
      decimalify(closedDebtResult),
    )

    return activePool.add(defaultPool)
  }

  async getStabilityDeposit(
    address?: Address,
    options?: ContractCallOptions,
  ): Promise<StabilityDeposit> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)

    // TODO: consider using `new this.stabilityPool.BatchRequest()`
    const [depositsResult, currentHchfResult, collateralGain, hlqtReward] = await Promise.all([
      this.stabilityPool.methods.deposits(addressOrUserAddress).call(undefined, options?.blockTag),
      this.stabilityPool.methods
        .getCompoundedHCHFDeposit(addressOrUserAddress)
        .call(undefined, options?.blockTag),
      this.stabilityPool.methods
        .getDepositorETHGain(addressOrUserAddress)
        .call(undefined, options?.blockTag),
      this.stabilityPool.methods
        .getDepositorHLQTGain(addressOrUserAddress)
        .call(undefined, options?.blockTag),
    ])

    return new StabilityDeposit(
      decimalify(depositsResult.initialValue),
      decimalify(currentHchfResult),
      decimalify(collateralGain),
      decimalify(hlqtReward),
      depositsResult.frontEndTag,
    )
  }

  async getRemainingStabilityPoolHLQTReward(options?: ContractCallOptions): Promise<Decimal> {
    const issuanceCap = this.totalStabilityPoolHlqtReward
    const totalHlqtIssuedResult = await this.communityIssuance.methods
      .totalHLQTIssued()
      .call(undefined, options?.blockTag)
    const totalHlqtIssued = decimalify(totalHlqtIssuedResult)

    // totalHLQTIssued approaches but never reaches issuanceCap
    return issuanceCap.sub(totalHlqtIssued)
  }

  async getHCHFInStabilityPool(options?: ContractCallOptions): Promise<Decimal> {
    const totalHchfDepositsResult = await this.stabilityPool.methods
      .getTotalHCHFDeposits()
      .call(undefined, options?.blockTag)

    return decimalify(totalHchfDepositsResult)
  }

  async getHCHFBalance(address?: Address, options?: ContractCallOptions): Promise<Decimal> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)

    const hchfBalanceResult = await this.hchfToken.methods
      .balanceOf(addressOrUserAddress)
      .call(undefined, options?.blockTag)
    const hchfBalance = decimalify(hchfBalanceResult)

    return hchfBalance
  }

  async getHLQTTokenAddress(options?: ContractCallOptions): Promise<string> {
    const hlqtTokenAddressResult = await this.hlqtToken.methods
      .getTokenAddress()
      .call(undefined, options?.blockTag)

    return hlqtTokenAddressResult
  }

  async getHCHFTokenAddress(options?: ContractCallOptions): Promise<string> {
    const hchfTokenAddressResult = await this.hchfToken.methods
      .getTokenAddress()
      .call(undefined, options?.blockTag)

    return hchfTokenAddressResult
  }

  async getHLQTBalance(address?: Address, options?: ContractCallOptions): Promise<Decimal> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)

    const hlqtBalanceResult = await this.hlqtToken.methods
      .balanceOf(addressOrUserAddress)
      .call(undefined, options?.blockTag)
    const hlqtBalance = decimalify(hlqtBalanceResult)

    return hlqtBalance
  }

  getUniTokenBalance(address?: Address, options?: ContractCallOptions): Promise<Decimal> {
    throw new Error(
      `unitoken does not exist on hedera, i think. called getUniTokenBalance(${address ?? ''}).`,
    )
  }

  getUniTokenAllowance(address?: Address, options?: ContractCallOptions): Promise<Decimal> {
    throw new Error(
      `unitoken does not exist on hedera, i think. called getUniTokenAllowance(${address ?? ''}).`,
    )
  }

  async getRemainingLiquidityMiningHLQTReward(options?: { blockTag?: number }): Promise<Decimal> {
    const [totalSupplyResult, rewardRateResult, periodFinishResult, lastUpdateTimeResult, block] =
      await Promise.all([
        this.unipool.methods.totalSupply().call(undefined, options?.blockTag),
        this.unipool.methods.rewardRate().call(undefined, options?.blockTag),
        this.unipool.methods.periodFinish().call(undefined, options?.blockTag),
        this.unipool.methods.lastUpdateTime().call(undefined, options?.blockTag),
        this.web3.eth.getBlock(options?.blockTag),
      ])

    const totalSupply = decimalify(totalSupplyResult)
    const rewardRate = decimalify(rewardRateResult)
    const periodFinish = parseInt(periodFinishResult.toString())
    const lastUpdateTime = parseInt(lastUpdateTimeResult.toString())
    const blockTimestamp = Number(block.timestamp)

    const remainingReward = rewardRate.mul(
      Math.max(0, periodFinish - (totalSupply.eq(0) ? lastUpdateTime : blockTimestamp)),
    )

    return remainingReward
  }

  async getLiquidityMiningStake(
    address?: Address,
    options?: ContractCallOptions,
  ): Promise<Decimal> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)

    const balanceResult = await this.unipool.methods
      .balanceOf(addressOrUserAddress)
      .call(undefined, options?.blockTag)
    const balance = decimalify(balanceResult)

    return balance
  }

  async getTotalStakedUniTokens(options?: ContractCallOptions): Promise<Decimal> {
    const totalSupplyResult = await this.unipool.methods
      .totalSupply()
      .call(undefined, options?.blockTag)
    const totalSupply = decimalify(totalSupplyResult)

    return totalSupply
  }

  async getLiquidityMiningHLQTReward(
    address?: Address,
    options?: ContractCallOptions,
  ): Promise<Decimal> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)

    const earnedResult = await this.unipool.methods
      .earned(addressOrUserAddress)
      .call(undefined, options?.blockTag)
    const earned = decimalify(earnedResult)

    return earned
  }

  /** @internal */
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    options?: ContractCallOptions,
  ): Promise<TroveWithPendingRedistribution[]>

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.(getTroves:2)} */
  getTroves(params: TroveListingParams, options?: ContractCallOptions): Promise<UserTrove[]>

  async getTroves(params: TroveListingParams, options?: ContractCallOptions): Promise<UserTrove[]> {
    const expectPositiveInt = <K extends string>(obj: { [P in K]?: number }, key: K) => {
      const value: number | undefined = obj[key]
      if (value !== undefined) {
        if (!Number.isInteger(value)) {
          throw new Error(`${key} must be an integer`)
        }

        if (value < 0) {
          throw new Error(`${key} must not be negative`)
        }
      }
    }

    expectPositiveInt(params, 'first')
    expectPositiveInt(params, 'startingAt')

    const validSortingOptions = ['ascendingCollateralRatio', 'descendingCollateralRatio']

    if (!validSortingOptions.includes(params.sortedBy)) {
      throw new Error(
        `sortedBy must be one of: ${validSortingOptions.map((x) => `"${x}"`).join(', ')}`,
      )
    }

    const [totalRedistributed, backendTroves] = await Promise.all([
      params.beforeRedistribution ? undefined : this.getTotalRedistributed(options),
      this.multiTroveGetter.methods
        .getMultipleSortedTroves(
          params.sortedBy === 'descendingCollateralRatio'
            ? params.startingAt ?? 0
            : -((params.startingAt ?? 0) + 1),
          params.first,
        )
        .call(undefined, options?.blockTag),
    ])

    const troves = backendTroves.map((backendTrove) => {
      const trove = new Trove(
        decimalify(backendTrove.snapshotETH),
        decimalify(backendTrove.snapshotHCHFDebt),
      )
      const troveWithPendingRedistribution = new TroveWithPendingRedistribution(
        backendTrove.owner,
        'open', // These Troves are coming from the SortedTroves list, so they must be open
        decimalify(backendTrove.coll),
        decimalify(backendTrove.debt),
        decimalify(backendTrove.stake),
        trove,
      )

      return troveWithPendingRedistribution
    })

    if (totalRedistributed) {
      return troves.map((trove) => trove.applyRedistribution(totalRedistributed))
    }

    return troves
  }

  async getFees(options?: ContractCallOptions): Promise<Fees> {
    const [lastFeeOperationTimeResult, baseRateResult, total, price, block] = await Promise.all([
      this.troveManager.methods.lastFeeOperationTime().call(undefined, options?.blockTag),
      this.troveManager.methods.baseRate().call(undefined, options?.blockTag),
      this.getTotal(options),
      this.getPrice(options),
      this.web3.eth.getBlock(options?.blockTag),
    ])

    const baseRateWithoutDecay = decimalify(baseRateResult)

    const lastFeeOperationTimestamp = parseInt(lastFeeOperationTimeResult.toString())
    const lastFeeOperationDate = new Date(lastFeeOperationTimestamp * 1000)
    const blockTimestamp = Number(block.timestamp)
    const timeOfLatestBlock = new Date(blockTimestamp * 1000)

    const fees = new Fees(
      baseRateWithoutDecay,
      MINUTE_DECAY_FACTOR,
      BETA,
      lastFeeOperationDate,
      timeOfLatestBlock,
      total.collateralRatioIsBelowCritical(price),
    )

    return fees
  }

  async getHLQTStake(address?: Address, options?: ContractCallOptions): Promise<HLQTStake> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)

    const [stakesResult, pendingCollateralGainResult, pendingHchfGainResult] = await Promise.all([
      this.hlqtStaking.methods.stakes(addressOrUserAddress).call(undefined, options?.blockTag),
      this.hlqtStaking.methods
        .getPendingETHGain(addressOrUserAddress)
        .call(undefined, options?.blockTag),
      this.hlqtStaking.methods
        .getPendingHCHFGain(addressOrUserAddress)
        .call(undefined, options?.blockTag),
    ])
    const stakedHLQT = decimalify(stakesResult)
    const collateralGain = decimalify(pendingCollateralGainResult)
    const hchfGain = decimalify(pendingHchfGainResult)

    const hlqtStake = new HLQTStake(stakedHLQT, collateralGain, hchfGain)

    return hlqtStake
  }

  async getTotalStakedHLQT(options?: ContractCallOptions): Promise<Decimal> {
    const totalStakedHlqtResult = await this.hlqtStaking.methods
      .totalHLQTStaked()
      .call(undefined, options?.blockTag)
    const totalStakedHlqt = decimalify(totalStakedHlqtResult)

    return totalStakedHlqt
  }

  async getFrontendStatus(
    address?: string,
    options?: ContractCallOptions,
  ): Promise<FrontendStatus> {
    const frontendAddress = address ?? this.frontendAddress

    const { registered, kickbackRate } = await this.stabilityPool.methods
      .frontEnds(frontendAddress)
      .call(undefined, options?.blockTag)

    if (registered) {
      return { status: 'registered', kickbackRate: decimalify(kickbackRate) }
    }

    return { status: 'unregistered' }
  }

  public static fromEvmAddresses(options: {
    deploymentAddresses: Record<DeploymentAddressesKey, Address>
    totalStabilityPoolHlqtReward: number
    frontendAddress: Address
    // userAccountId: AccountId
    userAccountAddress: Address
    userHashConnect: HashConnect
    rpcUrl: `wss://${string}` | `https://${string}`
  }) {
    const web3 = new Web3(options.rpcUrl)
    const totalStabilityPoolHlqtReward = Decimal.from(options.totalStabilityPoolHlqtReward)

    const activePool = new web3.eth.Contract(activePoolAbi, options.deploymentAddresses.activePool)
    const borrowerOperations = new web3.eth.Contract(
      borrowerOperationsAbi,
      options.deploymentAddresses.borrowerOperations,
    )
    const collSurplusPool = new web3.eth.Contract(
      collSurplusPoolAbi,
      options.deploymentAddresses.collSurplusPool,
    )
    const communityIssuance = new web3.eth.Contract(
      communityIssuanceAbi,
      options.deploymentAddresses.communityIssuance,
    )
    const defaultPool = new web3.eth.Contract(
      defaultPoolAbi,
      options.deploymentAddresses.defaultPool,
    )
    const gasPool = new web3.eth.Contract(gasPoolAbi, options.deploymentAddresses.gasPool)
    const hchfToken = new web3.eth.Contract(hCHFTokenAbi, options.deploymentAddresses.hchfToken)
    const hintHelpers = new web3.eth.Contract(
      hintHelpersAbi,
      options.deploymentAddresses.hintHelpers,
    )
    const hlqtStaking = new web3.eth.Contract(
      hLQTStakingAbi,
      options.deploymentAddresses.hlqtStaking,
    )
    const hlqtToken = new web3.eth.Contract(hLQTTokenAbi, options.deploymentAddresses.hlqtToken)
    const lockupContractFactory = new web3.eth.Contract(
      lockupContractFactoryAbi,
      options.deploymentAddresses.lockupContractFactory,
    )
    const multiTroveGetter = new web3.eth.Contract(
      multiTroveGetterAbi,
      options.deploymentAddresses.multiTroveGetter,
    )
    const priceFeed = new web3.eth.Contract(priceFeedAbi, options.deploymentAddresses.priceFeed)
    const sortedTroves = new web3.eth.Contract(
      sortedTrovesAbi,
      options.deploymentAddresses.sortedTroves,
    )
    const stabilityPool = new web3.eth.Contract(
      stabilityPoolAbi,
      options.deploymentAddresses.stabilityPool,
    )
    const troveManager = new web3.eth.Contract(
      troveManagerAbi,
      options.deploymentAddresses.troveManager,
    )
    const unipool = new web3.eth.Contract(unipoolAbi, options.deploymentAddresses.unipool)

    const { userHashConnect, userAccountAddress, frontendAddress } = options

    const hashgraphLiquity = new HashgraphLiquity({
      userAccountAddress,
      userHashConnect,
      web3,
      totalStabilityPoolHlqtReward,
      frontendAddress,
      // contracts
      collSurplusPool,
      communityIssuance,
      defaultPool,
      gasPool,
      hchfToken,
      hintHelpers,
      hlqtStaking,
      hlqtToken,
      lockupContractFactory,
      multiTroveGetter,
      priceFeed,
      sortedTroves,
      stabilityPool,
      activePool,
      borrowerOperations,
      troveManager,
      unipool,
    })

    return hashgraphLiquity
  }
}
