import React, { createContext, useContext, useMemo } from "react";
import { useDeployment } from "../configuration/deployments";
import { _LiquityDeploymentJSON } from "@liquity/lib-ethers/dist/src/contracts";
import { HLiquityStore, ReadableLiquity } from "@liquity/lib-base";
import { HederaChain, useHederaChain } from "../hedera/wagmi-chains";
import { useHashConnect, useHashConnectSessionData } from "../components/HashConnectProvider";
import { HashgraphLiquity } from "@liquity/lib-hashgraph";
import { getConsumer, getLoader } from "../optional_context";

export type LiquityContextValue = {
  account: string;
  liquity: ReadableLiquity;
  store: HLiquityStore;
};

export const LiquityContext = createContext<LiquityContextValue | null>(null);

type LiquityProviderProps = {
  unsupportedNetworkFallback?: React.ReactNode;
  unsupportedMainnetFallback?: React.ReactNode;
};

interface NonNullableLiquityProviderProps {
  deployment: _LiquityDeploymentJSON;
  chain: HederaChain;
}

const NonNullableLiquityProvider: React.FC<NonNullableLiquityProviderProps> = ({
  children,
  deployment,
  chain
}) => {
  const hashConnectSessionData = useHashConnectSessionData();
  const hashConnect = useHashConnect();

  const liquity = useMemo(() => {
    const rpcUrl = chain.rpcUrls.default.http[0] as `https://${string}`;

    const hashgraphLiquity = HashgraphLiquity.fromEvmAddresses({
      userAccountId: hashConnectSessionData.userAccountId,
      userAccountAddress: hashConnectSessionData.userAccountEvmAddress,
      deploymentAddresses: deployment.addresses as Record<string, `0x${string}`>,
      totalStabilityPoolHlqtReward: parseInt(deployment.totalStabilityPoolHLQTReward),
      frontendAddress: deployment.frontendTag,
      userHashConnect: hashConnect,
      rpcUrl
    });

    Object.assign(hashgraphLiquity, { connection: deployment });

    return hashgraphLiquity;
  }, [deployment, chain, hashConnectSessionData, hashConnect]);

  return (
    <LiquityContext.Provider
      value={{ account: hashConnectSessionData.userAccountEvmAddress, liquity, store: liquity }}
    >
      {children}
    </LiquityContext.Provider>
  );
};

export const OptionalLiquityConsumer = LiquityContext.Consumer;
export const LiquityConsumer = getConsumer(LiquityContext, {
  errorMessage: `the liquity context hasn't been set. make sure you have <LiquityProvider> and <LiquityLoader> as ancestors of this <LiquityConsumer>.`
});
export const LiquityLoader = getLoader(LiquityContext);

export const LiquityProvider: React.FC<LiquityProviderProps> = ({
  children,
  unsupportedNetworkFallback
}) => {
  const deployment = useDeployment();
  const chain = useHederaChain();

  if (!deployment) {
    return <>{unsupportedNetworkFallback}</>;
  }

  if (!chain) {
    return <>{unsupportedNetworkFallback}</>;
  }

  return (
    <NonNullableLiquityProvider deployment={deployment} chain={chain}>
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
