import { BigNumber } from "@ethersproject/bignumber";
import { Block, BlockTag } from "@ethersproject/abstract-provider";
import { Signer } from "@ethersproject/abstract-signer";

import { Address, Decimal } from "@liquity/lib-base";

import devOrNull from "../deployments/dev.json";
import hederaLocalTestnet from "../deployments/hederaLocalTestnet.json";
import hederaTestnet from "../deployments/hederaTestnet.json";

import { EthersProvider, EthersSigner } from "./types";

import {
  _connectToContracts,
  _LiquityContractAddresses,
  _LiquityContracts,
  _LiquityDeploymentJSON
} from "./contracts";

import { _connectToMulticall, _Multicall } from "./_Multicall";
import { Fetch } from "@liquity/mirror-node";
import { TokenId } from "@hashgraph/sdk";

const dev = devOrNull as _LiquityDeploymentJSON | null;

/** @deprecated deployments are passed through the environment */
const deployments: {
  [chainId: number]: _LiquityDeploymentJSON | undefined;
} = {
  // TODO: deploy to mainnet
  // [hedera.chainId]: hedera,
  [hederaLocalTestnet.chainId]: hederaLocalTestnet as unknown as _LiquityDeploymentJSON,
  // TODO: deploy to previewnet
  // [hederaPreviewnet.chainId]: hederaPreviewnet,
  [hederaTestnet.chainId]: hederaTestnet as unknown as _LiquityDeploymentJSON,

  ...(dev !== null ? { [dev.chainId]: dev } : {})
};

declare const brand: unique symbol;

const branded = <T>(t: Omit<T, typeof brand>): T => t as T;

/**
 * Information about a connection to the Liquity protocol.
 *
 * @remarks
 * Provided for debugging / informational purposes.
 *
 * Exposed through {@link ReadableEthersLiquity.connection} and {@link EthersLiquity.connection}.
 *
 * @public
 */
export interface EthersLiquityConnection extends EthersLiquityConnectionOptionalParams {
  /** Ethers `Provider` used for connecting to the network. */
  readonly provider: EthersProvider;

  /** Ethers `Signer` used for sending transactions. */
  readonly signer?: EthersSigner;

  /** Chain ID of the connected network. */
  readonly chainId: number;

  /** Version of the Liquity contracts (Git commit hash). */
  readonly version: string;

  /** Date when the Liquity contracts were deployed. */
  readonly deploymentDate: Date;

  /** Time period (in seconds) after `deploymentDate` during which redemptions are disabled. */
  readonly bootstrapPeriod: number;

  /** Total amount of HLQT allocated for rewarding stability depositors. */
  readonly totalStabilityPoolHLQTReward: Decimal;

  /** Amount of HLQT collectively rewarded to stakers of the liquidity mining pool per second. */
  readonly liquidityMiningHLQTRewardRate: Decimal;

  /** A mapping of Liquity contracts' names to their addresses. */
  readonly addresses: _LiquityContractAddresses;

  /** @internal */
  readonly _priceFeedIsTestnet: boolean;

  /** @internal */
  readonly _isDev: boolean;

  /** @internal */
  readonly [brand]: unique symbol;
}

/** @internal */
export interface _InternalEthersLiquityConnection extends EthersLiquityConnection {
  readonly addresses: _LiquityContractAddresses;
  readonly _contracts: _LiquityContracts;
  readonly _multicall?: _Multicall;
}

export interface EthersLiquityConnectionOptions extends EthersLiquityConnectionOptionalParams {
  deployment: _LiquityDeploymentJSON;
  provider: EthersProvider;
  signer: EthersSigner;
  chainId: number;
  mirrorNodeBaseUrl: string;
  fetch: Fetch;
}

const getConnection = (
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  _contracts: _LiquityContracts,
  _multicall: _Multicall | undefined,
  {
    deploymentDate,
    totalStabilityPoolHLQTReward,
    liquidityMiningHLQTRewardRate,
    ...deployment
  }: _LiquityDeploymentJSON,
  optionalParams: EthersLiquityConnectionOptionalParams
): _InternalEthersLiquityConnection => {
  if (
    optionalParams &&
    optionalParams.useStore !== undefined &&
    !validStoreOptions.includes(optionalParams.useStore)
  ) {
    throw new Error(`Invalid useStore value ${optionalParams.useStore}`);
  }

  return branded({
    provider,
    signer,
    _contracts,
    _multicall,
    deploymentDate: new Date(deploymentDate),
    totalStabilityPoolHLQTReward: Decimal.from(totalStabilityPoolHLQTReward),
    liquidityMiningHLQTRewardRate: Decimal.from(liquidityMiningHLQTRewardRate),
    ...deployment,
    ...optionalParams
  });
};

export const getConnectionWithBlockPolledStore = (
  options: Omit<EthersLiquityConnectionOptions, "useStore">
): EthersLiquityConnection & { useStore: "blockPolled" } => {
  const connection = getConnection(
    options.provider,
    options.signer,
    _connectToContracts(options.signer, options.deployment),
    _connectToMulticall(options.signer, options.chainId),
    options.deployment,
    {
      ...options,
      useStore: "blockPolled"
    }
  ) as EthersLiquityConnection & { useStore: "blockPolled" };

  return connection;
};

/** @internal */
export const _getContracts = (connection: EthersLiquityConnection): _LiquityContracts =>
  (connection as _InternalEthersLiquityConnection)._contracts;

const getMulticall = (connection: EthersLiquityConnection): _Multicall | undefined =>
  (connection as _InternalEthersLiquityConnection)._multicall;

const numberify = (bigNumber: BigNumber) => bigNumber.toNumber();

const getTimestampFromBlock = ({ timestamp }: Block) => timestamp;

/** @internal */
export const _getBlockTimestampAsNumber = (
  connection: EthersLiquityConnection,
  blockTag: BlockTag = "latest"
): Promise<number> =>
  // Get the timestamp via a contract call whenever possible, to make it batchable with other calls
  getMulticall(connection)?.getCurrentBlockTimestamp({ blockTag }).then(numberify) ??
  _getProvider(connection).getBlock(blockTag).then(getTimestampFromBlock);

/** @internal */
export const _getBlockTimestamp = (
  connection: EthersLiquityConnection,
  blockTag: BlockTag = "latest"
): Promise<number> =>
  // Get the timestamp via a contract call whenever possible, to make it batchable with other calls
  getMulticall(connection)?.getCurrentBlockTimestamp({ blockTag }).then(numberify) ??
  _getProvider(connection).getBlock(blockTag).then(getTimestampFromBlock);

const panic = <T>(e: unknown): T => {
  throw e;
};

/** @internal */
export const _requireSigner = (connection: EthersLiquityConnection): EthersSigner =>
  connection.signer ?? panic(new Error("Must be connected through a Signer"));

/** @internal */
export const _getProvider = (connection: EthersLiquityConnection): EthersProvider =>
  connection.provider;

// TODO parameterize error message?
/** @internal */
export const _requireAddress = (
  connection: EthersLiquityConnection,
  overrides?: { from?: string }
): string =>
  overrides?.from ?? connection.userAddress ?? panic(new Error("A user address is required"));

/** @internal */
export const _requireFrontendAddress = (connection: EthersLiquityConnection): string =>
  connection.frontendTag ?? panic(new Error("A frontend address is required"));

/** @internal */
export const _usingStore = (
  connection: EthersLiquityConnection
): connection is EthersLiquityConnection & { useStore: EthersLiquityStoreOption } =>
  connection.useStore !== undefined;

/**
 * Thrown when trying to connect to a network where Liquity is not deployed.
 *
 * @remarks
 * Thrown by {@link ReadableEthersLiquity.(connect:2)} and {@link EthersLiquity.(connect:2)}.
 *
 * @public
 */
export class UnsupportedNetworkError extends Error {
  /** Chain ID of the unsupported network. */
  readonly chainId: number;

  /** @internal */
  constructor(chainId: number) {
    super(`Unsupported network (chainId = ${chainId})`);
    this.name = "UnsupportedNetworkError";
    this.chainId = chainId;
  }
}

const getProviderAndSigner = (
  signerOrProvider: EthersSigner | EthersProvider
): [provider: EthersProvider, signer: EthersSigner | undefined] => {
  const provider: EthersProvider = Signer.isSigner(signerOrProvider)
    ? signerOrProvider.provider ?? panic(new Error("Signer must have a Provider"))
    : signerOrProvider;

  const signer = Signer.isSigner(signerOrProvider) ? signerOrProvider : undefined;

  return [provider, signer];
};

/** @internal */
export const _connectToDeployment = (
  deployment: _LiquityDeploymentJSON,
  signerOrProvider: EthersSigner | EthersProvider,
  optionalParams: EthersLiquityConnectionOptionalParams
): EthersLiquityConnection =>
  getConnection(
    ...getProviderAndSigner(signerOrProvider),
    _connectToContracts(signerOrProvider, deployment),
    undefined,
    deployment,
    optionalParams
  );

/**
 * Possible values for the optional
 * {@link EthersLiquityConnectionOptionalParams.useStore | useStore}
 * connection parameter.
 *
 * @remarks
 * Currently, the only supported value is `"blockPolled"`, in which case a
 * {@link BlockPolledLiquityStore} will be created.
 *
 * @public
 */
export type EthersLiquityStoreOption = "blockPolled";

const validStoreOptions = ["blockPolled"];

/**
 * Optional parameters of {@link ReadableEthersLiquity.(connect:2)} and
 * {@link EthersLiquity.(connect:2)}.
 *
 * @public
 */
export interface EthersLiquityConnectionOptionalParams {
  /**
   * Address whose Trove, Stability Deposit, HLQT Stake and balances will be read by default.
   *
   * @remarks
   * For example {@link EthersLiquity.getTrove | getTrove(address?)} will return the Trove owned by
   * `userAddress` when the `address` parameter is omitted.
   *
   * Should be omitted when connecting through a {@link EthersSigner | Signer}. Instead `userAddress`
   * will be automatically determined from the `Signer`.
   */
  readonly userAddress?: string;

  /**
   * Address that will receive HLQT rewards from newly created Stability Deposits by default.
   *
   * @remarks
   * For example
   * {@link EthersLiquity.depositHCHFInStabilityPool | depositHCHFInStabilityPool(amount, frontendTag?)}
   * will tag newly made Stability Deposits with this address when its `frontendTag` parameter is
   * omitted.
   */
  readonly frontendTag: Address;

  /**
   * Create a {@link @liquity/lib-base#LiquityStore} and expose it as the `store` property.
   *
   * @remarks
   * When set to one of the available {@link EthersLiquityStoreOption | options},
   * {@link ReadableEthersLiquity.(connect:2) | ReadableEthersLiquity.connect()} will return a
   * {@link ReadableEthersLiquityWithStore}, while
   * {@link EthersLiquity.(connect:2) | EthersLiquity.connect()} will return an
   * {@link EthersLiquityWithStore}.
   *
   * Note that the store won't start monitoring the blockchain until its
   * {@link @liquity/lib-base#LiquityStore.start | start()} function is called.
   */
  readonly useStore?: EthersLiquityStoreOption;
}

/** @internal */
export function _connectByChainId<T>(
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  chainId: number,
  optionalParams: EthersLiquityConnectionOptionalParams & { useStore: T }
): EthersLiquityConnection & { useStore: T };

/** @internal */
export function _connectByChainId(
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  chainId: number,
  optionalParams: EthersLiquityConnectionOptionalParams
): EthersLiquityConnection;

/** @internal */
export function _connectByChainId(
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  chainId: number,
  optionalParams: EthersLiquityConnectionOptionalParams
): EthersLiquityConnection {
  const deployment: _LiquityDeploymentJSON =
    deployments[chainId] ?? panic(new UnsupportedNetworkError(chainId));

  return getConnection(
    provider,
    signer,
    _connectToContracts(signer ?? provider, deployment),
    _connectToMulticall(signer ?? provider, chainId),
    deployment,
    optionalParams
  );
}

/** @internal */
export const _connect = async (
  signerOrProvider: EthersSigner | EthersProvider,
  optionalParams: EthersLiquityConnectionOptionalParams
): Promise<EthersLiquityConnection> => {
  const [provider, signer] = getProviderAndSigner(signerOrProvider);

  if (signer) {
    if (optionalParams?.userAddress !== undefined) {
      throw new Error("Can't override userAddress when connecting through Signer");
    }

    optionalParams = {
      ...optionalParams,
      userAddress: await signer.getAddress()
    };
  }

  return _connectByChainId(provider, signer, (await provider.getNetwork()).chainId, optionalParams);
};

export const getTokenIds = async (connection: EthersLiquityConnection) => {
  const { hchfToken, hlqtToken, saucerSwapPool } = _getContracts(connection);

  const [hchfTokenAddress, hlqtTokenAddress, lpTokenAddress] = await Promise.all([
    hchfToken.tokenAddress(),
    hlqtToken.tokenAddress(),
    saucerSwapPool.uniToken()
  ]);
  const tokenAddresses = [hchfTokenAddress, hlqtTokenAddress, lpTokenAddress];
  const [hchfTokenId, hlqtTokenId, lpTokenId] = tokenAddresses.map(tokenAddress =>
    TokenId.fromSolidityAddress(tokenAddress)
  );

  return {
    hchfTokenId,
    hlqtTokenId,
    lpTokenId
  };
};
