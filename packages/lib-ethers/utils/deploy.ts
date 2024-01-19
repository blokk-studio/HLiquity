import { Signer } from "@ethersproject/abstract-signer";
import { ContractTransaction, ContractFactory, Overrides } from "@ethersproject/contracts";
import { Wallet } from "@ethersproject/wallet";

import { Decimal } from "@liquity/lib-base";

import {
  _LiquityContractAddresses,
  _LiquityContracts,
  _LiquityDeploymentJSON,
  _connectToContracts
} from "../src/contracts";

import { createUniswapV2Pair } from "./UniswapV2Factory";

let silent = false;

export const log = (...args: unknown[]): void => {
  if (!silent) {
    console.log(...args);
  }
};

export const setSilent = (s: boolean): void => {
  silent = s;
};

const deployContract = async (
    deployer: Signer,
    getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
    contractName: string,
    ...args: unknown[]
) => {
  log(`Deploying ${contractName} ...`);
  const contract = await (await getContractFactory(contractName, deployer)).deploy(...args);

  log(`Waiting for transaction ${contract.deployTransaction.hash} ...`);
  const receipt = await contract.deployTransaction.wait();

  log({
    contractAddress: contract.address,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toNumber()
  });

  log();

  return contract.address;
};

const deployContracts = async (
    deployer: Signer,
    getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
    priceFeedIsTestnet = true,
    overrides?: Overrides
): Promise<Omit<_LiquityContractAddresses, "uniToken">> => {
  const addresses = {
    activePool: await deployContract(deployer, getContractFactory, "ActivePool", { ...overrides,      gasLimit: 3000000 }),
    borrowerOperations: await deployContract(deployer, getContractFactory, "BorrowerOperations", {
      ...overrides,
      gasLimit: 3000000
    }),
    troveManager: await deployContract(deployer, getContractFactory, "TroveManager", {
      ...overrides,
      gasLimit: 3000000
    }),
    collSurplusPool: await deployContract(deployer, getContractFactory, "CollSurplusPool", {
      ...overrides,
      gasLimit: 3000000
    }),
    communityIssuance: await deployContract(deployer, getContractFactory, "CommunityIssuance", {
      ...overrides,
      gasLimit: 3000000
    }),
    defaultPool: await deployContract(deployer, getContractFactory, "DefaultPool", { ...overrides, gasLimit: 3000000 }),
    hintHelpers: await deployContract(deployer, getContractFactory, "HintHelpers", { ...overrides, gasLimit: 3000000 }),
    lockupContractFactory: await deployContract(
        deployer,
        getContractFactory,
        "LockupContractFactory",
        { ...overrides,
          gasLimit: 3000000
        }
    ),
    lqtyStaking: await deployContract(deployer, getContractFactory, "LQTYStaking", { ...overrides, gasLimit: 3000000 }),
    priceFeed: await deployContract(
        deployer,
        getContractFactory,
        priceFeedIsTestnet ? "PriceFeedTestnet" : "PriceFeed",
        { ...overrides, gasLimit: 3000000 }
    ),
    sortedTroves: await deployContract(deployer, getContractFactory, "SortedTroves", {
      ...overrides, gasLimit: 3000000
    }),
    stabilityPool: await deployContract(deployer, getContractFactory, "StabilityPool", {
      ...overrides, gasLimit: 3000000
    }),
    gasPool: await deployContract(deployer, getContractFactory, "GasPool", {
      ...overrides, gasLimit: 3000000
    }),
    unipool: await deployContract(deployer, getContractFactory, "Unipool", { ...overrides, gasLimit: 3000000 })
  };

  return {
    ...addresses,
    lusdToken: await deployContract(
        deployer,
        getContractFactory,
        "LUSDToken",
        addresses.troveManager,
        addresses.stabilityPool,
        addresses.borrowerOperations,
        { ...overrides, gasLimit: 3000000 }
    ),

    lqtyToken: await deployContract(
        deployer,
        getContractFactory,
        "LQTYToken",
        addresses.communityIssuance,
        addresses.lqtyStaking,
        addresses.lockupContractFactory,
        Wallet.createRandom().address, // _bountyAddress (TODO: parameterize this)
        addresses.unipool, // _lpRewardsAddress
        Wallet.createRandom().address, // _multisigAddress (TODO: parameterize this)
        { ...overrides, gasLimit: 3000000 }
    ),

    multiTroveGetter: await deployContract(
        deployer,
        getContractFactory,
        "MultiTroveGetter",
        addresses.troveManager,
        addresses.sortedTroves,
        { ...overrides, gasLimit: 3000000 }
    )
  };
};

export const deployTellorCaller = (
    deployer: Signer,
    getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
    tellorAddress: string,
    overrides?: Overrides
): Promise<string> =>
    deployContract(deployer, getContractFactory, "TellorCaller", tellorAddress, { ...overrides, gasLimit: 3000000 });

/**
 * Send a transaction, retrying if the nonce is too high.
 *
 * This function attempts to send a blockchain transaction by connecting to a deployer.
 * If the nonce is too high, which might happen due to concurrent transactions or network issues,
 * it will retry sending the transaction up to a maximum number of retries (MAX_RETRIES).
 *
 * @param {Function} connect - A function that returns a promise resolving to a ContractTransaction object.
 * @param {Signer} deployer - The signer object representing the deployer of the contract.
 * @param {Overrides} [overrides] - Optional transaction overrides.
 * @param {number} [retryCount=0] - The current retry count (used internally for recursion).
 *
 * @returns {Promise<void>} A promise that resolves once the transaction has been sent and confirmed,
 *                          or rejects if an error occurs or the maximum number of retries is reached.
 */
const MAX_RETRIES = 10;

const sendTransaction = async (
    connect: (nonce: number) => Promise<ContractTransaction>,
    deployer: Signer,
    overrides?: Overrides,
    retryCount = 0
): Promise<void> => {
  try {
    const txCount = await deployer.provider!.getTransactionCount(await deployer.getAddress()); // The use of 'pending' takes into account the nonce of pending transactions as well as confirmed ones.
    const tx = await connect(txCount);
    await tx.wait();
  } catch (error) {
    if (error.code === 'NONCE_EXPIRED' && retryCount < MAX_RETRIES) {
      console.log(`Nonce expired, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      await sendTransaction(connect, deployer, overrides, retryCount + 1);
    } else {
      throw error;
    }
  }
};

const connectContracts = async (
    {
      activePool,
      borrowerOperations,
      troveManager,
      lusdToken,
      collSurplusPool,
      communityIssuance,
      defaultPool,
      lqtyToken,
      hintHelpers,
      lockupContractFactory,
      lqtyStaking,
      priceFeed,
      sortedTroves,
      stabilityPool,
      gasPool,
      unipool,
      uniToken
    }: _LiquityContracts,
    deployer: Signer,
    overrides?: Overrides
) => {
  if (!deployer.provider) {
    throw new Error("Signer must have a provider.");
  }

  const connections: ((nonce: number) => Promise<ContractTransaction>)[] = [
    nonce =>
        sortedTroves.setParams(1e6, troveManager.address, borrowerOperations.address, {
          ...overrides,
          gasLimit: 3000000,
          nonce
        }),

    nonce =>
        troveManager.setAddresses(
            borrowerOperations.address,
            activePool.address,
            defaultPool.address,
            stabilityPool.address,
            gasPool.address,
            collSurplusPool.address,
            priceFeed.address,
            lusdToken.address,
            sortedTroves.address,
            lqtyToken.address,
            lqtyStaking.address,
            { ...overrides, gasLimit: 3000000,  nonce }
        ),

    nonce =>
        borrowerOperations.setAddresses(
            troveManager.address,
            activePool.address,
            defaultPool.address,
            stabilityPool.address,
            gasPool.address,
            collSurplusPool.address,
            priceFeed.address,
            sortedTroves.address,
            lusdToken.address,
            lqtyStaking.address,
            { ...overrides, gasLimit: 3000000, nonce }
        ),

    nonce =>
        stabilityPool.setAddresses(
            borrowerOperations.address,
            troveManager.address,
            activePool.address,
            lusdToken.address,
            sortedTroves.address,
            priceFeed.address,
            communityIssuance.address,
            { ...overrides, gasLimit: 3000000, nonce }
        ),

    nonce =>
        activePool.setAddresses(
            borrowerOperations.address,
            troveManager.address,
            stabilityPool.address,
            defaultPool.address,
            { ...overrides, gasLimit: 3000000, nonce }
        ),

    nonce =>
        defaultPool.setAddresses(troveManager.address, activePool.address, {
          ...overrides,
          gasLimit: 3000000,
          nonce
        }),

    nonce =>
        collSurplusPool.setAddresses(
            borrowerOperations.address,
            troveManager.address,
            activePool.address,
            { ...overrides, gasLimit: 3000000, nonce }
        ),

    nonce =>
        hintHelpers.setAddresses(sortedTroves.address, troveManager.address, {
          ...overrides,
          gasLimit: 3000000,
          nonce
        }),

    nonce =>
        lqtyStaking.setAddresses(
            lqtyToken.address,
            lusdToken.address,
            troveManager.address,
            borrowerOperations.address,
            activePool.address,
            { ...overrides, gasLimit: 3000000, nonce }
        ),

    nonce =>
        lockupContractFactory.setLQTYTokenAddress(lqtyToken.address, {
          ...overrides,
          gasLimit: 3000000,
          nonce
        }),

    nonce =>
        communityIssuance.setAddresses(lqtyToken.address, stabilityPool.address, {
          ...overrides,
          gasLimit: 3000000,
          nonce
        }),

    nonce =>
        unipool.setParams(lqtyToken.address, uniToken.address, 2 * 30 * 24 * 60 * 60, {
          ...overrides,
          gasLimit: 3000000,
          nonce
        })
  ];

  let i = 0;
  for (const connect of connections) {
    await sendTransaction(connect, deployer, overrides);
    log(`Connected ${++i}`);
  }
};

const deployMockUniToken = (
    deployer: Signer,
    getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
    overrides?: Overrides
) =>
    deployContract(
        deployer,
        getContractFactory,
        "ERC20Mock",
        "Mock Uniswap V2",
        "UNI-V2",
        Wallet.createRandom().address, // initialAccount
        0, // initialBalance
        { ...overrides, gasLimit: 3000000 }
    );

export const deployAndSetupContracts = async (
    deployer: Signer,
    getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
    _priceFeedIsTestnet = true,
    _isDev = true,
    wethAddress?: string,
    overrides?: Overrides
): Promise<_LiquityDeploymentJSON> => {
  if (!deployer.provider) {
    throw new Error("Signer must have a provider.");
  }

  log("Deploying contracts...");
  log();

  const deployment: _LiquityDeploymentJSON = {
    chainId: await deployer.getChainId(),
    version: "unknown",
    deploymentDate: new Date().getTime(),
    bootstrapPeriod: 0,
    totalStabilityPoolLQTYReward: "0",
    liquidityMiningLQTYRewardRate: "0",
    _priceFeedIsTestnet,
    _uniTokenIsMock: !wethAddress,
    _isDev,

    addresses: await deployContracts(
        deployer,
        getContractFactory,
        _priceFeedIsTestnet,
        overrides
    ).then(async addresses => ({
      ...addresses,

      uniToken: await (wethAddress
          ? createUniswapV2Pair(deployer, wethAddress, addresses.lusdToken, overrides)
          : deployMockUniToken(deployer, getContractFactory, overrides))
    }))
  };

  const contracts = _connectToContracts(deployer, deployment);

  log("Connecting contracts...");
  await connectContracts(contracts, deployer, overrides);

  const lqtyTokenDeploymentTime = await contracts.lqtyToken.getDeploymentStartTime();
  const bootstrapPeriod = await contracts.troveManager.BOOTSTRAP_PERIOD();
  const totalStabilityPoolLQTYReward = await contracts.communityIssuance.LQTYSupplyCap();
  const liquidityMiningLQTYRewardRate = await contracts.unipool.rewardRate();

  return {
    ...deployment,
    deploymentDate: lqtyTokenDeploymentTime.toNumber() * 1000,
    bootstrapPeriod: bootstrapPeriod.toNumber(),
    totalStabilityPoolLQTYReward: `${Decimal.fromBigNumberString(
        totalStabilityPoolLQTYReward.toHexString()
    )}`,
    liquidityMiningLQTYRewardRate: `${Decimal.fromBigNumberString(
        liquidityMiningLQTYRewardRate.toHexString()
    )}`
  };
};
