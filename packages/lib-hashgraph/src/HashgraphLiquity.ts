import {
  BETA,
  Decimal,
  Decimalish,
  Fees,
  FrontendStatus,
  HLQTStake,
  HLiquityStore,
  LiquityReceipt,
  LiquityStoreBaseState,
  LiquityStoreState,
  MINUTE_DECAY_FACTOR,
  MinedReceipt,
  PopulatableLiquity,
  PopulatedLiquityTransaction,
  ReadableLiquity,
  SendableLiquity,
  SentLiquityTransaction,
  StabilityDeposit,
  Trove,
  TroveAdjustmentDetails,
  TroveAdjustmentParams,
  TroveListingParams,
  TroveWithPendingRedistribution,
  UserTrove,
  _normalizeTroveAdjustment,
} from '@liquity/lib-base'
import { BigNumber } from 'bignumber.js'
import { HashConnect } from 'hashconnect'
import Web3, { Contract, MatchPrimitiveType } from 'web3'

import { Address } from './address'
import { DeploymentAddressesKey } from './deployment'
// contracts
import {
  AccountId,
  ContractExecuteTransaction,
  ContractId,
  Hbar,
  TransactionReceipt,
  TransactionResponse,
} from '@hashgraph/sdk'
import { default as Emittery } from 'emittery'
import { EventEmitter } from 'node:events'
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
import {
  TypedContractExecuteTransaction,
  TypedContractFunctionParameters,
} from './contract_functions'
import { LiquityEvents } from './events'
import { gasForPotentialLastFeeOperationTimeUpdate, gasForPotentialListTraversal } from './gas'
import { generateTrials } from './hints'
import { PrefixProperties } from './interface_collision'
import { asPopulatable } from './populatable'
import { asSendable } from './sendable'
import { getLiquityReceiptStatus } from './transactions'
import { BackendTroveStatus, userTroveStatusFrom } from './trove_status'
import { getBlockTimestamp } from './web3'

export const getHashgraphLiquity = () => {}

interface HashgraphLiquityStoreState {}

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

interface ContractCallOptions {
  blockTag?: string | number
}

interface TransactionOptions {
  from?: Address
}

const defaultBorrowingRateSlippageTolerance = Decimal.from(0.005) // 0.5%
const defaultRedemptionRateSlippageTolerance = Decimal.from(0.001) // 0.1%

export class HashgraphLiquity
  extends HLiquityStore<HashgraphLiquityStoreState>
  implements
    ReadableLiquity,
    PrefixProperties<Readonly<SendableLiquity>, 'send'>,
    PrefixProperties<Readonly<PopulatableLiquity>, 'populate'>,
    // PrefixProperties<Readonly<TransactableLiquity>, 'transact'>,
    EventEmitter
{
  // TODO: fix shitty interface design lasagna and remove this. use events for the different stages of the transaction.
  public store: HLiquityStore = this
  public readonly send: SendableLiquity
  public readonly populate: PopulatableLiquity

  private readonly eventEmitter: Emittery<LiquityEvents>

  private readonly userAccountId: AccountId
  private readonly userAccountAddress: Address
  // don't use account ids from the hashconnect instance.
  private readonly hashConnect: Omit<HashConnect, 'connectedAccountIds'>
  private readonly web3: Web3
  private readonly totalStabilityPoolHlqtReward: Decimal
  private readonly frontendAddress: Address

  // contracts
  private readonly activePool: Contract<ActivePoolAbi>
  private readonly activePoolContractId: ContractId
  private readonly borrowerOperations: Contract<BorrowerOperationsAbi>
  private readonly borrowerOperationsContractId: ContractId
  private readonly collSurplusPool: Contract<CollSurplusPoolAbi>
  private readonly collSurplusPoolContractId: ContractId
  private readonly communityIssuance: Contract<CommunityIssuanceAbi>
  private readonly communityIssuanceContractId: ContractId
  private readonly defaultPool: Contract<DefaultPoolAbi>
  private readonly defaultPoolContractId: ContractId
  private readonly gasPool: Contract<GasPoolAbi>
  private readonly gasPoolContractId: ContractId
  private readonly hchfToken: Contract<HCHFTokenAbi>
  private readonly hchfTokenContractId: ContractId
  private readonly hintHelpers: Contract<HintHelpersAbi>
  private readonly hintHelpersContractId: ContractId
  private readonly hlqtStaking: Contract<HLQTStakingAbi>
  private readonly hlqtStakingContractId: ContractId
  private readonly hlqtToken: Contract<HLQTTokenAbi>
  private readonly hlqtTokenContractId: ContractId
  private readonly lockupContractFactory: Contract<LockupContractFactoryAbi>
  private readonly lockupContractFactoryContractId: ContractId
  private readonly multiTroveGetter: Contract<MultiTroveGetterAbi>
  private readonly multiTroveGetterContractId: ContractId
  private readonly priceFeed: Contract<PriceFeedAbi>
  private readonly priceFeedContractId: ContractId
  private readonly sortedTroves: Contract<SortedTrovesAbi>
  private readonly sortedTrovesContractId: ContractId
  private readonly stabilityPool: Contract<StabilityPoolAbi>
  private readonly stabilityPoolContractId: ContractId
  private readonly troveManager: Contract<TroveManagerAbi>
  private readonly troveManagerContractId: ContractId
  private readonly saucerSwapPool: Contract<UnipoolAbi>
  private readonly saucerSwapPoolContractId: ContractId

  private constructor(options: {
    userAccountId: AccountId
    userAccountAddress: Address
    userHashConnect: HashConnect
    web3: Web3
    totalStabilityPoolHlqtReward: Decimal
    frontendAddress: Address
    // contracts
    activePool: Contract<ActivePoolAbi>
    activePoolContractId: ContractId
    borrowerOperations: Contract<BorrowerOperationsAbi>
    borrowerOperationsContractId: ContractId
    collSurplusPool: Contract<CollSurplusPoolAbi>
    collSurplusPoolContractId: ContractId
    communityIssuance: Contract<CommunityIssuanceAbi>
    communityIssuanceContractId: ContractId
    defaultPool: Contract<DefaultPoolAbi>
    defaultPoolContractId: ContractId
    gasPool: Contract<GasPoolAbi>
    gasPoolContractId: ContractId
    hchfToken: Contract<HCHFTokenAbi>
    hchfTokenContractId: ContractId
    hintHelpers: Contract<HintHelpersAbi>
    hintHelpersContractId: ContractId
    hlqtStaking: Contract<HLQTStakingAbi>
    hlqtStakingContractId: ContractId
    hlqtToken: Contract<HLQTTokenAbi>
    hlqtTokenContractId: ContractId
    lockupContractFactory: Contract<LockupContractFactoryAbi>
    lockupContractFactoryContractId: ContractId
    multiTroveGetter: Contract<MultiTroveGetterAbi>
    multiTroveGetterContractId: ContractId
    priceFeed: Contract<PriceFeedAbi>
    priceFeedContractId: ContractId
    sortedTroves: Contract<SortedTrovesAbi>
    sortedTrovesContractId: ContractId
    stabilityPool: Contract<StabilityPoolAbi>
    stabilityPoolContractId: ContractId
    troveManager: Contract<TroveManagerAbi>
    troveManagerContractId: ContractId
    saucerSwapPool: Contract<UnipoolAbi>
    saucerSwapPoolContractId: ContractId
  }) {
    super()

    this.eventEmitter = new Emittery()

    this.userAccountId = options.userAccountId
    this.userAccountAddress = options.userAccountAddress
    this.hashConnect = options.userHashConnect
    this.web3 = options.web3
    this.totalStabilityPoolHlqtReward = options.totalStabilityPoolHlqtReward
    this.frontendAddress = options.frontendAddress

    this.activePool = options.activePool
    this.activePoolContractId = options.activePoolContractId

    this.borrowerOperations = options.borrowerOperations
    this.borrowerOperationsContractId = options.borrowerOperationsContractId

    this.collSurplusPool = options.collSurplusPool
    this.collSurplusPoolContractId = options.collSurplusPoolContractId

    this.communityIssuance = options.communityIssuance
    this.communityIssuanceContractId = options.communityIssuanceContractId

    this.defaultPool = options.defaultPool
    this.defaultPoolContractId = options.defaultPoolContractId

    this.gasPool = options.gasPool
    this.gasPoolContractId = options.gasPoolContractId

    this.hchfToken = options.hchfToken
    this.hchfTokenContractId = options.hchfTokenContractId

    this.hintHelpers = options.hintHelpers
    this.hintHelpersContractId = options.hintHelpersContractId

    this.hlqtStaking = options.hlqtStaking
    this.hlqtStakingContractId = options.hlqtStakingContractId

    this.hlqtToken = options.hlqtToken
    this.hlqtTokenContractId = options.hlqtTokenContractId

    this.lockupContractFactory = options.lockupContractFactory
    this.lockupContractFactoryContractId = options.lockupContractFactoryContractId

    this.multiTroveGetter = options.multiTroveGetter
    this.multiTroveGetterContractId = options.multiTroveGetterContractId

    this.priceFeed = options.priceFeed
    this.priceFeedContractId = options.priceFeedContractId

    this.sortedTroves = options.sortedTroves
    this.sortedTrovesContractId = options.sortedTrovesContractId

    this.stabilityPool = options.stabilityPool
    this.stabilityPoolContractId = options.stabilityPoolContractId

    this.troveManager = options.troveManager
    this.troveManagerContractId = options.troveManagerContractId

    this.saucerSwapPool = options.saucerSwapPool
    this.saucerSwapPoolContractId = options.saucerSwapPoolContractId

    this.populate = asPopulatable(this)
    this.send = asSendable(this)
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
        userHasAssociatedWithHchf: false,
        userHasAssociatedWithHlqt: false,

        ...(this.userAccountAddress
          ? {
              accountBalance: this.web3.eth
                .getBalance(this.userAccountAddress, blockTag)
                .then((bigInt) =>
                  Decimal.fromBigNumberStringWithPrecision(`0x${bigInt.toString(16)}`, 18),
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

  async refresh(): Promise<LiquityStoreState<HashgraphLiquityStoreState>> {
    const stateUpdates = await this.fetchStoreValues()

    if (this._loaded) {
      this._update(...stateUpdates)

      return this.state
    }

    this._load(...stateUpdates)

    return this.state
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

    const backendTroveStatus = parseInt(troveResult.status.toString())
    const userTroveStatus = userTroveStatusFrom(parseInt(troveResult.status.toString()))

    if (backendTroveStatus === BackendTroveStatus.active) {
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
        this.saucerSwapPool.methods.totalSupply().call(undefined, options?.blockTag),
        this.saucerSwapPool.methods.rewardRate().call(undefined, options?.blockTag),
        this.saucerSwapPool.methods.periodFinish().call(undefined, options?.blockTag),
        this.saucerSwapPool.methods.lastUpdateTime().call(undefined, options?.blockTag),
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

    const balanceResult = await this.saucerSwapPool.methods
      .balanceOf(addressOrUserAddress)
      .call(undefined, options?.blockTag)
    const balance = decimalify(balanceResult)

    return balance
  }

  async getTotalStakedUniTokens(options?: ContractCallOptions): Promise<Decimal> {
    const totalSupplyResult = await this.saucerSwapPool.methods
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

    const earnedResult = await this.saucerSwapPool.methods
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
    userAccountId: AccountId
    userAccountAddress: Address
    userHashConnect: HashConnect
    rpcUrl: `wss://${string}` | `https://${string}`
  }) {
    const web3 = new Web3(options.rpcUrl)
    const totalStabilityPoolHlqtReward = Decimal.from(options.totalStabilityPoolHlqtReward)

    const activePool = new web3.eth.Contract(activePoolAbi, options.deploymentAddresses.activePool)
    const activePoolContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.activePool,
    )

    const borrowerOperations = new web3.eth.Contract(
      borrowerOperationsAbi,
      options.deploymentAddresses.borrowerOperations,
    )
    const borrowerOperationsContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.borrowerOperations,
    )

    const collSurplusPool = new web3.eth.Contract(
      collSurplusPoolAbi,
      options.deploymentAddresses.collSurplusPool,
    )
    const collSurplusPoolContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.collSurplusPool,
    )

    const communityIssuance = new web3.eth.Contract(
      communityIssuanceAbi,
      options.deploymentAddresses.communityIssuance,
    )
    const communityIssuanceContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.communityIssuance,
    )

    const defaultPool = new web3.eth.Contract(
      defaultPoolAbi,
      options.deploymentAddresses.defaultPool,
    )
    const defaultPoolContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.defaultPool,
    )

    const gasPool = new web3.eth.Contract(gasPoolAbi, options.deploymentAddresses.gasPool)
    const gasPoolContractId = ContractId.fromEvmAddress(0, 0, options.deploymentAddresses.gasPool)

    const hchfToken = new web3.eth.Contract(hCHFTokenAbi, options.deploymentAddresses.hchfToken)
    const hchfTokenContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.hchfToken,
    )

    const hintHelpers = new web3.eth.Contract(
      hintHelpersAbi,
      options.deploymentAddresses.hintHelpers,
    )
    const hintHelpersContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.hintHelpers,
    )

    const hlqtStaking = new web3.eth.Contract(
      hLQTStakingAbi,
      options.deploymentAddresses.hlqtStaking,
    )
    const hlqtStakingContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.hlqtStaking,
    )

    const hlqtToken = new web3.eth.Contract(hLQTTokenAbi, options.deploymentAddresses.hlqtToken)
    const hlqtTokenContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.hlqtToken,
    )

    const lockupContractFactory = new web3.eth.Contract(
      lockupContractFactoryAbi,
      options.deploymentAddresses.lockupContractFactory,
    )
    const lockupContractFactoryContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.lockupContractFactory,
    )

    const multiTroveGetter = new web3.eth.Contract(
      multiTroveGetterAbi,
      options.deploymentAddresses.multiTroveGetter,
    )
    const multiTroveGetterContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.multiTroveGetter,
    )

    const priceFeed = new web3.eth.Contract(priceFeedAbi, options.deploymentAddresses.priceFeed)
    const priceFeedContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.priceFeed,
    )

    const sortedTroves = new web3.eth.Contract(
      sortedTrovesAbi,
      options.deploymentAddresses.sortedTroves,
    )
    const sortedTrovesContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.sortedTroves,
    )

    const stabilityPool = new web3.eth.Contract(
      stabilityPoolAbi,
      options.deploymentAddresses.stabilityPool,
    )
    const stabilityPoolContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.stabilityPool,
    )

    const troveManager = new web3.eth.Contract(
      troveManagerAbi,
      options.deploymentAddresses.troveManager,
    )
    const troveManagerContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.troveManager,
    )

    const saucerSwapPool = new web3.eth.Contract(
      unipoolAbi,
      options.deploymentAddresses.saucerSwapPool,
    )
    const saucerSwapPoolContractId = ContractId.fromEvmAddress(
      0,
      0,
      options.deploymentAddresses.saucerSwapPool,
    )

    const { userHashConnect, userAccountId, userAccountAddress, frontendAddress } = options

    const hashgraphLiquity = new HashgraphLiquity({
      userAccountId,
      userAccountAddress,
      userHashConnect,
      web3,
      totalStabilityPoolHlqtReward,
      frontendAddress,
      // contracts
      collSurplusPool,
      collSurplusPoolContractId,
      communityIssuance,
      communityIssuanceContractId,
      defaultPool,
      defaultPoolContractId,
      gasPool,
      gasPoolContractId,
      hchfToken,
      hchfTokenContractId,
      hintHelpers,
      hintHelpersContractId,
      hlqtStaking,
      hlqtStakingContractId,
      hlqtToken,
      hlqtTokenContractId,
      lockupContractFactory,
      lockupContractFactoryContractId,
      multiTroveGetter,
      multiTroveGetterContractId,
      priceFeed,
      priceFeedContractId,
      sortedTroves,
      sortedTrovesContractId,
      stabilityPool,
      stabilityPoolContractId,
      activePool,
      activePoolContractId,
      borrowerOperations,
      borrowerOperationsContractId,
      troveManager,
      troveManagerContractId,
      saucerSwapPool,
      saucerSwapPoolContractId,
    })

    return hashgraphLiquity
  }

  // event emitter
  on<Event extends keyof LiquityEvents>(
    event: Event,
    listener: (event: LiquityEvents[Event]) => void,
  ): this {
    this.eventEmitter.on(event, listener)

    return this
  }

  addListener<Event extends keyof LiquityEvents>(
    event: Event,
    listener: (event: LiquityEvents[Event]) => void,
  ): this {
    this.eventEmitter.on(event, listener)

    return this
  }

  once<Event extends keyof LiquityEvents>(
    event: Event,
    listener: (event: LiquityEvents[Event]) => void,
  ): this {
    this.eventEmitter.once(event).then(listener)

    return this
  }

  off<Event extends keyof LiquityEvents>(
    event: Event,
    listener: (event: LiquityEvents[Event]) => void,
  ): this {
    this.eventEmitter.off(event, listener)

    return this
  }

  removeListener<Event extends keyof LiquityEvents>(
    event: Event,
    listener: (event: LiquityEvents[Event]) => void,
  ): this {
    this.eventEmitter.off(event, listener)

    return this
  }

  removeAllListeners<Event extends keyof LiquityEvents>(event: Event): this {
    this.eventEmitter.clearListeners(event)

    return this
  }

  emit<Event extends keyof LiquityEvents>(event: Event, data: LiquityEvents[Event]) {
    this.eventEmitter.emit(event, data)

    return true
  }

  listenerCount<Event extends keyof LiquityEvents>(event: Event): number {
    return this.eventEmitter.listenerCount(event)
  }

  eventNames(): (keyof LiquityEvents)[] {
    const eventNames = (['depositCollateral'] as const)
      .map(
        (actionName) =>
          [
            `${actionName}/transactionSent`,
            `${actionName}/transactionReceiptReceived`,
            `${actionName}/storeRefreshedAfterTransactionReceiptReceived`,
          ] as const,
      )
      .flat()

    return eventNames
  }

  /** @deprecated this is not implemented and will throw an error */
  setMaxListeners(n: number): this {
    throw new Error('not implemented as there is no usage of this')
  }

  /** @deprecated this is not implemented and will throw an error */
  getMaxListeners(): number {
    throw new Error('not implemented as there is no usage of this')
  }

  /** @deprecated this is not implemented and will throw an error */
  listeners(event: string | symbol): Function[] {
    throw new Error('not implemented as there is no usage of this')
  }

  /** @deprecated this is not implemented and will throw an error */
  rawListeners(event: string | symbol): Function[] {
    throw new Error('not implemented as there is no usage of this')
  }

  /** @deprecated this is not implemented and will throw an error */
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error('not implemented as there is no usage of this')
  }

  /** @deprecated this is not implemented and will throw an error */
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error('not implemented as there is no usage of this')
  }

  private async _findHintsForNominalCollateralRatio(
    nominalCollateralRatio: Decimal,
  ): Promise<[Address, Address]> {
    const numberOfTroves = await this.getNumberOfTroves()

    if (!numberOfTroves) {
      return [AddressZero, AddressZero]
    }

    if (nominalCollateralRatio.infinite) {
      const firstSortedTroveResult = await this.sortedTroves.methods.getFirst().call()
      return [AddressZero, firstSortedTroveResult as Address]
    }

    const totalNumberOfTrials = Math.ceil(10 * Math.sqrt(numberOfTroves))
    const [firstTrials, ...restOfTrials] = generateTrials(totalNumberOfTrials)

    const collectApproxHint = async (
      previous: {
        latestRandomSeed: Number
        results: { diff: Decimal; hintAddress: string }[]
      },
      numberOfTrials: number,
    ) => {
      const approxHintResult = await this.hintHelpers.methods
        .getApproxHint(nominalCollateralRatio.hex, numberOfTrials, previous.latestRandomSeed)
        .call()

      const { hintAddress } = approxHintResult
      const latestRandomSeed = parseInt(approxHintResult.latestRandomSeed.toString())
      const diff = decimalify(approxHintResult.diff)
      const result = {
        diff,
        hintAddress,
      }

      return {
        latestRandomSeed,
        results: [...previous.results, result],
      }
    }

    const { results } = await restOfTrials.reduce(
      (previous, numberOfTrials) =>
        previous.then((state) => collectApproxHint(state, numberOfTrials)),
      collectApproxHint(
        { latestRandomSeed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER), results: [] },
        firstTrials,
      ),
    )

    const { hintAddress } = results.reduce((a, b) => (a.diff.lt(b.diff) ? a : b))

    const findInsertPositionResult = await this.sortedTroves.methods
      .findInsertPosition(nominalCollateralRatio.hex, hintAddress, hintAddress)
      .call()

    return [findInsertPositionResult[0] as Address, findInsertPositionResult[1] as Address]
  }

  // sendable
  async populateAdjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedLiquityTransaction<
      ContractExecuteTransaction,
      SentLiquityTransaction<
        TransactionResponse,
        LiquityReceipt<TransactionReceipt, TroveAdjustmentDetails>
      >
    >
  > {
    const address = this.getAddressOrUserAddress(options?.from)

    const normalized = _normalizeTroveAdjustment(params)
    const { depositCollateral, withdrawCollateral, borrowHCHF, repayHCHF } = normalized

    const [trove, fees] = await Promise.all([this.getTrove(address), borrowHCHF && this.getFees()])

    const borrowingRate = fees?.borrowingRate()
    const finalTrove = trove.adjust(normalized, borrowingRate)

    if (finalTrove instanceof TroveWithPendingRedistribution) {
      throw new Error('Rewards must be applied to this Trove')
    }

    maxBorrowingRate =
      maxBorrowingRate !== undefined
        ? Decimal.from(maxBorrowingRate)
        : borrowingRate?.add(defaultBorrowingRateSlippageTolerance) ?? Decimal.ZERO

    const hints = await this._findHintsForNominalCollateralRatio(finalTrove._nominalCollateralRatio)

    let amount: Hbar = Hbar.fromTinybars(0)
    if (depositCollateral !== undefined) {
      amount = Hbar.fromString(depositCollateral.toString())
    }
    let gas = 3000000
    gas += gasForPotentialListTraversal
    if (borrowHCHF) {
      gas += gasForPotentialLastFeeOperationTimeUpdate
    }

    const functionParameters = TypedContractFunctionParameters<
      BorrowerOperationsAbi,
      'adjustTrove'
    >()
    functionParameters
      .addUint256(new BigNumber(maxBorrowingRate.hex))
      .addUint256(new BigNumber((withdrawCollateral ?? Decimal.ZERO).hex))
      .addUint256(new BigNumber((borrowHCHF ?? repayHCHF ?? Decimal.ZERO).hex))
      .addBool(!!borrowHCHF)
      .addAddress(hints[0])
      .addAddress(hints[1])

    const unfrozenTransaction = TypedContractExecuteTransaction<BorrowerOperationsAbi>({
      contractId: this.borrowerOperationsContractId,
      functionName: 'adjustTrove',
      functionParameters,
      hbar: amount,
      gas,
    })

    const signer = this.hashConnect.getSigner(this.userAccountId)
    const rawPopulatedTransaction = await unfrozenTransaction.freezeWithSigner(signer)

    const send = async (): Promise<
      SentLiquityTransaction<
        TransactionResponse,
        LiquityReceipt<TransactionReceipt, TroveAdjustmentDetails>
      >
    > => {
      // TODO: get arkhia websocket to work so we can subscribe to events
      // const updatedTrovePromise = new Promise<Trove>((resolve, reject) => {
      //   try {
      //     const eventEmitter = this.borrowerOperations.events.TroveUpdated()
      //     const resolveWithData = (eventLog: EventLog) => {
      //       eventEmitter.off('error', rejectWithError)

      //       const returnValues = eventLog.returnValues as {
      //         _coll: MatchPrimitiveType<'uint256', unknown>
      //         _debt: MatchPrimitiveType<'uint256', unknown>
      //       }
      //       const trove = new Trove(decimalify(returnValues._coll), decimalify(returnValues._debt))

      //       console.trace({ 'borrowerOperations.events.TroveUpdated() returnValues': returnValues })

      //       resolve(trove)
      //     }
      //     const rejectWithError = (error: Error) => {
      //       eventEmitter.off('data', resolveWithData)

      //       reject(error)
      //     }
      //     eventEmitter.once('data', resolveWithData)
      //     eventEmitter.once('error', rejectWithError)
      //   } catch (updatedTrovePromiseSetupError) {
      //   }
      // })
      // const paidHchfBorrowingFeePromise = new Promise<Decimal>((resolve, reject) => {
      //   const eventEmitter = this.borrowerOperations.methods.HCHFBorrowingFeePaid().call()
      //   const resolveWithData = (eventLog: EventLog) => {
      //     eventEmitter.off('error', rejectWithError)

      //     const returnValues = eventLog.returnValues as {
      //       _HCHFFee: MatchPrimitiveType<'uint256', unknown>
      //     }
      //     const fee = decimalify(returnValues._HCHFFee)

      //     console.trace({
      //       'borrowerOperations.events.HCHFBorrowingFeePaid() returnValues': returnValues,
      //     })

      //     resolve(fee)
      //   }
      //   const rejectWithError = (error: Error) => {
      //     eventEmitter.off('data', resolveWithData)

      //     reject(error)
      //   }
      //   eventEmitter.once('data', resolveWithData)
      //   eventEmitter.once('error', rejectWithError)
      // })

      const rawSentTransaction = await rawPopulatedTransaction.executeWithSigner(signer)

      const waitForReceipt = async (): Promise<
        MinedReceipt<TransactionReceipt, TroveAdjustmentDetails>
      > => {
        // wait for the receipt before querying
        const rawReceipt = await rawSentTransaction.getReceiptWithSigner(signer)
        const newStoreState = await this.refresh()
        const updatedTrove = newStoreState.trove
        const paidHchfBorrowingFee = newStoreState.fees.borrowingRate(new Date())

        const details: TroveAdjustmentDetails = {
          params: normalized,
          fee: paidHchfBorrowingFee,
          newTrove: updatedTrove,
        }
        const status = getLiquityReceiptStatus(rawReceipt.status)

        if (status === 'pending') {
          // this should never actually happen
          throw new Error(
            'TODO: figure out how to wait for the transaction to not be pending anymore.',
          )
        }

        return {
          status,
          rawReceipt,
          details,
        }
      }

      return {
        rawSentTransaction,
        waitForReceipt,
        getReceipt: waitForReceipt,
      }
    }

    const populatedTransaction: PopulatedLiquityTransaction<
      ContractExecuteTransaction,
      SentLiquityTransaction<
        TransactionResponse,
        LiquityReceipt<TransactionReceipt, TroveAdjustmentDetails>
      >
    > = {
      rawPopulatedTransaction,
      send,
    }

    // TODO: remaining parameters
    return populatedTransaction
  }

  async sendAdjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    SentLiquityTransaction<
      TransactionResponse,
      LiquityReceipt<TransactionReceipt, TroveAdjustmentDetails>
    >
  > {
    const populatedAdjustTrove = await this.populateAdjustTrove(params, maxBorrowingRate, options)

    const receipt = await populatedAdjustTrove.send()

    return receipt
  }

  async populateDepositCollateral(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedLiquityTransaction<
      ContractExecuteTransaction,
      SentLiquityTransaction<
        TransactionResponse,
        LiquityReceipt<TransactionReceipt, TroveAdjustmentDetails>
      >
    >
  > {
    const populateDepositCollateral = await this.populateAdjustTrove(
      { depositCollateral: amount },
      undefined,
      options,
    )

    return populateDepositCollateral
  }

  async sendDepositCollateral(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    SentLiquityTransaction<
      TransactionResponse,
      LiquityReceipt<TransactionReceipt, TroveAdjustmentDetails>
    >
  > {
    const populatedDepositCollateral = await this.populateAdjustTrove(
      { depositCollateral: amount },
      undefined,
      options,
    )
    const receipt = await populatedDepositCollateral.send()

    return receipt
  }

  // transactable
}
