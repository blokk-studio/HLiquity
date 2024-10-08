import {
  CollateralGainTransferDetails,
  Decimal,
  Decimalish,
  FailedReceipt,
  Fees,
  FrontendStatus,
  LiquidationDetails,
  HLiquityStore,
  HLQTStake,
  RedemptionDetails,
  StabilityDeposit,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TransactableLiquity,
  TransactionFailedError,
  Trove,
  TroveAdjustmentDetails,
  TroveAdjustmentParams,
  TroveClosureDetails,
  TroveCreationDetails,
  TroveCreationParams,
  TroveListingParams,
  TroveWithPendingRedistribution,
  UserTrove,
  ConsentableLiquity,
  Address,
  Constants
} from "@liquity/lib-base";
import { TokenId } from "@hashgraph/sdk";

import {
  EthersLiquityConnection,
  EthersLiquityConnectionOptionalParams,
  EthersLiquityConnectionOptions,
  EthersLiquityStoreOption,
  _connect,
  _getContracts,
  getConnectionWithBlockPolledStore,
  getTokenIds
} from "./EthersLiquityConnection";

import {
  EthersCallOverrides,
  EthersProvider,
  EthersSigner,
  EthersTransactionOverrides,
  EthersTransactionReceipt
} from "./types";

import { PopulatableEthersLiquity, SentEthersLiquityTransaction } from "./PopulatableEthersLiquity";
import { ReadableEthersLiquity } from "./ReadableEthersLiquity";
import { SendableEthersLiquity } from "./SendableEthersLiquity";
import { BlockPolledLiquityStore } from "./BlockPolledLiquityStore";
import { approveSpender, associateWithToken, dissociateFromToken } from "./consentable";
import { BigNumber } from "ethers";
import { Fetch, waitForTokenState } from "@liquity/mirror-node";

/**
 * Thrown by {@link EthersLiquity} in case of transaction failure.
 *
 * @public
 */
export class EthersTransactionFailedError extends TransactionFailedError<
  FailedReceipt<EthersTransactionReceipt>
> {
  constructor(message: string, failedReceipt: FailedReceipt<EthersTransactionReceipt>) {
    super("EthersTransactionFailedError", message, failedReceipt);
  }
}

const waitForSuccess = async <T>(tx: SentEthersLiquityTransaction<T>) => {
  const receipt = await tx.waitForReceipt();
  if (receipt.status !== "succeeded") {
    throw new EthersTransactionFailedError("Transaction failed", receipt);
  }

  return receipt.details;
};

interface EthersLiquityFromOptions {
  connection: EthersLiquityConnection;
  mirrorNodeBaseUrl: string;
  fetch: Fetch;
  constants: Constants;
}

interface EthersLiquityWithStoreFromOptions extends EthersLiquityFromOptions {
  connection: EthersLiquityConnection & { useStore: "blockPolled" };
}

interface EthersLiquityOptions {
  readable: ReadableEthersLiquity;
  connection: EthersLiquityConnection;
  constants: Constants;
  mirrorNodeBaseUrl: string;
  fetch: Fetch;
}

export interface EthersLiquityConnectOptions extends EthersLiquityConnectionOptionalParams {
  readonly mirrorNodeBaseUrl: string;
  readonly fetch: Fetch;
  readonly constants: Constants;
}

export interface EthersLiquityConnectWithSignerOptions extends EthersLiquityConnectOptions {
  signer: EthersSigner;
}

export interface EthersLiquityConnectWithProviderOptions extends EthersLiquityConnectOptions {
  provider: EthersProvider;
}

/**
 * Convenience class that combines multiple interfaces of the library in one object.
 *
 * @public
 */
export class EthersLiquity
  implements ReadableEthersLiquity, TransactableLiquity, ConsentableLiquity
{
  /** Information about the connection to the Liquity protocol. */
  readonly connection: EthersLiquityConnection;

  /** Can be used to create populated (unsigned) transactions. */
  readonly populate: PopulatableEthersLiquity;

  /** Can be used to send transactions without waiting for them to be mined. */
  readonly send: SendableEthersLiquity;

  private _readable: ReadableEthersLiquity;
  protected readonly constants: Constants;
  protected readonly mirrorNodeBaseUrl: string;
  protected readonly fetch: Fetch;

  /** @internal */
  constructor(options: EthersLiquityOptions) {
    this._readable = options.readable;
    this.connection = options.connection ?? options.readable.connection;
    this.populate = new PopulatableEthersLiquity(options);
    this.send = new SendableEthersLiquity(
      this.populate,
      options.readable.hasStore("blockPolled") ? options.readable.store : undefined
    );
    this.constants = options.constants;
    this.mirrorNodeBaseUrl = options.mirrorNodeBaseUrl;
    this.fetch = options.fetch;
  }

  static fromConnectionOptionsWithBlockPolledStore(
    options: Omit<EthersLiquityConnectionOptions, "useStore"> & {
      mirrorNodeBaseUrl: string;
      fetch: Fetch;
      constants: Constants;
    }
  ): EthersLiquityWithStore<BlockPolledLiquityStore> {
    const connection = getConnectionWithBlockPolledStore(options);
    const ethersLiquity = EthersLiquity._from({
      ...options,
      connection
    });

    return ethersLiquity;
  }

  /** @internal */
  static _from(
    options: EthersLiquityWithStoreFromOptions
  ): EthersLiquityWithStore<BlockPolledLiquityStore>;

  /** @internal */
  static _from(options: EthersLiquityFromOptions): EthersLiquity;

  /** @internal */
  static _from(options: EthersLiquityFromOptions): EthersLiquity {
    const readable = ReadableEthersLiquity._from(options);
    if (readable.hasStore("blockPolled")) {
      return new _EthersLiquityWithStore({
        ...options,
        readable,
        store: readable.store
      });
    } else {
      return new EthersLiquity({
        readable,
        ...options
      });
    }
  }

  /** @internal */
  static connect(
    options:
      | (EthersLiquityConnectWithProviderOptions & { useStore: "blockPolled" })
      | (EthersLiquityConnectWithSignerOptions & { useStore: "blockPolled" })
  ): Promise<EthersLiquityWithStore<BlockPolledLiquityStore>>;

  /**
   * Connect to the Liquity protocol and create an `EthersLiquity` object.
   *
   * @param signerOrProvider - Ethers `Signer` or `Provider` to use for connecting to the Ethereum
   *                           network.
   * @param optionalParams - Optional parameters that can be used to customize the connection.
   */
  static connect(
    options: EthersLiquityConnectWithProviderOptions | EthersLiquityConnectWithSignerOptions
  ): Promise<EthersLiquity>;

  static async connect(
    options: EthersLiquityConnectWithProviderOptions | EthersLiquityConnectWithSignerOptions
  ): Promise<EthersLiquity> {
    const signerOrProvider = "signer" in options ? options.signer : options.provider;
    const connection = await _connect(signerOrProvider, options);
    return EthersLiquity._from({
      connection,
      ...options
    });
  }

  /**
   * Check whether this `EthersLiquity` is an {@link EthersLiquityWithStore}.
   */
  // @ts-expect-error bad typing
  hasStore(): this is EthersLiquityWithStore;

  /**
   * Check whether this `EthersLiquity` is an
   * {@link EthersLiquityWithStore}\<{@link BlockPolledLiquityStore}\>.
   */
  // @ts-expect-error bad typing
  hasStore(store: "blockPolled"): this is EthersLiquityWithStore<BlockPolledLiquityStore>;

  // @ts-expect-error bad typing
  hasStore(): this is EthersLiquityWithStore {
    return true;
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalRedistributed} */
  getTotalRedistributed(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable.getTotalRedistributed(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTroveBeforeRedistribution} */
  getTroveBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution> {
    return this._readable.getTroveBeforeRedistribution(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTrove} */
  getTrove(address?: string, overrides?: EthersCallOverrides): Promise<UserTrove> {
    return this._readable.getTrove(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getNumberOfTroves} */
  getNumberOfTroves(overrides?: EthersCallOverrides): Promise<number> {
    return this._readable.getNumberOfTroves(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getPrice} */
  getPrice(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getPrice(overrides);
  }

  /** @internal */
  _getActivePool(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable._getActivePool(overrides);
  }

  /** @internal */
  _getDefaultPool(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable._getDefaultPool(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotal} */
  getTotal(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable.getTotal(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getStabilityDeposit} */
  getStabilityDeposit(address?: string, overrides?: EthersCallOverrides): Promise<StabilityDeposit> {
    return this._readable.getStabilityDeposit(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingStabilityPoolHLQTReward} */
  getRemainingStabilityPoolHLQTReward(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getRemainingStabilityPoolHLQTReward(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getHCHFInStabilityPool} */
  getHCHFInStabilityPool(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getHCHFInStabilityPool(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getHCHFBalance} */
  getHCHFBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getHCHFBalance(address, overrides);
  }

  getHCHFTokenAddress(overrides?: EthersCallOverrides): Promise<string> {
    return this._readable.getHCHFTokenAddress(overrides);
  }

  getHLQTTokenAddress(overrides?: EthersCallOverrides): Promise<string> {
    return this._readable.getHLQTTokenAddress(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getHLQTBalance} */
  getHLQTBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getHLQTBalance(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenBalance} */
  getUniTokenBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getUniTokenBalance(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getUniTokenAllowance} */
  getUniTokenAllowance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getUniTokenAllowance(address, overrides);
  }

  /** @internal */
  _getRemainingLiquidityMiningHLQTRewardCalculator(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number) => Decimal> {
    return this._readable._getRemainingLiquidityMiningHLQTRewardCalculator(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getRemainingLiquidityMiningHLQTReward} */
  getRemainingLiquidityMiningHLQTReward(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getRemainingLiquidityMiningHLQTReward(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningStake} */
  getLiquidityMiningStake(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getLiquidityMiningStake(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedUniTokens} */
  getTotalStakedUniTokens(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getTotalStakedUniTokens(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getLiquidityMiningHLQTReward} */
  getLiquidityMiningHLQTReward(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getLiquidityMiningHLQTReward(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getCollateralSurplusBalance} */
  getCollateralSurplusBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getCollateralSurplusBalance(address, overrides);
  }

  /** @internal */
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution[]>;

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.(getTroves:2)} */
  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]>;

  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]> {
    return this._readable.getTroves(params, overrides);
  }

  /** @internal */
  _getFeesFactory(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    return this._readable._getFeesFactory(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFees} */
  getFees(overrides?: EthersCallOverrides): Promise<Fees> {
    return this._readable.getFees(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getHLQTStake} */
  getHLQTStake(address?: string, overrides?: EthersCallOverrides): Promise<HLQTStake> {
    return this._readable.getHLQTStake(address, overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getTotalStakedHLQT} */
  getTotalStakedHLQT(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getTotalStakedHLQT(overrides);
  }

  /** {@inheritDoc @liquity/lib-base#ReadableLiquity.getFrontendStatus} */
  getFrontendStatus(address?: string, overrides?: EthersCallOverrides): Promise<FrontendStatus> {
    return this._readable.getFrontendStatus(address, overrides);
  }

  getHchfTokenAllowanceOfHchfContract(
    address?: string | undefined,
    overrides?: EthersCallOverrides | undefined
  ): Promise<Decimal> {
    return this._readable.getHchfTokenAllowanceOfHchfContract(address, overrides);
  }

  getHlqtTokenAllowanceOfHlqtContract(
    address?: string | undefined,
    overrides?: EthersCallOverrides | undefined
  ): Promise<Decimal> {
    return this._readable.getHlqtTokenAllowanceOfHlqtContract(address, overrides);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.openTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  openTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveCreationDetails> {
    return this.send.openTrove(params, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.closeTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  closeTrove(overrides?: EthersTransactionOverrides): Promise<TroveClosureDetails> {
    return this.send.closeTrove(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.adjustTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  adjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.adjustTrove(params, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.depositCollateral}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  depositCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.depositCollateral(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawCollateral}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.withdrawCollateral(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.borrowHCHF}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  borrowHCHF(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.borrowHCHF(amount, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.repayHCHF}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  repayHCHF(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.repayHCHF(amount, overrides).then(waitForSuccess);
  }

  /** @internal */
  setPrice(price: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.setPrice(price, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.liquidate}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  liquidate(
    address: string | string[],
    overrides?: EthersTransactionOverrides
  ): Promise<LiquidationDetails> {
    return this.send.liquidate(address, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.liquidateUpTo}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  liquidateUpTo(
    maximumNumberOfTrovesToLiquidate: number,
    overrides?: EthersTransactionOverrides
  ): Promise<LiquidationDetails> {
    return this.send.liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.depositHCHFInStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  depositHCHFInStabilityPool(
    amount: Decimalish,
    frontendTag?: string,
    overrides?: EthersTransactionOverrides
  ): Promise<StabilityDepositChangeDetails> {
    return this.send.depositHCHFInStabilityPool(amount, frontendTag, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawHCHFFromStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawHCHFFromStabilityPool(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<StabilityDepositChangeDetails> {
    return this.send.withdrawHCHFFromStabilityPool(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawGainsFromStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawGainsFromStabilityPool(
    overrides?: EthersTransactionOverrides
  ): Promise<StabilityPoolGainsWithdrawalDetails> {
    return this.send.withdrawGainsFromStabilityPool(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.transferCollateralGainToTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  transferCollateralGainToTrove(
    overrides?: EthersTransactionOverrides
  ): Promise<CollateralGainTransferDetails> {
    return this.send.transferCollateralGainToTrove(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.redeemHCHF}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  redeemHCHF(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<RedemptionDetails> {
    return this.send.redeemHCHF(amount, maxRedemptionRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.claimCollateralSurplus}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  claimCollateralSurplus(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.claimCollateralSurplus(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.stakeHLQT}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  stakeHLQT(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.stakeHLQT(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.unstakeHLQT}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  unstakeHLQT(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.unstakeHLQT(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawGainsFromStaking}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawGainsFromStaking(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.withdrawGainsFromStaking(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.registerFrontend}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  registerFrontend(kickbackRate: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.registerFrontend(kickbackRate, overrides).then(waitForSuccess);
  }

  /** @internal */
  _mintUniToken(
    amount: Decimalish,
    address?: string,
    overrides?: EthersTransactionOverrides
  ): Promise<void> {
    return this.send._mintUniToken(amount, address, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.approveUniTokens}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  approveUniTokens(allowance?: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.approveUniTokens(allowance, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.stakeUniTokens}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  stakeUniTokens(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.stakeUniTokens(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.unstakeUniTokens}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  unstakeUniTokens(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.unstakeUniTokens(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.withdrawHLQTRewardFromLiquidityMining}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  withdrawHLQTRewardFromLiquidityMining(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.withdrawHLQTRewardFromLiquidityMining(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @liquity/lib-base#TransactableLiquity.exitLiquidityMining}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   */
  exitLiquidityMining(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.exitLiquidityMining(overrides).then(waitForSuccess);
  }

  private async getHchfTokenAddress(): Promise<Address> {
    const { hchfToken } = _getContracts(this._readable.connection);
    const tokenAddress = await hchfToken.tokenAddress();

    return tokenAddress as Address;
  }

  private async getHlqtTokenAddress(): Promise<Address> {
    const { hlqtToken } = _getContracts(this._readable.connection);
    const tokenAddress = await hlqtToken.tokenAddress();

    return tokenAddress as Address;
  }

  private async getLpTokenAddress(): Promise<Address> {
    const { saucerSwapPool } = _getContracts(this._readable.connection);
    const tokenAddress = await saucerSwapPool.uniToken();

    return tokenAddress as Address;
  }
  async associateWithHchf(): Promise<void> {
    if (!this.connection.signer) {
      throw new Error("this.connection.signer is falsy! i cannot associate without a signer!");
    }

    const tokenAddress = await this.getHchfTokenAddress();
    const [, tokenIds] = await Promise.all([
      associateWithToken({ signer: this.connection.signer, tokenAddress }),
      getTokenIds(this.connection)
    ]);

    if (this.hasStore()) {
      await waitForTokenState({
        tokenIds: Object.values(tokenIds),
        evmAddress: this.connection.userAddress as Address,
        apiBaseUrl: this.mirrorNodeBaseUrl,
        fetch: this.fetch,
        requiredAssociations: [TokenId.fromSolidityAddress(tokenAddress)]
      });
      await this.store.refresh();
    }
  }

  async dissociateFromHchf(): Promise<void> {
    if (!this.connection.signer) {
      throw new Error("this.connection.signer is falsy! i cannot associate without a signer!");
    }

    const tokenAddress = await this.getHchfTokenAddress();
    const [, tokenIds] = await Promise.all([
      dissociateFromToken({ signer: this.connection.signer, tokenAddress }),
      getTokenIds(this.connection)
    ]);

    if (this.hasStore()) {
      await waitForTokenState({
        tokenIds: Object.values(tokenIds),
        evmAddress: this.connection.userAddress as Address,
        apiBaseUrl: this.mirrorNodeBaseUrl,
        fetch: this.fetch,
        requiredDissociations: [TokenId.fromSolidityAddress(tokenAddress)]
      });
      await this.store.refresh();
    }
  }

  async approveHchfToSpendHchf(amount: Decimal): Promise<void> {
    if (!this.connection.signer) {
      throw new Error(
        "this.connection.signer is falsy! i cannot approve allowances without a signer!"
      );
    }

    const tokenAddress = await this.getHchfTokenAddress();
    const { hchfToken } = _getContracts(this._readable.connection);
    const contractAddress = hchfToken.address as Address;

    await approveSpender({
      signer: this.connection.signer,
      tokenAddress,
      contractAddress,
      amount: BigNumber.from(amount.bigNumber)
    });

    if (this.hasStore()) {
      await this.store.refresh();
      // optimistic update
      (this.store as unknown as { _update: HLiquityStore["_update"] })._update({
        hchfTokenAllowanceOfHchfContract: amount
      });
    }
  }

  async associateWithHlqt(): Promise<void> {
    if (!this.connection.signer) {
      throw new Error("this.connection.signer is falsy! i cannot associate without a signer!");
    }

    const tokenAddress = await this.getHlqtTokenAddress();
    const [, tokenIds] = await Promise.all([
      associateWithToken({ signer: this.connection.signer, tokenAddress }),
      getTokenIds(this.connection)
    ]);

    if (this.hasStore()) {
      await waitForTokenState({
        tokenIds: Object.values(tokenIds),
        evmAddress: this.connection.userAddress as Address,
        apiBaseUrl: this.mirrorNodeBaseUrl,
        fetch: this.fetch,
        requiredAssociations: [TokenId.fromSolidityAddress(tokenAddress)]
      });
      await this.store.refresh();
    }
  }

  async dissociateFromHlqt(): Promise<void> {
    if (!this.connection.signer) {
      throw new Error("this.connection.signer is falsy! i cannot associate without a signer!");
    }

    const tokenAddress = await this.getHlqtTokenAddress();
    const [, tokenIds] = await Promise.all([
      dissociateFromToken({ signer: this.connection.signer, tokenAddress }),
      getTokenIds(this.connection)
    ]);

    if (this.hasStore()) {
      await waitForTokenState({
        tokenIds: Object.values(tokenIds),
        evmAddress: this.connection.userAddress as Address,
        apiBaseUrl: this.mirrorNodeBaseUrl,
        fetch: this.fetch,
        requiredDissociations: [TokenId.fromSolidityAddress(tokenAddress)]
      });
      await this.store.refresh();
    }
  }

  async approveHlqtToSpendHlqt(amount: Decimal): Promise<void> {
    if (!this.connection.signer) {
      throw new Error(
        "this.connection.signer is falsy! i cannot approve allowances without a signer!"
      );
    }

    const tokenAddress = await this.getHlqtTokenAddress();
    const { hlqtToken } = _getContracts(this._readable.connection);
    const contractAddress = hlqtToken.address as Address;

    await approveSpender({
      signer: this.connection.signer,
      tokenAddress,
      contractAddress,
      amount: BigNumber.from(amount.bigNumber)
    });

    if (this.hasStore()) {
      await this.store.refresh();
      // optimistic update
      (this.store as unknown as { _update: HLiquityStore["_update"] })._update({
        hlqtTokenAllowanceOfHlqtContract: amount
      });
    }
  }

  async associateWithLpToken(): Promise<void> {
    if (!this.connection.signer) {
      throw new Error("this.connection.signer is falsy! i cannot associate without a signer!");
    }

    const tokenAddress = await this.getLpTokenAddress();
    const [, tokenIds] = await Promise.all([
      associateWithToken({ signer: this.connection.signer, tokenAddress }),
      getTokenIds(this.connection)
    ]);

    if (this.hasStore()) {
      await waitForTokenState({
        tokenIds: Object.values(tokenIds),
        evmAddress: this.connection.userAddress as Address,
        apiBaseUrl: this.mirrorNodeBaseUrl,
        fetch: this.fetch,
        requiredAssociations: [TokenId.fromSolidityAddress(tokenAddress)]
      });
      await this.store.refresh();
    }
  }

  async dissociateFromLpToken(): Promise<void> {
    if (!this.connection.signer) {
      throw new Error("this.connection.signer is falsy! i cannot associate without a signer!");
    }

    const tokenAddress = await this.getLpTokenAddress();
    const [, tokenIds] = await Promise.all([
      dissociateFromToken({ signer: this.connection.signer, tokenAddress }),
      getTokenIds(this.connection)
    ]);

    if (this.hasStore()) {
      await waitForTokenState({
        tokenIds: Object.values(tokenIds),
        evmAddress: this.connection.userAddress as Address,
        apiBaseUrl: this.mirrorNodeBaseUrl,
        fetch: this.fetch,
        requiredDissociations: [TokenId.fromSolidityAddress(tokenAddress)]
      });
      await this.store.refresh();
    }
  }

  async approveSaucerSwapToSpendLpToken(amount: Decimal): Promise<void> {
    if (!this.connection.signer) {
      throw new Error(
        "this.connection.signer is falsy! i cannot approve allowances without a signer!"
      );
    }

    const tokenAddress = await this.getLpTokenAddress();
    const { saucerSwapPool } = _getContracts(this._readable.connection);
    const contractAddress = saucerSwapPool.address as Address;

    await approveSpender({
      signer: this.connection.signer,
      tokenAddress,
      contractAddress,
      amount: BigNumber.from(amount.bigNumber)
    });

    if (this.hasStore()) {
      await this.store.refresh();
      // optimistic update
      (this.store as unknown as { _update: HLiquityStore["_update"] })._update({
        uniTokenAllowance: amount
      });
    }
  }
}

/**
 * Variant of {@link EthersLiquity} that exposes a {@link @liquity/lib-base#LiquityStore}.
 *
 * @public
 */
export interface EthersLiquityWithStore<T extends HLiquityStore = HLiquityStore>
  extends EthersLiquity {
  /** An object that implements HLiquityStore. */
  readonly store: T;
}

class _EthersLiquityWithStore<T extends HLiquityStore = HLiquityStore>
  extends EthersLiquity
  implements EthersLiquityWithStore<T>
{
  readonly store: T;

  constructor(options: EthersLiquityOptions & { store: T }) {
    super(options);

    this.store = options.store;
  }

  hasStore(
    store?: EthersLiquityStoreOption
  ): this is EthersLiquityWithStore<BlockPolledLiquityStore> {
    return store === undefined || store === this.connection.useStore;
  }
}
