// import { Chain } from "@wagmi/core";
import { hedera, hederaTestnet, hederaPreviewnet } from "wagmi/chains";
import { useChainId } from "wagmi";
import { enabledChainIds } from "../configuration/enabled_chains";
import { deployments } from "../configuration/deployments";

// interface HederaChain extends Chain {
//   apiBaseUrl: string;
//   color: `#${string}`;
// }

const chains = [hedera, hederaTestnet, hederaPreviewnet] as const;

const enabledChainIdsSet = new Set(enabledChainIds);
const enabledChains = chains.filter(chain => enabledChainIdsSet.has(chain.id));
const setOfChainIdsWithDeployment = new Set(deployments.map(deployment => deployment.chainId));
const chainsWithDeployment = enabledChains.filter(chain =>
  setOfChainIdsWithDeployment.has(chain.id)
);

export const getChainFromId = (chainId: number) => {
  const chain = chains.find(chain => chain.id === chainId);
  if (!chain) {
    const errorMessage = `chain id ${chainId} does not belong to a hedera chain. pass one of ${chains
      .map(chain => `${chain.id} (${chain.name})`)
      .join(", ")}.`;
    console.error(errorMessage, "received:", { chainId });
    throw new Error(errorMessage);
  }

  return chain;
};

export const useHederaChains = () => {
  return chains;
};

export const useHederaChain = () => {
  const chainId = useChainId();

  console.log(chainId, 'chain ID config')

  if (chainId === undefined) {
    return null;
  }

  const hederaChain = chains.find(chain => chain.id === chainId);
  if (!hederaChain) {
    return null;
  }

  return hederaChain;
};
