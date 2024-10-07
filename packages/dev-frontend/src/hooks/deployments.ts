import { enabledChainIds } from "../configuration/chains";
import { deployments } from "../configuration/deployments";
import { useMultiWallet } from "../multi_wallet";

const setOfEnabledChainIds = new Set(enabledChainIds);
export const enabledDeployments = deployments.filter(deployment =>
  setOfEnabledChainIds.has(deployment.chainId)
);

/** returns all deployments currently configured in the environment */
export const useDeployments = () => {
  return enabledDeployments;
};

/** returns the deployment for the chain that is currently selected in wagmi or hashconnect */
export const useDeployment = () => {
  const { chain } = useMultiWallet();

  if (!chain) {
    const errorMessage = `i need a chain to get a deployment. useMultiWallet() returned ${JSON.stringify(
      chain
    )}`;
    console.error(errorMessage, { deployments: enabledDeployments });

    return null;
  }

  const chainId = chain.id;
  const deployment = enabledDeployments.find(deployment => deployment.chainId === chainId);

  if (!deployment) {
    const errorMessage = `there is no deployment for chain with id ${JSON.stringify(chainId)}`;
    console.error(errorMessage, { deployments: enabledDeployments });

    return null;
  }

  return deployment;
};
