import { useSelectedChain } from "../components/chain_context";
import { enabledChains } from "../configuration/chains";
import { deployments } from "../configuration/deployments";

export const useHederaChains = () => {
  return chainsWithDeployment;
};

/** @deprecated use useSelectedChain instead. */
export const useHederaChain = () => {
  const selectedChain = useSelectedChain();

  return selectedChain;
};

const setOfChainIdsWithDeployment = new Set(deployments.map(deployment => deployment.chainId));
export const chainsWithDeployment = enabledChains.filter(chain =>
  setOfChainIdsWithDeployment.has(chain.id)
);
