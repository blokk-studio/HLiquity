import { _LiquityDeploymentJSON } from "@liquity/lib-ethers/dist/src/contracts";
import { enabledChainIds } from "./enabled_chains";
import { useChainId } from "wagmi";

const parseDeploymentsFromEnv = (
  enabledChainIds: number[],
  env: Record<string, string>
): _LiquityDeploymentJSON[] => {
  // parse deployments
  const deployments: _LiquityDeploymentJSON[] = [];
  for (const chainId of enabledChainIds) {
    const deploymentJsonString: string | undefined = env[`VITE_CHAIN_${chainId}_DEPLOYMENT`];

    if (!deploymentJsonString) {
      console.warn(
        `there is no deployment configured for enabled chain with id ${chainId}. set the environment variable \`VITE_CHAIN_${chainId}_DEPLOYMENT\` to the JSON-encoded string of the deployment. see https://github.com/blokk-studio/HLiquity/blob/main/packages/lib-ethers/deployments/default/hedera.json for an example deployment configuration.`
      );
      continue;
    }

    try {
      const deployment: _LiquityDeploymentJSON = JSON.parse(deploymentJsonString);
      deployments.push(deployment);
    } catch (error: unknown) {
      console.warn(
        `misformatted deployment configuration for chain with id ${chainId}. ignoring this deployment.`,
        error
      );
    }
  }

  return deployments;
};

// this value never changes on app mount, so we don't need a context or provider.
export const deployments = parseDeploymentsFromEnv(enabledChainIds, import.meta.env);

/** returns all deployments currently configured in the environment */
export const useDeployments = () => {
  return deployments;
};

/** returns the deployment for the chain that is currently selected by wagmi */
export const useDeployment = () => {
  const chainId = useChainId();
  const deployment = deployments.find(deployment => deployment.chainId === chainId);

  if (!deployment) {
    const errorMessage = `there is no deployment for chain with id ${JSON.stringify(chainId)}`;
    console.error(errorMessage, { deployments });

    return null;
  }

  return deployment;
};
