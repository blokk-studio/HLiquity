import {
  Address,
  BETA,
  CollateralGainTransferDetails,
  ConsentableLiquity,
  Decimal,
  Decimalish,
  Deployment,
  DeploymentAddressesKey,
  Fees,
  FrontendStatus,
  HCHF_MINIMUM_NET_DEBT,
  HLQTStake,
  HLiquityStore,
  LiquidationDetails,
  LiquityStoreBaseState,
  LiquityStoreState,
  MINUTE_DECAY_FACTOR,
  MinedReceipt,
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
  _normalizeTroveAdjustment,
  _normalizeTroveCreation,
} from '@liquity/lib-base'
import { HashConnect } from 'hashconnect'
import Web3, { Contract, MatchPrimitiveType } from 'web3'

// contracts
import {
  AccountAllowanceApproveTransaction,
  AccountId,
  ContractExecuteTransaction,
  Hbar,
  Long,
  TokenAssociateTransaction,
  TokenDissociateTransaction,
  TokenId,
  Transaction,
  TransactionReceipt,
} from '@hashgraph/sdk'
import { Fetch, fetchTokens, waitForTokenState } from '@liquity/mirror-node'
import { default as Emittery } from 'emittery'
import { HashConnectSigner } from 'hashconnect/dist/signer'
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
import { IERC20Abi, iERC20Abi } from '../abi/IERC20'
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
  TypedContractId,
  getTypedContractId,
} from './contract_functions'
import { LiquityEvents } from './events'
import {
  gasForHLQTIssuance,
  gasForPotentialLastFeeOperationTimeUpdate,
  gasForPotentialListTraversal,
  gasForUnipoolRewardUpdate,
} from './gas'
import { generateTrials } from './hints'
import { PrefixProperties } from './interface_collision'
import { asPopulatable } from './populatable'
import { asSendable } from './sendable'
import {
  GetDetailsOptions,
  PopulatedHashgraphLiquityTransaction,
  SentHashgraphLiquityTransaction,
  getLiquityReceiptStatus,
} from './transactions'
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
/** With 70 iterations redemption costs about ~10M gas, and each iteration accounts for ~138k more */
export const redeemMaxIterations = 70

interface LasagnaConnection {
  addresses: Record<DeploymentAddressesKey, Address>
  version: string
  deploymentDate: Date
  frontendTag: Address
}

export class HashgraphLiquity
  extends HLiquityStore<HashgraphLiquityStoreState>
  implements
    ReadableLiquity,
    PrefixProperties<Readonly<PopulatableLiquity>, 'populate'>,
    // TransactableLiquity,
    ConsentableLiquity,
    EventEmitter
{
  public store: HLiquityStore = this
  /** @deprecated TODO: implement & use events */
  public readonly send: SendableLiquity
  /** @deprecated TODO: implement & use events */
  public readonly populate: PopulatableLiquity
  /** @deprecated use the deployment directly, rather than proxying through this */
  public readonly connection: LasagnaConnection

  private readonly eventEmitter: Emittery<LiquityEvents>

  private readonly userAccountId: AccountId
  private readonly userAccountAddress: Address
  // don't use account ids from the hashconnect instance.
  private readonly signer: HashConnectSigner
  private readonly hashConnect: Omit<HashConnect, 'connectedAccountIds'>
  private readonly web3: Web3
  private readonly totalStabilityPoolHlqtReward: Decimal
  private readonly frontendAddress: Address
  private readonly mirrorNodeBaseUrl: `https://${string}`
  private readonly fetch: Fetch

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
    userAccountId: AccountId
    userAccountAddress: Address
    userHashConnect: HashConnect
    web3: Web3
    totalStabilityPoolHlqtReward: Decimal
    frontendAddress: Address
    mirrorNodeBaseUrl: `https://${string}`
    fetch: Fetch

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
    super()

    this.eventEmitter = new Emittery()

    this.userAccountId = options.userAccountId
    this.userAccountAddress = options.userAccountAddress
    this.hashConnect = options.userHashConnect
    try {
      this.signer = this.hashConnect.getSigner(this.userAccountId)
    } catch {
      this.hashConnect.disconnect()
      throw new Error("Disconnected HashConnect because the signer isn't available. Please retry.")
    }
    this.web3 = options.web3
    this.totalStabilityPoolHlqtReward = options.totalStabilityPoolHlqtReward
    this.frontendAddress = options.frontendAddress
    this.mirrorNodeBaseUrl = options.mirrorNodeBaseUrl
    this.fetch = options.fetch

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

    // lasagna
    this.populate = asPopulatable(this)
    this.send = asSendable(this)
    this.connection = options.connection
  }

  private async getTokenIds() {
    const [hchfTokenAddress, hlqtTokenAddress, lpTokenAddress] = await Promise.all([
      this.hchfToken.methods.tokenAddress().call(),
      this.hlqtToken.methods.tokenAddress().call(),
      this.saucerSwapPool.methods.uniToken().call(),
    ])

    const tokenAddresses = [hchfTokenAddress, hlqtTokenAddress, lpTokenAddress]
    const [hchfTokenId, hlqtTokenId, lpTokenId] = tokenAddresses.map((tokenAddress) =>
      TokenId.fromSolidityAddress(tokenAddress),
    )

    return {
      hchfTokenId,
      hlqtTokenId,
      lpTokenId,
    }
  }

  private async fetchStoreValues(
    blockTag?: string | number,
  ): Promise<[baseState: LiquityStoreBaseState, extraState: HashgraphLiquityStoreState]> {
    const tokenAssociationsPromise = (async () => {
      const tokenIds = Object.values(await this.getTokenIds())
      const associatedTokens = await fetchTokens({
        tokenIds,
        apiBaseUrl: this.mirrorNodeBaseUrl,
        accountId: this.userAccountId,
        fetch: this.fetch,
      }).catch(() => {
        return [] as { id: `0.0.${number}` }[]
      })

      const tokenIdStrings = tokenIds.map((tokenId) => tokenId.toString() as `0.0.${number}`)
      const associatedTokenIdStringSet = new Set(associatedTokens.map((token) => token.id))

      const [userHasAssociatedWithHchf, userHasAssociatedWithHlqt, userHasAssociatedWithLpToken] =
        tokenIdStrings.map((tokenIdString) => associatedTokenIdStringSet.has(tokenIdString))

      return {
        userHasAssociatedWithHchf,
        userHasAssociatedWithHlqt,
        userHasAssociatedWithLpToken,
      }
    })()
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
      price: this.getPrice({ blockTag }),
      numberOfTroves: this.getNumberOfTroves({ blockTag }),
      totalRedistributed: this.getTotalRedistributed({ blockTag }),
      total: this.getTotal({ blockTag }),
      hchfInStabilityPool: this.getHCHFInStabilityPool({ blockTag }),
      totalStakedHLQT: this.getTotalStakedHLQT({ blockTag }),
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
      userHasAssociatedWithHchf: tokenAssociationsPromise.then(
        (associations) => associations.userHasAssociatedWithHchf,
      ),
      userHasAssociatedWithHlqt: tokenAssociationsPromise.then(
        (associations) => associations.userHasAssociatedWithHlqt,
      ),
      userHasAssociatedWithLpToken: tokenAssociationsPromise.then(
        (associations) => associations.userHasAssociatedWithLpToken,
      ),

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
            uniTokenBalance: this.getUniTokenBalance(this.userAccountAddress, { blockTag }),
            uniTokenAllowance: this.getUniTokenAllowance(this.userAccountAddress, { blockTag }),
            liquidityMiningStake: this.getLiquidityMiningStake(this.userAccountAddress, {
              blockTag,
            }),
            liquidityMiningHLQTReward: this.getLiquidityMiningHLQTReward(this.userAccountAddress, {
              blockTag,
            }),
            collateralSurplusBalance: this.getCollateralSurplusBalance(this.userAccountAddress, {
              blockTag,
            }),
            troveBeforeRedistribution: this.getTroveBeforeRedistribution(this.userAccountAddress, {
              blockTag,
            }),
            stabilityDeposit: this.getStabilityDeposit(this.userAccountAddress, { blockTag }),
            hlqtStake: this.getHLQTStake(this.userAccountAddress, { blockTag }),
            ownFrontend: this.getFrontendStatus(this.userAccountAddress, { blockTag }),
            hchfTokenAllowanceOfHchfContract: this.getHchfTokenAllowanceOfHchfContract(
              this.userAccountAddress,
              { blockTag },
            ),
            hlqtTokenAllowanceOfHlqtContract: this.getHlqtTokenAllowanceOfHlqtContract(
              this.userAccountAddress,
              { blockTag },
            ),
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
            hchfTokenAllowanceOfHchfContract: Decimal.ZERO,
            hlqtTokenAllowanceOfHlqtContract: Decimal.ZERO,
          }),
    })

    const baseRateWithoutDecay = decimalify(baseRateResult)
    const lastFeeOperationTimestamp = parseInt(lastFeeOperationTimeResult.toString())
    const lastFeeOperationDate = new Date(lastFeeOperationTimestamp * 1000)
    const timeOfLatestBlock = new Date(blockTimestamp * 1000)

    const _feesInNormalMode = new Fees(
      baseRateWithoutDecay,
      MINUTE_DECAY_FACTOR,
      BETA,
      lastFeeOperationDate,
      timeOfLatestBlock,
      false,
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
    mirrorNodeBaseUrl: `https://${string}`
    fetch: Fetch
    // TODO: remove when lasagna is removed
    deployment: Deployment
  }) {
    const web3 = new Web3(options.rpcUrl)
    const totalStabilityPoolHlqtReward = Decimal.from(options.totalStabilityPoolHlqtReward)

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

    const defaultPool = new web3.eth.Contract(
      defaultPoolAbi,
      options.deploymentAddresses.defaultPool,
    )
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

    const hintHelpers = new web3.eth.Contract(
      hintHelpersAbi,
      options.deploymentAddresses.hintHelpers,
    )
    const hintHelpersContractId = getTypedContractId<HintHelpersAbi>(
      0,
      0,
      options.deploymentAddresses.hintHelpers,
    )

    const hlqtStaking = new web3.eth.Contract(
      hLQTStakingAbi,
      options.deploymentAddresses.hlqtStaking,
    )
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

    const {
      userHashConnect,
      userAccountId,
      userAccountAddress,
      frontendAddress,
      mirrorNodeBaseUrl,
      fetch,
    } = options

    const hashgraphLiquity = new HashgraphLiquity({
      userAccountId,
      userAccountAddress,
      userHashConnect,
      web3,
      totalStabilityPoolHlqtReward,
      frontendAddress,
      mirrorNodeBaseUrl,
      fetch,
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
      // lasagna
      connection: options.deployment,
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

  // liquity utilities
  private async findHintsForNominalCollateralRatio(
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

  // populatable
  async populateOpenTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<TroveCreationDetails, ContractExecuteTransaction>
  > {
    const normalized = _normalizeTroveCreation(params)
    const { depositCollateral, borrowHCHF } = normalized
    const fees = await this.getFees()
    const borrowingRate = fees.borrowingRate()
    const newTrove = Trove.create(normalized, borrowingRate)

    const finalMaxBorrowingRate =
      maxBorrowingRate !== undefined
        ? Decimal.from(maxBorrowingRate)
        : borrowingRate.add(defaultBorrowingRateSlippageTolerance)

    const hints = await this.findHintsForNominalCollateralRatio(newTrove._nominalCollateralRatio)
    const hbar = Hbar.fromString(depositCollateral.toString())
    const gas = 3000000 + gasForPotentialLastFeeOperationTimeUpdate + gasForPotentialListTraversal

    const functionParameters = TypedContractFunctionParameters<BorrowerOperationsAbi, 'openTrove'>()
      .addUint256(finalMaxBorrowingRate.bigNumber)
      .addUint256(borrowHCHF.bigNumber)
      .addAddress(hints[0])
      .addAddress(hints[1])

    const rawPopulatedTransaction = TypedContractExecuteTransaction<BorrowerOperationsAbi>({
      contractId: this.borrowerOperationsContractId,
      functionName: 'openTrove',
      functionParameters,
      hbar,
      gas,
    })

    const getDetails = async () => {
      const newStoreState = await this.refresh()
      const newTrove = newStoreState.trove
      const paidHchfBorrowingFee = newStoreState.fees.borrowingRate()

      const details: TroveCreationDetails = {
        params: normalized,
        fee: paidHchfBorrowingFee,
        newTrove,
      }

      return details
    }

    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateCloseTrove(
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<TroveClosureDetails, ContractExecuteTransaction>
  > {
    const gas = 3000000
    const rawPopulatedTransaction = TypedContractExecuteTransaction<BorrowerOperationsAbi>({
      contractId: this.borrowerOperationsContractId,
      functionName: 'closeTrove',
      gas,
    })

    const troveBeforeClosure = this.state.trove
    const getDetails = async () => {
      await this.refresh()

      const details: TroveClosureDetails = {
        params: {
          withdrawCollateral: troveBeforeClosure.collateral,
          repayHCHF: troveBeforeClosure.debt,
        },
      }

      return details
    }
    const populatedEthersLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return populatedEthersLiquityTransaction
  }

  /**
   * builds the populated -> sent -> receipt pyramid/lasagna
   *
   * TODO: sending and getting the receipt should not be the responsibility of population. WHEEEEN the code hits your eye like a big lasagna pie it's-a odio.
   */
  private getPopulatedHashgraphLiquityTransaction<
    Details,
    RawPopulatedTransaction extends Transaction = Transaction,
  >(options: {
    gasLimit: number
    rawPopulatedTransaction: RawPopulatedTransaction
    getDetails:
      | ((options: GetDetailsOptions<RawPopulatedTransaction>) => Promise<Details>)
      | ((options: GetDetailsOptions<RawPopulatedTransaction>) => Details)
  }) {
    const send = async (): Promise<SentHashgraphLiquityTransaction<Details>> => {
      const rawReceipt = await this.hashConnect.sendTransaction(
        this.userAccountId,
        options.rawPopulatedTransaction,
      )

      const waitForReceipt = async (): Promise<MinedReceipt<TransactionReceipt, Details>> => {
        // wait for the receipt before querying
        const details = await options.getDetails({
          rawPopulatedTransaction: options.rawPopulatedTransaction,
          rawReceipt,
        })

        const status = getLiquityReceiptStatus(rawReceipt.status)

        if (status === 'pending') {
          // this should never actually happen
          throw new Error(
            'TODO: figure out how to wait for the transaction to not be pending anymore.',
          )
        }

        await this.refresh()

        return {
          status,
          rawReceipt,
          details,
        }
      }

      return {
        rawSentTransaction: rawReceipt,
        waitForReceipt,
        getReceipt: waitForReceipt,
      }
    }

    const populatedTransaction: PopulatedHashgraphLiquityTransaction<
      Details,
      RawPopulatedTransaction
    > = {
      rawPopulatedTransaction: options.rawPopulatedTransaction,
      send,
      gasLimit: options.gasLimit,
      gasHeadroom: 0,
    }

    return populatedTransaction
  }

  async populateAdjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<TroveAdjustmentDetails, ContractExecuteTransaction>
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

    const finalMaxBorrowingRate = maxBorrowingRate
      ? Decimal.from(maxBorrowingRate)
      : borrowingRate
        ? borrowingRate.add(defaultBorrowingRateSlippageTolerance)
        : Decimal.ZERO

    const hints = await this.findHintsForNominalCollateralRatio(finalTrove._nominalCollateralRatio)

    let hbar: Hbar = Hbar.fromTinybars(0)
    if (depositCollateral !== undefined) {
      hbar = Hbar.fromString(depositCollateral.toString())
    }

    let gas = 3000000 + gasForPotentialListTraversal
    if (borrowHCHF) {
      gas += gasForPotentialLastFeeOperationTimeUpdate
    }

    const functionParameters = TypedContractFunctionParameters<
      BorrowerOperationsAbi,
      'adjustTrove'
    >()
      .addUint256(finalMaxBorrowingRate.bigNumber)
      .addUint256((withdrawCollateral ?? Decimal.ZERO).bigNumber)
      .addUint256((borrowHCHF ?? repayHCHF ?? Decimal.ZERO).bigNumber)
      .addBool(!!borrowHCHF)
      .addAddress(hints[0])
      .addAddress(hints[1])
    const rawPopulatedTransaction = TypedContractExecuteTransaction<BorrowerOperationsAbi>({
      contractId: this.borrowerOperationsContractId,
      functionName: 'adjustTrove',
      functionParameters,
      hbar,
      gas,
    })

    const getDetails = async () => {
      const newStoreState = await this.refresh()
      const updatedTrove = newStoreState.trove
      const paidHchfBorrowingFee = newStoreState.fees.borrowingRate()

      const details: TroveAdjustmentDetails = {
        params: normalized,
        fee: paidHchfBorrowingFee,
        newTrove: updatedTrove,
      }

      return details
    }
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateDepositCollateral(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<TroveAdjustmentDetails, ContractExecuteTransaction>
  > {
    const PopulatedHashgraphLiquityTransaction = await this.populateAdjustTrove(
      { depositCollateral: amount },
      undefined,
      options,
    )

    return PopulatedHashgraphLiquityTransaction
  }

  async populateWithdrawCollateral(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<TroveAdjustmentDetails, ContractExecuteTransaction>
  > {
    const PopulatedHashgraphLiquityTransaction = await this.populateAdjustTrove(
      { withdrawCollateral: amount },
      undefined,
      options,
    )

    return PopulatedHashgraphLiquityTransaction
  }

  async populateBorrowHCHF(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<TroveAdjustmentDetails, ContractExecuteTransaction>
  > {
    const PopulatedHashgraphLiquityTransaction = await this.populateAdjustTrove(
      { borrowHCHF: amount },
      undefined,
      options,
    )

    return PopulatedHashgraphLiquityTransaction
  }

  async populateRepayHCHF(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<TroveAdjustmentDetails, ContractExecuteTransaction>
  > {
    const populateDepositCollateral = await this.populateAdjustTrove(
      { repayHCHF: amount },
      undefined,
      options,
    )

    return populateDepositCollateral
  }

  async populateClaimCollateralSurplus(
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    const gas = 3000000
    const rawPopulatedTransaction = TypedContractExecuteTransaction<BorrowerOperationsAbi>({
      contractId: this.borrowerOperationsContractId,
      functionName: 'claimCollateral',
      gas,
    })

    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails: () => undefined,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateSetPrice(
    price: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    throw new Error(
      'setPrice() is not implemented. amend HashgraphLiquity::populateSetPrice to implement it.',
    )
    // TODO: pass whether price can be set
    // if (!false) {
    //   throw new Error('setPrice() unavailable on this deployment of Liquity')
    // }

    // const functionParameters = TypedContractFunctionParameters<
    //   PriceFeedAbi,
    //   'setPrice'
    // >().addUint256(new BigNumber(Decimal.from(price).hex))

    // const rawPopulatedTransaction = TypedContractExecuteTransaction<PriceFeedAbi>({
    //   contractId: this.priceFeedContractId,
    //   gas: 3000000,
    //   functionName: 'setPrice',
    // })

    // const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
    //   rawPopulatedTransaction,
    //   signer: this.signer,
    //   getDetails: () => undefined,
    // })

    // return PopulatedHashgraphLiquityTransaction
  }

  async populateLiquidate(
    addressOrAddresses: Address | Address[],
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<LiquidationDetails, ContractExecuteTransaction>> {
    let rawPopulatedTransaction: ContractExecuteTransaction
    const gas = 3000000 + gasForHLQTIssuance
    if (Array.isArray(addressOrAddresses)) {
      // batch-liquidate multiple addresses
      const functionParameters = TypedContractFunctionParameters<
        TroveManagerAbi,
        'batchLiquidateTroves'
      >().addAddressArray(addressOrAddresses)

      rawPopulatedTransaction = TypedContractExecuteTransaction<TroveManagerAbi>({
        contractId: this.troveManagerContractId,
        gas,
        functionName: 'batchLiquidateTroves',
        functionParameters,
      })
    } else {
      // liquidate single address
      const functionParameters = TypedContractFunctionParameters<
        TroveManagerAbi,
        'liquidate'
      >().addAddress(addressOrAddresses)

      rawPopulatedTransaction = TypedContractExecuteTransaction<TroveManagerAbi>({
        contractId: this.troveManagerContractId,
        gas,
        functionName: 'liquidate',
        functionParameters,
      })
    }

    const getDetails = (): LiquidationDetails => {
      // TODO: we can't listen to events without websocket
      const details: LiquidationDetails = {
        collateralGasCompensation: Decimal.ZERO,
        hchfGasCompensation: Decimal.ZERO,
        liquidatedAddresses: Array.isArray(addressOrAddresses)
          ? addressOrAddresses
          : [addressOrAddresses],
        totalLiquidated: new Trove(),
      }

      return details
    }

    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateLiquidateUpTo(
    maximumNumberOfTrovesToLiquidate: number,
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<LiquidationDetails, ContractExecuteTransaction>> {
    const functionParameters = TypedContractFunctionParameters<
      TroveManagerAbi,
      'liquidateTroves'
    >().addUint256(Decimal.from(maximumNumberOfTrovesToLiquidate).bigNumber)

    const gas = 3000000 + gasForHLQTIssuance
    const rawPopulatedTransaction = TypedContractExecuteTransaction<TroveManagerAbi>({
      contractId: this.troveManagerContractId,
      functionName: 'liquidateTroves',
      gas,
      functionParameters,
    })

    const getDetails = () => {
      // TODO: we can't listen to events without websocket
      const details: LiquidationDetails = {
        collateralGasCompensation: Decimal.ZERO,
        hchfGasCompensation: Decimal.ZERO,
        liquidatedAddresses: [],
        totalLiquidated: new Trove(),
      }

      return details
    }
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateDepositHCHFInStabilityPool(
    amount: Decimalish,
    frontendTag?: Address,
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<StabilityDepositChangeDetails, ContractExecuteTransaction>
  > {
    const frontendAddress = frontendTag ?? this.frontendAddress
    const functionParameters = TypedContractFunctionParameters<StabilityPoolAbi, 'provideToSP'>()
      .addUint256(Decimal.from(amount).bigNumber)
      .addAddress(frontendAddress)

    const gas = 3000000 + gasForHLQTIssuance
    const rawPopulatedTransaction = TypedContractExecuteTransaction<StabilityPoolAbi>({
      contractId: this.stabilityPoolContractId,
      functionName: 'provideToSP',
      gas,
      functionParameters,
    })

    const getDetails = () => {
      // TODO: we can't listen to events without websocket
      const details: StabilityDepositChangeDetails = {
        change: {
          withdrawAllHCHF: false,
          withdrawHCHF: Decimal.ZERO,
        },
        collateralGain: Decimal.ZERO,
        hchfLoss: Decimal.ZERO,
        hlqtReward: Decimal.ZERO,
        newHCHFDeposit: Decimal.ZERO,
      }

      return details
    }
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  // @ts-expect-error weird overlapping types here
  async populateWithdrawHCHFFromStabilityPool(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<
      StabilityPoolGainsWithdrawalDetails,
      ContractExecuteTransaction
    >
  > {
    const functionParameters = TypedContractFunctionParameters<
      StabilityPoolAbi,
      'withdrawFromSP'
    >().addUint256(Decimal.from(amount).bigNumber)

    const gas = 3000000 + gasForHLQTIssuance
    const rawPopulatedTransaction = TypedContractExecuteTransaction<StabilityPoolAbi>({
      contractId: this.stabilityPoolContractId,
      functionName: 'withdrawFromSP',
      gas,
      functionParameters,
    })

    const getDetails = () => {
      // TODO: we can't listen to events without websocket
      const details: StabilityPoolGainsWithdrawalDetails = {
        collateralGain: Decimal.ZERO,
        hchfLoss: Decimal.ZERO,
        hlqtReward: Decimal.ZERO,
        newHCHFDeposit: Decimal.ZERO,
      }

      return details
    }
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateWithdrawGainsFromStabilityPool(
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<
      StabilityPoolGainsWithdrawalDetails,
      ContractExecuteTransaction
    >
  > {
    const functionParameters = TypedContractFunctionParameters<
      StabilityPoolAbi,
      'withdrawFromSP'
    >().addUint256(Decimal.from(0).bigNumber)

    const gas = 3000000 + gasForHLQTIssuance
    const rawPopulatedTransaction = TypedContractExecuteTransaction<StabilityPoolAbi>({
      contractId: this.stabilityPoolContractId,
      functionName: 'withdrawFromSP',
      gas,
      functionParameters,
    })

    const getDetails = () => {
      // TODO: we can't listen to events without websocket
      const details: StabilityPoolGainsWithdrawalDetails = {
        collateralGain: Decimal.ZERO,
        hchfLoss: Decimal.ZERO,
        hlqtReward: Decimal.ZERO,
        newHCHFDeposit: Decimal.ZERO,
      }

      return details
    }
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateTransferCollateralGainToTrove(
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<CollateralGainTransferDetails, ContractExecuteTransaction>
  > {
    const address = this.getAddressOrUserAddress(options?.from)

    const [initialTrove, stabilityDeposit] = await Promise.all([
      this.getTrove(address),
      this.getStabilityDeposit(address),
    ])

    const finalTrove = initialTrove.addCollateral(stabilityDeposit.collateralGain)

    if (finalTrove instanceof TroveWithPendingRedistribution) {
      throw new Error('Rewards must be applied to this Trove')
    }

    const hints = await this.findHintsForNominalCollateralRatio(finalTrove._nominalCollateralRatio)

    const functionParameters = TypedContractFunctionParameters<
      StabilityPoolAbi,
      'withdrawETHGainToTrove'
    >()
      .addAddress(hints[0])
      .addAddress(hints[1])

    const gas = 3000000 + gasForHLQTIssuance
    const rawPopulatedTransaction = TypedContractExecuteTransaction<StabilityPoolAbi>({
      contractId: this.stabilityPoolContractId,
      functionName: 'withdrawETHGainToTrove',
      gas,
      functionParameters,
    })

    const getDetails = () => {
      // TODO: we can't listen to events without websocket
      const details: CollateralGainTransferDetails = {
        collateralGain: Decimal.ZERO,
        hchfLoss: Decimal.ZERO,
        hlqtReward: Decimal.ZERO,
        newHCHFDeposit: Decimal.ZERO,
        newTrove: finalTrove,
      }

      return details
    }
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateRedeemHCHF(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish,
    options?: TransactionOptions,
  ): Promise<
    PopulatedHashgraphLiquityTransaction<RedemptionDetails, ContractExecuteTransaction> &
      PopulatedRedemption<ContractExecuteTransaction, TransactionReceipt, TransactionReceipt>
  > {
    const attemptedHCHFAmount = Decimal.from(amount)

    const [
      fees,
      total,
      [
        truncatedAmount,
        firstRedemptionHint,
        partialRedemptionUpperHint,
        partialRedemptionLowerHint,
        partialRedemptionHintNICR,
      ],
    ] = await Promise.all([
      this.getFees(),
      this.getTotal(),
      (async () => {
        {
          const price = await this.getPrice()

          const redemptionHintsResult = await this.hintHelpers.methods
            .getRedemptionHints(attemptedHCHFAmount.hex, price.hex, redeemMaxIterations)
            .call()
          const { firstRedemptionHint, truncatedHCHFamount } = redemptionHintsResult
          const partialRedemptionHintNICR = decimalify(
            redemptionHintsResult.partialRedemptionHintNICR,
          )

          const [partialRedemptionUpperHint, partialRedemptionLowerHint] =
            partialRedemptionHintNICR.eq(Decimal.ZERO)
              ? [AddressZero, AddressZero]
              : await this.findHintsForNominalCollateralRatio(partialRedemptionHintNICR)

          return [
            decimalify(truncatedHCHFamount),
            firstRedemptionHint,
            partialRedemptionUpperHint,
            partialRedemptionLowerHint,
            partialRedemptionHintNICR,
          ]
        }
      })(),
    ])

    if (truncatedAmount.isZero) {
      throw new Error(
        `redeemHCHF: amount too low to redeem (try at least ${HCHF_MINIMUM_NET_DEBT})`,
      )
    }

    const defaultMaxRedemptionRate = (amount: Decimal) =>
      Decimal.min(
        fees.redemptionRate(amount.div(total.debt)).add(defaultRedemptionRateSlippageTolerance),
        Decimal.ONE,
      )

    const populateRedemption = async (
      attemptedHCHFAmount: Decimal,
      maxRedemptionRate?: Decimal,
      truncatedAmount: Decimal = attemptedHCHFAmount,
      partialRedemptionUpperHint: Address = AddressZero,
      partialRedemptionLowerHint: Address = AddressZero,
      partialRedemptionHintNICR: Decimal = Decimal.ZERO,
    ): Promise<
      PopulatedHashgraphLiquityTransaction<RedemptionDetails, ContractExecuteTransaction> &
        PopulatedRedemption<ContractExecuteTransaction, TransactionReceipt, TransactionReceipt>
    > => {
      const maxRedemptionRateOrDefault =
        maxRedemptionRate !== undefined
          ? Decimal.from(maxRedemptionRate)
          : defaultMaxRedemptionRate(truncatedAmount)

      const functionParameters = TypedContractFunctionParameters<
        TroveManagerAbi,
        'redeemCollateral'
      >()
        .addUint256(truncatedAmount.bigNumber)
        .addAddress(firstRedemptionHint as Address)
        .addAddress(partialRedemptionUpperHint as Address)
        .addAddress(partialRedemptionLowerHint as Address)
        .addUint256(partialRedemptionHintNICR.bigNumber)
        .addUint256(Decimal.from(redeemMaxIterations).bigNumber)
        .addUint256(maxRedemptionRateOrDefault.bigNumber)
      const gas = 3000000 + gasForPotentialLastFeeOperationTimeUpdate
      const rawPopulatedTransaction = TypedContractExecuteTransaction<TroveManagerAbi>({
        contractId: this.troveManagerContractId,
        gas,
        functionName: 'redeemCollateral',
        functionParameters,
      })

      const getDetails = () => {
        // TODO: we can't listen to events without websocket
        const redemptionDetails: RedemptionDetails = {
          actualHCHFAmount: Decimal.ZERO,
          attemptedHCHFAmount: attemptedHCHFAmount,
          collateralTaken: Decimal.ZERO,
          fee: Decimal.ZERO,
        }

        return redemptionDetails
      }
      const populatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
        rawPopulatedTransaction,
        getDetails,
        gasLimit: gas,
      })

      const isTruncated = truncatedAmount.lt(attemptedHCHFAmount)

      const newPopulatedRedemptionWithNewMaxRedemptionRate = (newMaxRedemptionRate: Decimalish) => {
        const resolvedMaxRedemptionRate = newMaxRedemptionRate
          ? Decimal.from(newMaxRedemptionRate)
          : maxRedemptionRate

        return populateRedemption(
          truncatedAmount.add(HCHF_MINIMUM_NET_DEBT),
          resolvedMaxRedemptionRate,
        )
      }
      const throwMissingTruncationError = () => {
        throw new Error(
          'PopulatedRedemption: increaseAmountByMinimumNetDebt() can only be called when amount is truncated',
        )
      }
      const increaseAmountByMinimumNetDebt = isTruncated
        ? newPopulatedRedemptionWithNewMaxRedemptionRate
        : throwMissingTruncationError

      const populatedRedemption: PopulatedHashgraphLiquityTransaction<
        RedemptionDetails,
        ContractExecuteTransaction
      > &
        PopulatedRedemption<ContractExecuteTransaction, TransactionReceipt, TransactionReceipt> = {
        ...populatedHashgraphLiquityTransaction,
        attemptedHCHFAmount,
        isTruncated,
        redeemableHCHFAmount: truncatedAmount,
        increaseAmountByMinimumNetDebt,
      }

      return populatedRedemption
    }

    return populateRedemption(
      attemptedHCHFAmount,
      maxRedemptionRate ? Decimal.from(maxRedemptionRate) : undefined,
      truncatedAmount,
      partialRedemptionUpperHint as Address,
      partialRedemptionLowerHint as Address,
      partialRedemptionHintNICR,
    )
  }

  async populateStakeHLQT(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    const functionParameters = TypedContractFunctionParameters<
      HLQTStakingAbi,
      'stake'
    >().addUint256(Decimal.from(amount).bigNumber)

    const gas = 3000000
    const rawPopulatedTransaction = TypedContractExecuteTransaction<HLQTStakingAbi>({
      contractId: this.hlqtStakingContractId,
      functionName: 'stake',
      gas,
      functionParameters,
    })

    const getDetails = () => undefined
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateUnstakeHLQT(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    const functionParameters = TypedContractFunctionParameters<
      HLQTStakingAbi,
      'unstake'
    >().addUint256(Decimal.from(amount).bigNumber)

    const gas = 3000000
    const rawPopulatedTransaction = TypedContractExecuteTransaction<HLQTStakingAbi>({
      contractId: this.hlqtStakingContractId,
      functionName: 'unstake',
      gas,
      functionParameters,
    })

    const getDetails = () => undefined
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateWithdrawGainsFromStaking(
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    return this.populateUnstakeHLQT(Decimal.ZERO, options)
  }

  async populateRegisterFrontend(
    kickbackRate: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    const functionParameters = TypedContractFunctionParameters<
      StabilityPoolAbi,
      'registerFrontEnd'
    >().addUint256(Decimal.from(kickbackRate).bigNumber)

    const gas = 3000000
    const rawPopulatedTransaction = TypedContractExecuteTransaction<StabilityPoolAbi>({
      contractId: this.stabilityPoolContractId,
      functionName: 'registerFrontEnd',
      gas,
      functionParameters,
    })

    const getDetails = () => undefined
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateApproveUniTokens(
    allowance?: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    if (!allowance) {
      throw new Error('infinite approvals are disallowed. pass an allowance value to approve.')
    }

    const uniTokenAddress = await this.saucerSwapPool.methods.uniToken().call()
    const functionParameters = TypedContractFunctionParameters<IERC20Abi, 'approve'>()
      .addAddress(this.saucerSwapPoolContractId.toSolidityAddress() as Address)
      .addUint256(Decimal.from(allowance).bigNumber)

    const gas = 3000000
    const rawPopulatedTransaction = TypedContractExecuteTransaction<IERC20Abi>({
      contractId: getTypedContractId<IERC20Abi>(0, 0, uniTokenAddress as Address),
      functionName: 'approve',
      gas,
      functionParameters,
    })

    const getDetails = () => undefined
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateStakeUniTokens(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    const functionParameters = TypedContractFunctionParameters<UnipoolAbi, 'stake'>().addUint256(
      Decimal.from(amount).bigNumber,
    )

    const gas = 3000000 + gasForUnipoolRewardUpdate
    const rawPopulatedTransaction = TypedContractExecuteTransaction<UnipoolAbi>({
      contractId: this.saucerSwapPoolContractId,
      functionName: 'stake',
      gas,
      functionParameters,
    })

    const getDetails = () => undefined
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateUnstakeUniTokens(
    amount: Decimalish,
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    const functionParameters = TypedContractFunctionParameters<UnipoolAbi, 'withdraw'>().addUint256(
      Decimal.from(amount).bigNumber,
    )

    const gas = 3000000 + gasForUnipoolRewardUpdate
    const rawPopulatedTransaction = TypedContractExecuteTransaction<UnipoolAbi>({
      contractId: this.saucerSwapPoolContractId,
      functionName: 'withdraw',
      gas,
      functionParameters,
    })

    const getDetails = () => undefined
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateWithdrawHLQTRewardFromLiquidityMining(
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    const gas = 3000000 + gasForUnipoolRewardUpdate
    const rawPopulatedTransaction = TypedContractExecuteTransaction<UnipoolAbi>({
      contractId: this.saucerSwapPoolContractId,
      functionName: 'claimReward',
      gas,
    })

    const getDetails = () => undefined
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  async populateExitLiquidityMining(
    options?: TransactionOptions,
  ): Promise<PopulatedHashgraphLiquityTransaction<void, ContractExecuteTransaction>> {
    const gas = 3000000 + gasForUnipoolRewardUpdate
    const rawPopulatedTransaction = TypedContractExecuteTransaction<UnipoolAbi>({
      contractId: this.saucerSwapPoolContractId,
      functionName: 'withdrawAndClaim',
      gas,
    })

    const getDetails = () => undefined
    const PopulatedHashgraphLiquityTransaction = this.getPopulatedHashgraphLiquityTransaction({
      rawPopulatedTransaction,
      getDetails,
      gasLimit: gas,
    })

    return PopulatedHashgraphLiquityTransaction
  }

  // consent manager
  async associateWithHchf(): Promise<void> {
    const tokenAddress = await this.hchfToken.methods.tokenAddress().call()
    const tokenId = TokenId.fromSolidityAddress(tokenAddress)
    const unfrozenTransaction = new TokenAssociateTransaction({
      tokenIds: [tokenId],
      accountId: this.userAccountId,
    })

    const [, tokenIds] = await Promise.all([
      this.hashConnect.sendTransaction(this.userAccountId, unfrozenTransaction),
      this.getTokenIds(),
    ])

    await waitForTokenState({
      tokenIds: Object.values(tokenIds),
      accountId: this.userAccountId,
      apiBaseUrl: this.mirrorNodeBaseUrl,
      fetch: this.fetch,
      requiredAssociations: [tokenId],
    })
    await this.refresh()
  }

  async dissociateFromHchf(): Promise<void> {
    const tokenAddress = await this.hchfToken.methods.tokenAddress().call()
    const tokenId = TokenId.fromSolidityAddress(tokenAddress)
    const unfrozenTransaction = new TokenDissociateTransaction({
      tokenIds: [tokenId],
      accountId: this.userAccountId,
    })

    const [, tokenIds] = await Promise.all([
      this.hashConnect.sendTransaction(this.userAccountId, unfrozenTransaction),
      this.getTokenIds(),
    ])

    await waitForTokenState({
      tokenIds: Object.values(tokenIds),
      accountId: this.userAccountId,
      apiBaseUrl: this.mirrorNodeBaseUrl,
      fetch: this.fetch,
      requiredDissociations: [tokenId],
    })
    await this.refresh()
  }

  async associateWithHlqt(): Promise<void> {
    const tokenAddress = await this.hlqtToken.methods.tokenAddress().call()
    const tokenId = TokenId.fromSolidityAddress(tokenAddress)
    const unfrozenTransaction = new TokenAssociateTransaction({
      tokenIds: [tokenId],
      accountId: this.userAccountId,
    })

    const [, tokenIds] = await Promise.all([
      this.hashConnect.sendTransaction(this.userAccountId, unfrozenTransaction),
      this.getTokenIds(),
    ])

    await waitForTokenState({
      tokenIds: Object.values(tokenIds),
      accountId: this.userAccountId,
      apiBaseUrl: this.mirrorNodeBaseUrl,
      fetch: this.fetch,
      requiredAssociations: [tokenId],
    })
    await this.refresh()
  }

  async dissociateFromHlqt(): Promise<void> {
    const tokenAddress = await this.hlqtToken.methods.tokenAddress().call()
    const tokenId = TokenId.fromSolidityAddress(tokenAddress)
    const unfrozenTransaction = new TokenDissociateTransaction({
      tokenIds: [tokenId],
      accountId: this.userAccountId,
    })

    const [, tokenIds] = await Promise.all([
      this.hashConnect.sendTransaction(this.userAccountId, unfrozenTransaction),
      this.getTokenIds(),
    ])

    await waitForTokenState({
      tokenIds: Object.values(tokenIds),
      accountId: this.userAccountId,
      apiBaseUrl: this.mirrorNodeBaseUrl,
      fetch: this.fetch,
      requiredDissociations: [tokenId],
    })
    await this.refresh()
  }

  async associateWithLpToken(): Promise<void> {
    const tokenAddress = await this.saucerSwapPool.methods.uniToken().call()
    const tokenId = TokenId.fromSolidityAddress(tokenAddress)
    const unfrozenTransaction = new TokenAssociateTransaction({
      tokenIds: [tokenId],
      accountId: this.userAccountId,
    })

    const [, tokenIds] = await Promise.all([
      this.hashConnect.sendTransaction(this.userAccountId, unfrozenTransaction),
      this.getTokenIds(),
    ])

    await waitForTokenState({
      tokenIds: Object.values(tokenIds),
      accountId: this.userAccountId,
      apiBaseUrl: this.mirrorNodeBaseUrl,
      fetch: this.fetch,
      requiredAssociations: [tokenId],
    })
    await this.refresh()
  }

  async dissociateFromLpToken(): Promise<void> {
    const tokenAddress = await this.saucerSwapPool.methods.uniToken().call()
    const tokenId = TokenId.fromSolidityAddress(tokenAddress)
    const unfrozenTransaction = new TokenDissociateTransaction({
      tokenIds: [tokenId],
      accountId: this.userAccountId,
    })

    const [, tokenIds] = await Promise.all([
      this.hashConnect.sendTransaction(this.userAccountId, unfrozenTransaction),
      this.getTokenIds(),
    ])

    await waitForTokenState({
      tokenIds: Object.values(tokenIds),
      accountId: this.userAccountId,
      apiBaseUrl: this.mirrorNodeBaseUrl,
      fetch: this.fetch,
      requiredDissociations: [tokenId],
    })
    await this.refresh()
  }

  async approveHchfToSpendHchf(amount: Decimal): Promise<void> {
    const tokenAddress = await this.hchfToken.methods.tokenAddress().call()
    const tokenId = TokenId.fromSolidityAddress(tokenAddress)
    const spenderAccountId = AccountId.fromEvmAddress(
      0,
      0,
      this.hchfTokenContractId.toSolidityAddress(),
    )

    const unfrozenTransaction = new AccountAllowanceApproveTransaction().approveTokenAllowance(
      tokenId,
      this.userAccountId,
      spenderAccountId,
      Long.fromString(amount.hex, true, 16),
    )

    const receipt = await this.hashConnect.sendTransaction(this.userAccountId, unfrozenTransaction)

    await this.refresh()
    // optimistic update
    this._update({ hchfTokenAllowanceOfHchfContract: amount })
  }

  async approveHlqtToSpendHlqt(amount: Decimal): Promise<void> {
    const tokenAddress = await this.hlqtToken.methods.tokenAddress().call()
    const tokenId = TokenId.fromSolidityAddress(tokenAddress)
    const spenderAccountId = AccountId.fromEvmAddress(
      0,
      0,
      this.hlqtTokenContractId.toSolidityAddress(),
    )

    const unfrozenTransaction = new AccountAllowanceApproveTransaction().approveTokenAllowance(
      tokenId,
      this.userAccountId,
      spenderAccountId,
      Long.fromString(amount.hex, true, 16),
    )

    const receipt = await this.hashConnect.sendTransaction(this.userAccountId, unfrozenTransaction)

    await this.refresh()
    // optimistic update
    this._update({ hlqtTokenAllowanceOfHlqtContract: amount })
  }

  async approveSaucerSwapToSpendLpToken(amount: Decimal): Promise<void> {
    const tokenAddress = await this.saucerSwapPool.methods.uniToken().call()
    const tokenId = TokenId.fromSolidityAddress(tokenAddress)
    const spenderAccountId = AccountId.fromEvmAddress(
      0,
      0,
      this.saucerSwapPoolContractId.toSolidityAddress(),
    )

    const unfrozenTransaction = new AccountAllowanceApproveTransaction().approveTokenAllowance(
      tokenId,
      this.userAccountId,
      spenderAccountId,
      Long.fromString(amount.hex, true, 16),
    )

    const receipt = await this.hashConnect.sendTransaction(this.userAccountId, unfrozenTransaction)

    await this.refresh()
    // optimistic update
    this._update({ uniTokenAllowance: amount })
  }
}
