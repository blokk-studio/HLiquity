import React, { createContext, useContext, useMemo } from "react";
import { useDeployment } from "../hooks/deployments";
import {
  ConsentableLiquity,
  Constants,
  Deployment,
  DeploymentAddressesKey,
  HLiquityStore,
  PopulatableLiquity,
  ReadableLiquity,
  SendableLiquity
} from "@liquity/lib-base";
import { HederaChain, getChainFromId } from "../configuration/chains";
import {
  HashConnectSessionDataLoader,
  useHashConnect,
  useHashConnectSessionData
} from "../components/HashConnectProvider";
import { HashgraphLiquity } from "@liquity/lib-hashgraph";
import { getConsumer, getLoader } from "../optional_context";
import { useSelectedChain } from "../components/chain_context";
import { Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import { EthersLiquity } from "@liquity/lib-ethers";
import { useMultiWallet } from "../multi_wallet";
import { useAccount, useChainId, useProvider, useSigner } from "wagmi";
import { FallbackProvider } from "@ethersproject/providers";
import { BatchedProvider } from "../providers/BatchingProvider";
import { AppLoader } from "../components/AppLoader";
import { Heading } from "theme-ui";
import { useConstants } from "./constants";
import {
  HederaDappConnectorSessionLoader,
  useHederaDappConnectorContext,
  useHederaDappConnectorSession
} from "../components/HederaDappConnectorProvider";
import { PlaceholderLiquity } from "@liquity/lib-placeholder";

export type LiquityContextValue = {
  liquity: ReadableLiquity &
    ConsentableLiquity & {
      send: SendableLiquity;
      populate: PopulatableLiquity;
      connection: {
        addresses: Record<DeploymentAddressesKey, `0x${string}`>;
        version: string;
        deploymentDate: Date;
        frontendTag: `0x${string}`;
        signer?: Signer;
      };
    };
  store: HLiquityStore;
  /** @deprecated use `const { addressDisplayText } = useMultiWallet()` instead */
  account: string;
};

export const LiquityContext = createContext<LiquityContextValue | null>(null);

type LiquityProviderProps = {
  unsupportedNetworkFallback?: React.ReactNode;
  unsupportedMainnetFallback?: React.ReactNode;
};

interface HashgraphLiquityProviderProps {
  deployment: Deployment;
  chain: HederaChain;
  constants: Constants;
}
const HashgraphLiquityProvider: React.FC<HashgraphLiquityProviderProps> = ({
  children,
  deployment,
  chain,
  constants
}) => {
  const hashConnectSessionData = useHashConnectSessionData();
  const hashConnect = useHashConnect();

  const liquity = useMemo(() => {
    const rpcUrl = chain.rpcUrls.default.http[0] as `https://${string}`;
    const mirrorNodeBaseUrl = chain.apiBaseUrl;

    const hashgraphLiquity = HashgraphLiquity.fromEvmAddressesAndHashConnect({
      userAccountId: hashConnectSessionData.userAccountId,
      userAccountAddress: hashConnectSessionData.userAccountEvmAddress,
      deploymentAddresses: deployment.addresses as Record<string, `0x${string}`>,
      totalStabilityPoolHlqtReward: parseInt(deployment.totalStabilityPoolHLQTReward),
      frontendAddress: deployment.frontendTag,
      userHashConnect: hashConnect,
      rpcUrl,
      mirrorNodeBaseUrl,
      fetch: window.fetch.bind(window),
      constants,
      deployment: deployment
    });

    return hashgraphLiquity;
  }, [deployment, chain, hashConnectSessionData, hashConnect, constants]);

  return (
    <LiquityContext.Provider
      value={{
        account: hashConnectSessionData.userAccountEvmAddress,
        liquity,
        store: liquity
      }}
    >
      {children}
    </LiquityContext.Provider>
  );
};

interface HederaDappConnectorLiquityProviderProps {
  deployment: Deployment;
  chain: HederaChain;
  constants: Constants;
}
const HederaDappConnectorLiquityProvider: React.FC<HederaDappConnectorLiquityProviderProps> = ({
  children,
  deployment,
  chain,
  constants
}) => {
  const hederaDappConnectorSession = useHederaDappConnectorSession();
  const hederaDappConnectorContext = useHederaDappConnectorContext();

  const liquity = useMemo(() => {
    const rpcUrl = chain.rpcUrls.default.http[0] as `https://${string}`;
    const mirrorNodeBaseUrl = chain.apiBaseUrl;

    const hashgraphLiquity = HashgraphLiquity.fromEvmAddressesAndDappConnector({
      userAccountId: hederaDappConnectorSession.userAccountId,
      userAccountAddress: hederaDappConnectorSession.userAccountEvmAddress,
      deploymentAddresses: deployment.addresses as Record<string, `0x${string}`>,
      totalStabilityPoolHlqtReward: parseInt(deployment.totalStabilityPoolHLQTReward),
      frontendAddress: deployment.frontendTag,
      dappConnector: hederaDappConnectorContext.dappConnector,
      rpcUrl,
      mirrorNodeBaseUrl,
      fetch: window.fetch.bind(window),
      constants,
      deployment: deployment
    });

    return hashgraphLiquity;
  }, [deployment, chain, hederaDappConnectorSession, hederaDappConnectorContext, constants]);

  return (
    <LiquityContext.Provider
      value={{
        account: hederaDappConnectorSession.userAccountEvmAddress,
        liquity,
        store: liquity
      }}
    >
      {children}
    </LiquityContext.Provider>
  );
};

interface EthersLiquityProviderProps {
  provider: Provider;
  signer: Signer;
  userAddress: `0x${string}`;
  chain: HederaChain;
  deployment: Deployment;
  constants: Constants;
}

const EthersLiquityProvider: React.FC<EthersLiquityProviderProps> = ({
  children,
  provider,
  signer,
  userAddress,
  chain,
  deployment,
  constants
}) => {
  const liquity = useMemo(() => {
    const { frontendTag } = deployment;
    const ethersDeployment = {
      ...deployment,
      deploymentDate: deployment.deploymentDate.getTime() / 1000
    };

    const liquity = EthersLiquity.fromConnectionOptionsWithBlockPolledStore({
      chainId: chain.id,
      deployment: ethersDeployment,
      provider,
      signer,
      frontendTag,
      userAddress,
      mirrorNodeBaseUrl: chain.apiBaseUrl,
      fetch: window.fetch.bind(window),
      constants
    });
    liquity.store.logging = true;

    return liquity;
  }, [provider, signer, userAddress, chain, deployment, constants]);

  return (
    <LiquityContext.Provider value={{ account: userAddress, store: liquity.store, liquity }}>
      {children}
    </LiquityContext.Provider>
  );
};

export const OptionalLiquityConsumer = LiquityContext.Consumer;
export const LiquityConsumer = getConsumer(LiquityContext, {
  errorMessage: `the liquity context hasn't been set. make sure you have <LiquityProvider> and <LiquityLoader> as ancestors of this <LiquityConsumer>.`
});
export const LiquityLoader = getLoader(LiquityContext);

export const WagmiLoader: React.FC<{ loader: React.ReactNode }> = ({ loader, children }) => {
  const wagmiProvider = useProvider<FallbackProvider>();
  const signer = useSigner();
  const account = useAccount();

  if (!wagmiProvider || !signer.data || !account.address) {
    return <>{loader}</>;
  }

  return <>{children}</>;
};

export const LiquityProvider: React.FC<LiquityProviderProps> = ({
  children,
  unsupportedNetworkFallback
}) => {
  const { chain, hasHashConnect, hasWagmi, hasHederaDappConnector } = useMultiWallet();
  const deployment = useDeployment();
  // wagmi
  const ethersProvider = useProvider<FallbackProvider>();
  const ethersSigner = useSigner();
  const ethersAccount = useAccount();
  const ethersChainId = useChainId();
  const ethersChain = getChainFromId(ethersChainId);
  // hashpack
  const hashgraphChain = useSelectedChain();
  const constants = useConstants();

  if (!deployment) {
    return <>{unsupportedNetworkFallback}</>;
  }

  if (hasHashConnect) {
    if (!hashgraphChain) {
      return <>{unsupportedNetworkFallback}</>;
    }

    return (
      <HashConnectSessionDataLoader
        loader={<AppLoader content={<Heading>Setting up HashPack</Heading>} />}
      >
        <HashgraphLiquityProvider
          deployment={deployment}
          chain={hashgraphChain}
          constants={constants}
        >
          {children}
        </HashgraphLiquityProvider>
      </HashConnectSessionDataLoader>
    );
  }

  if (hasHederaDappConnector) {
    if (!hashgraphChain) {
      return <>{unsupportedNetworkFallback}</>;
    }

    return (
      <HederaDappConnectorSessionLoader
        loader={<AppLoader content={<Heading>Setting up Hedera wallets</Heading>} />}
      >
        <HederaDappConnectorLiquityProvider
          deployment={deployment}
          chain={hashgraphChain}
          constants={constants}
        >
          {children}
        </HederaDappConnectorLiquityProvider>
      </HederaDappConnectorSessionLoader>
    );
  }

  if (hasWagmi) {
    if (!ethersProvider || !ethersSigner.data || !ethersAccount.address) {
      throw new Error(
        `wagmi's useProvider(), useSigner().data or useAccount().address are falsy. this should never happen, because \`useAccount().address\` and \`useSigner().data\` must be defined for us to get here. please investigate \`useMultiWallet().hasWagmi\` and the wagmi context to resolve this disparity. ${JSON.stringify(
          {
            "!!provider": !!ethersProvider,
            "!!signer.data": !!ethersSigner.data,
            "account.address": ethersAccount.address
          }
        )}`
      );
    }

    const provider = new BatchedProvider(ethersProvider, ethersChain.id, 20000);

    return (
      <EthersLiquityProvider
        chain={ethersChain}
        deployment={deployment}
        provider={provider}
        signer={ethersSigner.data}
        userAddress={ethersAccount.address}
        constants={constants}
      >
        {children}
      </EthersLiquityProvider>
    );
  }

  const rpcUrl = chain.rpcUrls.default.http[0] as `https://${string}`;
  const liquity = PlaceholderLiquity.fromEvmAddresses({
    deploymentAddresses: deployment.addresses as Record<string, `0x${string}`>,
    totalStabilityPoolHlqtReward: parseInt(deployment.totalStabilityPoolHLQTReward),
    frontendAddress: deployment.frontendTag,
    rpcUrl,
    constants,
    deployment: deployment
  });

  return (
    <LiquityContext.Provider
      value={{
        account: "",
        liquity,
        store: liquity
      }}
    >
      {children}
    </LiquityContext.Provider>
  );
};

export const useLiquity = () => {
  const liquityContext = useContext(LiquityContext);

  if (!liquityContext) {
    throw new Error("You must provide a LiquityContext via LiquityProvider");
  }

  return liquityContext;
};
