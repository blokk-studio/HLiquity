import {
  Address,
  CollateralGainTransferDetails,
  ConsentableLiquity,
  Constants,
  Decimal,
  Decimalish,
  Deployment,
  DeploymentAddressesKey,
  Fees,
  FrontendStatus,
  HLQTStake,
  HLiquityStore,
  LiquidationDetails,
  LiquityStoreBaseState,
  LiquityStoreState,
  PopulatableLiquity,
  PopulatedRedemption,
  ReadableLiquity,
  RedemptionDetails,
  SendableLiquity,
  StabilityDeposit,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  Trove,
  TroveAdjustmentDetails,
  TroveAdjustmentParams,
  TroveClosureDetails,
  TroveCreationDetails,
  TroveCreationParams,
  TroveListingParams,
  TroveWithPendingRedistribution,
  UserTrove,
} from '@liquity/lib-base'
import Web3, { Contract, MatchPrimitiveType } from 'web3'

// contracts
import { ContractExecuteTransaction, Transaction, TransactionReceipt } from '@hashgraph/sdk'
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
import { iERC20Abi } from '../abi/IERC20'
import { LockupContractFactoryAbi, lockupContractFactoryAbi } from '../abi/LockupContractFactory'
import { MultiTroveGetterAbi, multiTroveGetterAbi } from '../abi/MultiTroveGetter'
import { PriceFeedAbi, priceFeedAbi } from '../abi/PriceFeed'
import { SortedTrovesAbi, sortedTrovesAbi } from '../abi/SortedTroves'
import { StabilityPoolAbi, stabilityPoolAbi } from '../abi/StabilityPool'
import { TroveManagerAbi, troveManagerAbi } from '../abi/TroveManager'
import { UnipoolAbi, unipoolAbi } from '../abi/Unipool'
import { TypedContractId, getTypedContractId } from './contract_functions'
import { PrefixProperties } from './interface_collision'
import { asPopulatable } from './populatable'
import { asSendable } from './sendable'
import { PopulatedPlaceholderLiquityTransaction } from './transactions'
import { BackendTroveStatus, userTroveStatusFrom } from './trove_status'
import { getBlockTimestamp } from './web3'

interface PlaceholderLiquityStoreState {}

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

/** With 70 iterations redemption costs about ~10M gas, and each iteration accounts for ~138k more */
export const redeemMaxIterations = 70

interface LasagnaConnection {
  addresses: Record<DeploymentAddressesKey, Address>
  version: string
  deploymentDate: Date
  frontendTag: Address
}

type SendTransaction = (transaction: Transaction) => Promise<TransactionReceipt>

const getWeb3Contracts = (options: {
  rpcUrl: string
  deploymentAddresses: Record<DeploymentAddressesKey, Address>
}) => {
  const web3 = new Web3(options.rpcUrl)

  const activePool = new web3.eth.Contract(activePoolAbi, options.deploymentAddresses.activePool)
  const activePoolContractId = getTypedContractId<ActivePoolAbi>(
    0,
    0,
    options.deploymentAddresses.activePool,
  )

  const borrowerOperations = new web3.eth.Contract(
    borrowerOperationsAbi,
    options.deploymentAddresses.borrowerOperations,
  )
  const borrowerOperationsContractId = getTypedContractId<BorrowerOperationsAbi>(
    0,
    0,
    options.deploymentAddresses.borrowerOperations,
  )

  const collSurplusPool = new web3.eth.Contract(
    collSurplusPoolAbi,
    options.deploymentAddresses.collSurplusPool,
  )
  const collSurplusPoolContractId = getTypedContractId<CollSurplusPoolAbi>(
    0,
    0,
    options.deploymentAddresses.collSurplusPool,
  )

  const communityIssuance = new web3.eth.Contract(
    communityIssuanceAbi,
    options.deploymentAddresses.communityIssuance,
  )
  const communityIssuanceContractId = getTypedContractId<CommunityIssuanceAbi>(
    0,
    0,
    options.deploymentAddresses.communityIssuance,
  )

  const defaultPool = new web3.eth.Contract(defaultPoolAbi, options.deploymentAddresses.defaultPool)
  const defaultPoolContractId = getTypedContractId<DefaultPoolAbi>(
    0,
    0,
    options.deploymentAddresses.defaultPool,
  )

  const gasPool = new web3.eth.Contract(gasPoolAbi, options.deploymentAddresses.gasPool)
  const gasPoolContractId = getTypedContractId<GasPoolAbi>(
    0,
    0,
    options.deploymentAddresses.gasPool,
  )

  const hchfToken = new web3.eth.Contract(hCHFTokenAbi, options.deploymentAddresses.hchfToken)
  const hchfTokenContractId = getTypedContractId<HCHFTokenAbi>(
    0,
    0,
    options.deploymentAddresses.hchfToken,
  )

  const hintHelpers = new web3.eth.Contract(hintHelpersAbi, options.deploymentAddresses.hintHelpers)
  const hintHelpersContractId = getTypedContractId<HintHelpersAbi>(
    0,
    0,
    options.deploymentAddresses.hintHelpers,
  )

  const hlqtStaking = new web3.eth.Contract(hLQTStakingAbi, options.deploymentAddresses.hlqtStaking)
  const hlqtStakingContractId = getTypedContractId<HLQTStakingAbi>(
    0,
    0,
    options.deploymentAddresses.hlqtStaking,
  )

  const hlqtToken = new web3.eth.Contract(hLQTTokenAbi, options.deploymentAddresses.hlqtToken)
  const hlqtTokenContractId = getTypedContractId<HLQTTokenAbi>(
    0,
    0,
    options.deploymentAddresses.hlqtToken,
  )

  const lockupContractFactory = new web3.eth.Contract(
    lockupContractFactoryAbi,
    options.deploymentAddresses.lockupContractFactory,
  )
  const lockupContractFactoryContractId = getTypedContractId<LockupContractFactoryAbi>(
    0,
    0,
    options.deploymentAddresses.lockupContractFactory,
  )

  const multiTroveGetter = new web3.eth.Contract(
    multiTroveGetterAbi,
    options.deploymentAddresses.multiTroveGetter,
  )
  const multiTroveGetterContractId = getTypedContractId<MultiTroveGetterAbi>(
    0,
    0,
    options.deploymentAddresses.multiTroveGetter,
  )

  const priceFeed = new web3.eth.Contract(priceFeedAbi, options.deploymentAddresses.priceFeed)
  const priceFeedContractId = getTypedContractId<PriceFeedAbi>(
    0,
    0,
    options.deploymentAddresses.priceFeed,
  )

  const sortedTroves = new web3.eth.Contract(
    sortedTrovesAbi,
    options.deploymentAddresses.sortedTroves,
  )
  const sortedTrovesContractId = getTypedContractId<SortedTrovesAbi>(
    0,
    0,
    options.deploymentAddresses.sortedTroves,
  )

  const stabilityPool = new web3.eth.Contract(
    stabilityPoolAbi,
    options.deploymentAddresses.stabilityPool,
  )
  const stabilityPoolContractId = getTypedContractId<StabilityPoolAbi>(
    0,
    0,
    options.deploymentAddresses.stabilityPool,
  )

  const troveManager = new web3.eth.Contract(
    troveManagerAbi,
    options.deploymentAddresses.troveManager,
  )
  const troveManagerContractId = getTypedContractId<TroveManagerAbi>(
    0,
    0,
    options.deploymentAddresses.troveManager,
  )

  const saucerSwapPool = new web3.eth.Contract(
    unipoolAbi,
    options.deploymentAddresses.saucerSwapPool,
  )
  const saucerSwapPoolContractId = getTypedContractId<UnipoolAbi>(
    0,
    0,
    options.deploymentAddresses.saucerSwapPool,
  )

  return {
    web3,
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
  }
}

export class PlaceholderLiquity
  extends HLiquityStore<PlaceholderLiquityStoreState>
  implements
    ReadableLiquity,
    PrefixProperties<Readonly<PopulatableLiquity>, 'populate'>,
    ConsentableLiquity
{
  public store: HLiquityStore = this
  /** @deprecated TODO: implement & use events */
  public readonly send: SendableLiquity
  /** @deprecated TODO: implement & use events */
  public readonly populate: PopulatableLiquity
  /** @deprecated use the deployment directly, rather than proxying through this */
  public readonly connection: LasagnaConnection

  private readonly web3: Web3
  private readonly totalStabilityPoolHlqtReward: Decimal
  private readonly frontendAddress: Address
  protected readonly constants: Constants

  // contracts
  private readonly activePool: Contract<ActivePoolAbi>
  private readonly activePoolContractId: TypedContractId<ActivePoolAbi>
  private readonly borrowerOperations: Contract<BorrowerOperationsAbi>
  private readonly borrowerOperationsContractId: TypedContractId<BorrowerOperationsAbi>
  private readonly collSurplusPool: Contract<CollSurplusPoolAbi>
  private readonly collSurplusPoolContractId: TypedContractId<CollSurplusPoolAbi>
  private readonly communityIssuance: Contract<CommunityIssuanceAbi>
  private readonly communityIssuanceContractId: TypedContractId<CommunityIssuanceAbi>
  private readonly defaultPool: Contract<DefaultPoolAbi>
  private readonly defaultPoolContractId: TypedContractId<DefaultPoolAbi>
  private readonly gasPool: Contract<GasPoolAbi>
  private readonly gasPoolContractId: TypedContractId<GasPoolAbi>
  private readonly hchfToken: Contract<HCHFTokenAbi>
  private readonly hchfTokenContractId: TypedContractId<HCHFTokenAbi>
  private readonly hintHelpers: Contract<HintHelpersAbi>
  private readonly hintHelpersContractId: TypedContractId<HintHelpersAbi>
  private readonly hlqtStaking: Contract<HLQTStakingAbi>
  private readonly hlqtStakingContractId: TypedContractId<HLQTStakingAbi>
  private readonly hlqtToken: Contract<HLQTTokenAbi>
  private readonly hlqtTokenContractId: TypedContractId<HLQTTokenAbi>
  private readonly lockupContractFactory: Contract<LockupContractFactoryAbi>
  private readonly lockupContractFactoryContractId: TypedContractId<LockupContractFactoryAbi>
  private readonly multiTroveGetter: Contract<MultiTroveGetterAbi>
  private readonly multiTroveGetterContractId: TypedContractId<MultiTroveGetterAbi>
  private readonly priceFeed: Contract<PriceFeedAbi>
  private readonly priceFeedContractId: TypedContractId<PriceFeedAbi>
  private readonly sortedTroves: Contract<SortedTrovesAbi>
  private readonly sortedTrovesContractId: TypedContractId<SortedTrovesAbi>
  private readonly stabilityPool: Contract<StabilityPoolAbi>
  private readonly stabilityPoolContractId: TypedContractId<StabilityPoolAbi>
  private readonly troveManager: Contract<TroveManagerAbi>
  private readonly troveManagerContractId: TypedContractId<TroveManagerAbi>
  private readonly saucerSwapPool: Contract<UnipoolAbi>
  private readonly saucerSwapPoolContractId: TypedContractId<UnipoolAbi>

  private constructor(options: {
    sendTransaction: SendTransaction
    web3: Web3
    totalStabilityPoolHlqtReward: Decimal
    frontendAddress: Address
    constants: Constants

    // contracts
    activePool: Contract<ActivePoolAbi>
    activePoolContractId: TypedContractId<ActivePoolAbi>
    borrowerOperations: Contract<BorrowerOperationsAbi>
    borrowerOperationsContractId: TypedContractId<BorrowerOperationsAbi>
    collSurplusPool: Contract<CollSurplusPoolAbi>
    collSurplusPoolContractId: TypedContractId<CollSurplusPoolAbi>
    communityIssuance: Contract<CommunityIssuanceAbi>
    communityIssuanceContractId: TypedContractId<CommunityIssuanceAbi>
    defaultPool: Contract<DefaultPoolAbi>
    defaultPoolContractId: TypedContractId<DefaultPoolAbi>
    gasPool: Contract<GasPoolAbi>
    gasPoolContractId: TypedContractId<GasPoolAbi>
    hchfToken: Contract<HCHFTokenAbi>
    hchfTokenContractId: TypedContractId<HCHFTokenAbi>
    hintHelpers: Contract<HintHelpersAbi>
    hintHelpersContractId: TypedContractId<HintHelpersAbi>
    hlqtStaking: Contract<HLQTStakingAbi>
    hlqtStakingContractId: TypedContractId<HLQTStakingAbi>
    hlqtToken: Contract<HLQTTokenAbi>
    hlqtTokenContractId: TypedContractId<HLQTTokenAbi>
    lockupContractFactory: Contract<LockupContractFactoryAbi>
    lockupContractFactoryContractId: TypedContractId<LockupContractFactoryAbi>
    multiTroveGetter: Contract<MultiTroveGetterAbi>
    multiTroveGetterContractId: TypedContractId<MultiTroveGetterAbi>
    priceFeed: Contract<PriceFeedAbi>
    priceFeedContractId: TypedContractId<PriceFeedAbi>
    sortedTroves: Contract<SortedTrovesAbi>
    sortedTrovesContractId: TypedContractId<SortedTrovesAbi>
    stabilityPool: Contract<StabilityPoolAbi>
    stabilityPoolContractId: TypedContractId<StabilityPoolAbi>
    troveManager: Contract<TroveManagerAbi>
    troveManagerContractId: TypedContractId<TroveManagerAbi>
    saucerSwapPool: Contract<UnipoolAbi>
    saucerSwapPoolContractId: TypedContractId<UnipoolAbi>

    // lasagna
    connection: LasagnaConnection
  }) {
    super(options)

    this.web3 = options.web3
    this.totalStabilityPoolHlqtReward = options.totalStabilityPoolHlqtReward
    this.frontendAddress = options.frontendAddress
    this.constants = options.constants

    this.activePool = options.activePool
    this.activePoolContractId = options.activePoolContractId

    this.borrowerOperations = options.borrowerOperations
    this.borrowerOperationsContractId = options.borrowerOperationsContractId
    this.borrowerOperationsContractId

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
    this.hchfTokenContractId

    this.hintHelpers = options.hintHelpers
    this.hintHelpersContractId = options.hintHelpersContractId
    this.hintHelpers

    this.hlqtStaking = options.hlqtStaking
    this.hlqtStakingContractId = options.hlqtStakingContractId
    this.hlqtStakingContractId

    this.hlqtToken = options.hlqtToken
    this.hlqtTokenContractId = options.hlqtTokenContractId
    this.hlqtTokenContractId

    this.lockupContractFactory = options.lockupContractFactory
    this.lockupContractFactoryContractId = options.lockupContractFactoryContractId

    this.multiTroveGetter = options.multiTroveGetter
    this.multiTroveGetterContractId = options.multiTroveGetterContractId

    this.priceFeed = options.priceFeed
    this.priceFeedContractId = options.priceFeedContractId

    this.sortedTroves = options.sortedTroves
    this.sortedTrovesContractId = options.sortedTrovesContractId
    this.sortedTroves

    this.stabilityPool = options.stabilityPool
    this.stabilityPoolContractId = options.stabilityPoolContractId
    this.stabilityPoolContractId

    this.troveManager = options.troveManager
    this.troveManagerContractId = options.troveManagerContractId
    this.troveManagerContractId

    this.saucerSwapPool = options.saucerSwapPool
    this.saucerSwapPoolContractId = options.saucerSwapPoolContractId
    this.saucerSwapPoolContractId

    // lasagna
    this.populate = asPopulatable(this)
    this.send = asSendable(this)
    this.connection = options.connection

    // reference unused properties so we can keep them in case we need them later
    this.activePoolContractId
    this.borrowerOperations
    this.collSurplusPoolContractId
    this.communityIssuanceContractId
    this.defaultPoolContractId
    this.gasPool
    this.gasPoolContractId
    this.hintHelpersContractId
    this.lockupContractFactory
    this.lockupContractFactoryContractId
    this.multiTroveGetterContractId
    this.priceFeedContractId
    this.sortedTrovesContractId
  }

  private async fetchStoreValues(
    blockTag?: string | number,
  ): Promise<[baseState: LiquityStoreBaseState, extraState: PlaceholderLiquityStoreState]> {
    const price = await this.getPrice({ blockTag })

    const {
      blockTimestamp,
      calculateRemainingHLQT,
      lastFeeOperationTimeResult,
      baseRateResult,
      ...baseState
    } = await promiseAllValues({
      blockTimestamp: getBlockTimestamp(this.web3, blockTag),
      calculateRemainingHLQT: this.getRemainingLiquidityMiningHLQTReward({ blockTag }),
      lastFeeOperationTimeResult: this.troveManager.methods
        .lastFeeOperationTime()
        .call(undefined, blockTag),
      baseRateResult: this.troveManager.methods.baseRate().call(undefined, blockTag),
      price,
      numberOfTroves: this.getNumberOfTroves({ blockTag }),
      totalRedistributed: this.getTotalRedistributed({ blockTag }),
      total: this.getTotal({ blockTag }),
      hchfInStabilityPool: this.getHCHFInStabilityPool({ blockTag }),
      totalStakedHLQT: this.getTotalStakedHLQT({ blockTag }),
      _riskiestTroveBeforeRedistribution: new TroveWithPendingRedistribution(
        this.constants,
        AddressZero,
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
      userHasAssociatedWithLpToken: false,

      // enough to open 1 trove with the minimum debt & a healthy collateral ratio
      accountBalance: this.constants.HCHF_MINIMUM_DEBT.div(price)
        // minimum recommended collateral ratio + some extra
        .mul(this.constants.CRITICAL_COLLATERAL_RATIO.add(0.2))
        // maximum estimated transaction cost that is subtracted from the maximum collateral ("max" button)
        .add(40),
      // as if user opened 1 trove
      hchfBalance: Decimal.from(this.constants.HCHF_MINIMUM_DEBT.mul(1)),
      hlqtBalance: Decimal.from(100),
      hchfTokenAddress: this.getHCHFTokenAddress({ blockTag }),
      hlqtTokenAddress: this.getHLQTTokenAddress({ blockTag }),
      uniTokenBalance: Decimal.ZERO,
      uniTokenAllowance: Decimal.ZERO,
      liquidityMiningStake: Decimal.ZERO,
      liquidityMiningHLQTReward: Decimal.ZERO,
      collateralSurplusBalance: Decimal.ZERO,
      troveBeforeRedistribution: new TroveWithPendingRedistribution(
        this.constants,
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
      hchfTokenAllowanceOfHchfContract: Decimal.ZERO,
      hlqtTokenAllowanceOfHlqtContract: Decimal.ZERO,
    })

    const baseRateWithoutDecay = decimalify(baseRateResult)
    const lastFeeOperationTimestamp = parseInt(lastFeeOperationTimeResult.toString())
    const lastFeeOperationDate = new Date(lastFeeOperationTimestamp * 1000)
    const timeOfLatestBlock = new Date(blockTimestamp * 1000)

    const _feesInNormalMode = new Fees(
      baseRateWithoutDecay,
      this.constants.MINUTE_DECAY_FACTOR,
      this.constants.BETA,
      lastFeeOperationDate,
      timeOfLatestBlock,
      false,
      this.constants,
    )

    return [
      {
        ...baseState,
        _feesInNormalMode,
        remainingLiquidityMiningHLQTReward: calculateRemainingHLQT,
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
    extraState: PlaceholderLiquityStoreState,
    extraStateUpdate: Partial<PlaceholderLiquityStoreState>,
  ): PlaceholderLiquityStoreState {
    return {
      ...extraState,
      ...extraStateUpdate,
    }
  }

  async refresh(): Promise<LiquityStoreState<PlaceholderLiquityStoreState>> {
    try {
      const stateUpdates = await this.fetchStoreValues()

      if (this._loaded) {
        this._update(...stateUpdates)

        return this.state
      }

      this._load(...stateUpdates)
    } catch (throwable) {
      console.warn(`unable to update the store`, throwable)
    }

    return this.state
  }

  private getAddressOrUserAddress(address?: Address): Address {
    if (address) {
      return address
    }

    return AddressZero
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

    return new Trove(this.constants, collateral, debt)
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
      const trove = new Trove(
        this.constants,
        decimalify(snapshotResult.ETH),
        decimalify(snapshotResult.HCHFDebt),
      )

      return new TroveWithPendingRedistribution(
        this.constants,
        addressOrUserAddress,
        userTroveStatus,
        decimalify(troveResult.coll),
        decimalify(troveResult.debt),
        decimalify(troveResult.stake),
        trove,
      )
    }

    return new TroveWithPendingRedistribution(this.constants, addressOrUserAddress, userTroveStatus)
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

    const activePool = new Trove(
      this.constants,
      decimalify(activeCollateralResult),
      decimalify(activeDebtResult),
    )
    const defaultPool = new Trove(
      this.constants,
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

  async getHchfTokenAllowanceOfHchfContract(
    address?: Address,
    options?: ContractCallOptions,
  ): Promise<Decimal> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)
    const tokenAddress = await this.getHCHFTokenAddress(options)
    const tokenContract = new this.web3.eth.Contract(iERC20Abi, tokenAddress)

    const allowanceResult = await tokenContract.methods
      .allowance(addressOrUserAddress, this.hchfToken.options.address)
      .call(undefined, options?.blockTag)
    const allowance = decimalify(allowanceResult)

    return allowance
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

  async getHlqtTokenAllowanceOfHlqtContract(
    address?: Address,
    options?: ContractCallOptions,
  ): Promise<Decimal> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)
    const tokenAddress = await this.getHLQTTokenAddress(options)
    const tokenContract = new this.web3.eth.Contract(iERC20Abi, tokenAddress)

    const allowanceResult = await tokenContract.methods
      .allowance(addressOrUserAddress, this.hlqtToken.options.address)
      .call(undefined, options?.blockTag)
    const allowance = decimalify(allowanceResult)

    return allowance
  }

  async getUniTokenBalance(address?: Address, options?: ContractCallOptions): Promise<Decimal> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)
    const uniTokenAddress = await this.saucerSwapPool.methods.uniToken().call()

    const uniTokenContract = new this.web3.eth.Contract(iERC20Abi, uniTokenAddress)

    const lpBalanceResult = await uniTokenContract.methods
      .balanceOf(addressOrUserAddress)
      .call(undefined, options?.blockTag)
    const lpBalance = decimalify(lpBalanceResult)

    return lpBalance
  }

  async getLPReward(address?: Address, options?: ContractCallOptions): Promise<Decimal> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)

    const lpRewardResult = await this.saucerSwapPool.methods
      .rewardPerToken(addressOrUserAddress)
      .call(undefined, options?.blockTag)
    const lpReward = decimalify(lpRewardResult)

    return lpReward
  }

  async getUniTokenAllowance(address?: Address, options?: ContractCallOptions): Promise<Decimal> {
    const addressOrUserAddress = this.getAddressOrUserAddress(address)
    const uniTokenAddress = await this.saucerSwapPool.methods.uniToken().call()

    const uniTokenContract = new this.web3.eth.Contract(iERC20Abi, uniTokenAddress)

    const lpAllowanceResult = await uniTokenContract.methods
      .allowance(addressOrUserAddress, this.saucerSwapPool.options.address)
      .call(undefined, options?.blockTag)
    const lpAllowance = decimalify(lpAllowanceResult)

    return lpAllowance
  }

  async getRemainingLiquidityMiningHLQTReward(options?: {
    blockTag?: number | string
  }): Promise<Decimal> {
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
            ? (params.startingAt ?? 0)
            : -((params.startingAt ?? 0) + 1),
          params.first,
        )
        .call(undefined, options?.blockTag),
    ])

    const troves = backendTroves.map((backendTrove) => {
      const trove = new Trove(
        this.constants,
        decimalify(backendTrove.snapshotETH),
        decimalify(backendTrove.snapshotHCHFDebt),
      )
      const troveWithPendingRedistribution = new TroveWithPendingRedistribution(
        this.constants,
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
      this.constants.MINUTE_DECAY_FACTOR,
      this.constants.BETA,
      lastFeeOperationDate,
      timeOfLatestBlock,
      total.collateralRatioIsBelowCritical(price),
      this.constants,
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
    rpcUrl: `wss://${string}` | `https://${string}`
    constants: Constants
    // TODO: remove when lasagna is removed
    deployment: Deployment
  }) {
    const totalStabilityPoolHlqtReward = Decimal.from(options.totalStabilityPoolHlqtReward)

    const { frontendAddress, constants } = options
    const sendTransaction: SendTransaction = () => {
      throw new Error("the placeholder liquity can't execute transactions")
    }

    const web3Contracts = getWeb3Contracts(options)

    const hashgraphLiquity = new PlaceholderLiquity({
      // contracts
      ...web3Contracts,
      // utilities
      sendTransaction,
      totalStabilityPoolHlqtReward,
      frontendAddress,
      constants,

      // lasagna
      connection: options.deployment,
    })

    return hashgraphLiquity
  }

  // populatable
  async populateOpenTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<TroveCreationDetails, ContractExecuteTransaction>
  > {
    params
    maxBorrowingRate
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateCloseTrove(
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<TroveClosureDetails, ContractExecuteTransaction>
  > {
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateAdjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<TroveAdjustmentDetails, ContractExecuteTransaction>
  > {
    params
    maxBorrowingRate
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateDepositCollateral(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<TroveAdjustmentDetails, ContractExecuteTransaction>
  > {
    amount
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateWithdrawCollateral(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<TroveAdjustmentDetails, ContractExecuteTransaction>
  > {
    amount
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateBorrowHCHF(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<TroveAdjustmentDetails, ContractExecuteTransaction>
  > {
    amount
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateRepayHCHF(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<TroveAdjustmentDetails, ContractExecuteTransaction>
  > {
    amount
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateClaimCollateralSurplus(
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateSetPrice(
    price: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    price
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateLiquidate(
    addressOrAddresses: Address | Address[],
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<LiquidationDetails, ContractExecuteTransaction>
  > {
    addressOrAddresses
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateLiquidateUpTo(
    maximumNumberOfTrovesToLiquidate: number,
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<LiquidationDetails, ContractExecuteTransaction>
  > {
    maximumNumberOfTrovesToLiquidate
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateDepositHCHFInStabilityPool(
    amount: Decimalish,
    frontendTag?: Address,
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<
      StabilityDepositChangeDetails,
      ContractExecuteTransaction
    >
  > {
    amount
    frontendTag
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  // @ts-expect-error weird overlapping types here
  async populateWithdrawHCHFFromStabilityPool(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<
      StabilityPoolGainsWithdrawalDetails,
      ContractExecuteTransaction
    >
  > {
    amount
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateWithdrawGainsFromStabilityPool(
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<
      StabilityPoolGainsWithdrawalDetails,
      ContractExecuteTransaction
    >
  > {
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateTransferCollateralGainToTrove(
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<
      CollateralGainTransferDetails,
      ContractExecuteTransaction
    >
  > {
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateRedeemHCHF(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedPlaceholderLiquityTransaction<RedemptionDetails, ContractExecuteTransaction> &
      PopulatedRedemption<ContractExecuteTransaction, TransactionReceipt, TransactionReceipt>
  > {
    amount
    maxRedemptionRate
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateStakeHLQT(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    amount
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateUnstakeHLQT(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    amount
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateWithdrawGainsFromStaking(
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateRegisterFrontend(
    kickbackRate: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    kickbackRate
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateApproveUniTokens(
    allowance?: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    allowance
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateStakeUniTokens(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    amount
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateUnstakeUniTokens(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    amount
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateWithdrawHLQTRewardFromLiquidityMining(
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async populateExitLiquidityMining(
    options?: TransactionOptions,
  ): Promise<PopulatedPlaceholderLiquityTransaction<void, ContractExecuteTransaction>> {
    options
    throw new Error("the placeholder liquity can't execute transactions")
  }

  // consent manager
  async associateWithHchf(): Promise<void> {
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async dissociateFromHchf(): Promise<void> {
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async associateWithHlqt(): Promise<void> {
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async dissociateFromHlqt(): Promise<void> {
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async associateWithLpToken(): Promise<void> {
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async dissociateFromLpToken(): Promise<void> {
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async approveHchfToSpendHchf(amount: Decimal): Promise<void> {
    amount
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async approveHlqtToSpendHlqt(amount: Decimal): Promise<void> {
    amount
    throw new Error("the placeholder liquity can't execute transactions")
  }

  async approveSaucerSwapToSpendLpToken(amount: Decimal): Promise<void> {
    amount
    throw new Error("the placeholder liquity can't execute transactions")
  }
}
