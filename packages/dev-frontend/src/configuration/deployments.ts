import { Deployment, DeploymentDefinition, getDeployment } from "@liquity/lib-base";

const parseDeploymentsFromEnv = (env: Record<string, string>): Deployment[] => {
  // parse deployments
  const deployments: Deployment[] = [];
  for (const chainId of [295, 296, 297]) {
    const deploymentJsonString: string | undefined = env[`VITE_CHAIN_${chainId}_DEPLOYMENT`];

    if (!deploymentJsonString) {
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
