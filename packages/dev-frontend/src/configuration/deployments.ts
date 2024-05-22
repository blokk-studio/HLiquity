import { Deployment, DeploymentDefinition, getDeployment } from "@liquity/lib-base";

const parseDeploymentsFromEnv = (env: Record<string, string>): Deployment[] => {
  // parse deployments
  const deployments: Deployment[] = [];
  for (const chainId of [295, 296, 297]) {
    const deploymentJsonString: string | undefined = env[`VITE_CHAIN_${chainId}_DEPLOYMENT`];

    if (!deploymentJsonString) {
      console.warn(
        `there is no deployment configured for enabled chain with id ${chainId}. set the environment variable \`VITE_CHAIN_${chainId}_DEPLOYMENT\` to the JSON-encoded string of the deployment. see https://github.com/blokk-studio/HLiquity/blob/main/packages/lib-ethers/deployments/default/hedera.json for an example deployment configuration.`
      );
      continue;
    }

    try {
      const deploymentDefinition: DeploymentDefinition = JSON.parse(deploymentJsonString);
      const deployment = getDeployment(deploymentDefinition);
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

export const deployments = parseDeploymentsFromEnv(import.meta.env);
