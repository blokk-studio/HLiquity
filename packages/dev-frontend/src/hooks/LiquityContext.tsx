import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Provider } from "@ethersproject/abstract-provider";
import { FallbackProvider } from "@ethersproject/providers";
import { useProvider, useSigner, useAccount, useChainId } from "wagmi";

import { BlockPolledLiquityStore, EthersLiquity, EthersLiquityWithStore } from "@liquity/lib-ethers";

import { LiquityFrontendConfig, getConfig } from "../config";
import { BatchedProvider } from "../providers/BatchingProvider";
import { useDeployment } from "../configuration/deployments";
import { Signer } from "ethers";
import { _LiquityDeploymentJSON } from "@liquity/lib-ethers/dist/src/contracts";

type LiquityContextValue = {
  config: LiquityFrontendConfig;
  account: string;
  provider: Provider;
  liquity: EthersLiquityWithStore<BlockPolledLiquityStore>;
};

const LiquityContext = createContext<LiquityContextValue | undefined>(undefined);

type LiquityProviderProps = {
  loader?: React.ReactNode;
  unsupportedNetworkFallback?: React.ReactNode;
  unsupportedMainnetFallback?: React.ReactNode;
};

// TODO: move the config to env variables. no clue why this is a json file.
const useConfig = () => {
  const [config, setConfig] = useState<LiquityFrontendConfig>();
  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  return config;
};

interface NonNullableLiquityProviderProps {
  config: LiquityFrontendConfig;
  provider: Provider;
  signer: Signer;
  userAddress: `0x${string}`;
  frontendTag: `0x${string}`;
  chainId: number;
  deployment: _LiquityDeploymentJSON;
}

const NonNullableLiquityProvider: React.FC<NonNullableLiquityProviderProps> = ({
  children,
  config,
  provider,
  signer,
  userAddress,
  frontendTag,
  chainId,
  deployment
}) => {
  const liquity = useMemo(() => {
    const liquity = EthersLiquity.fromConnectionOptionsWithBlockPolledStore({
      chainId,
      deployment,
      provider,
      signer,
      frontendTag,
      userAddress
    });
    liquity.store.logging = true;

    return liquity;
  }, [provider, signer, userAddress, frontendTag, chainId, deployment]);

  return (
    <LiquityContext.Provider value={{ config, account: userAddress, provider: provider, liquity }}>
      {children}
    </LiquityContext.Provider>
  );
};

export const LiquityProvider: React.FC<LiquityProviderProps> = ({
  children,
  loader,
  unsupportedNetworkFallback,
  unsupportedMainnetFallback
}) => {
  const wagmiProvider = useProvider<FallbackProvider>();
  const signer = useSigner();
  const account = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const deployment = useDeployment();

  if (!config || !wagmiProvider || !signer.data || !account.address) {
    return <>{loader}</>;
  }

  if (config.testnetOnly && chainId === 1) {
    return <>{unsupportedMainnetFallback}</>;
  }

  if (!deployment) {
    return <>{unsupportedNetworkFallback}</>;
  }

  const provider = new BatchedProvider(wagmiProvider);

  return (
    <NonNullableLiquityProvider
      chainId={chainId}
      config={config}
      deployment={deployment}
      frontendTag={config.frontendTag}
      provider={provider}
      signer={signer.data}
      userAddress={account.address}
    >
      {children}
    </NonNullableLiquityProvider>
  );
};

export const useLiquity = () => {
  const liquityContext = useContext(LiquityContext);

  if (!liquityContext) {
    throw new Error("You must provide a LiquityContext via LiquityProvider");
  }

  return liquityContext;
};
