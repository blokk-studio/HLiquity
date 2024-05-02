import React, { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Provider } from "@ethersproject/abstract-provider";
import { useAccount, useChainId, useWalletClient, useClient } from "wagmi";
import { Web3Provider } from "@ethersproject/providers";

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
  chainId: number;
  deployment: _LiquityDeploymentJSON;
}

const NonNullableLiquityProvider: React.FC<
  NonNullableLiquityProviderProps & { children: ReactNode }
> = ({ children, config, provider, signer, userAddress, chainId, deployment }) => {
  const liquity = useMemo(() => {
    const { frontendTag } = deployment;
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
  }, [provider, signer, userAddress, chainId, deployment]);

  return (
    <LiquityContext.Provider value={{ config, account: userAddress, provider: provider, liquity }}>
      {children}
    </LiquityContext.Provider>
  );
};

export const LiquityProvider: React.FC<LiquityProviderProps & { children: ReactNode }> = ({
  children,
  loader,
  unsupportedNetworkFallback,
  unsupportedMainnetFallback
}) => {
  const chainId = useChainId();
  const config = useConfig();
  const deployment = useDeployment();
  const client = useClient();

  const wagmiProvider =
    client &&
    new Web3Provider(
      (method, params) =>
        client.request({
          method: method as any,
          params: params as any
        }),
      chainId
    );

  const account = useAccount();
  const walletClient = useWalletClient();

  const signer = account.address && walletClient.data && wagmiProvider?.getSigner(account.address);

  if (!config || !wagmiProvider || !signer || !account.address) {
    return <>{loader}</>;
  }

  if (config.testnetOnly && chainId === 1) {
    return <>{unsupportedMainnetFallback}</>;
  }

  if (!deployment) {
    return <>{unsupportedNetworkFallback}</>;
  }

  const provider = new BatchedProvider(wagmiProvider, chainId, 20000);

  return (
    <NonNullableLiquityProvider
      chainId={chainId}
      config={config}
      deployment={deployment}
      provider={provider}
      signer={signer}
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
