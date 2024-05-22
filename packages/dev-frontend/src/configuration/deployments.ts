import { useHederaChain } from "../hedera/wagmi-chains";
import { enabledChainIds } from "./enabled_chains";

export type Address = `0x${string}`;

export type DeploymentAddressesKey =
  | "activePool"
  | "borrowerOperations"
  | "troveManager"
  | "hchfToken"
  | "collSurplusPool"
  | "communityIssuance"
  | "defaultPool"
  | "hlqtToken"
  | "hintHelpers"
  | "lockupContractFactory"
  | "hlqtStaking"
  | "multiTroveGetter"
  | "priceFeed"
  | "sortedTroves"
  | "stabilityPool"
  | "gasPool"
  | "saucerSwapPool";

export interface Deployment {
  readonly chainId: number;
  readonly addresses: Record<DeploymentAddressesKey, Address>;
  readonly version: string;
  readonly deploymentDate: number;
  readonly bootstrapPeriod: number;
  readonly totalStabilityPoolHLQTReward: string;
  readonly liquidityMiningHLQTRewardRate: string;
  readonly _priceFeedIsTestnet: boolean;
  readonly _uniTokenIsMock: boolean;
  readonly _isDev: boolean;
  readonly hchfTokenAddress: Address;
  readonly hlqtTokenAddress: Address;
  readonly frontendTag: Address;
}

const parseDeploymentsFromEnv = (
  enabledChainIds: number[],
  env: Record<string, string>
): Deployment[] => {
  // parse deployments
  const deployments: Deployment[] = [];
  for (const chainId of enabledChainIds) {
    const deploymentJsonString: string | undefined = env[`VITE_CHAIN_${chainId}_DEPLOYMENT`];

    if (!deploymentJsonString) {
      console.warn(
        `there is no deployment configured for enabled chain with id ${chainId}. set the environment variable \`VITE_CHAIN_${chainId}_DEPLOYMENT\` to the JSON-encoded string of the deployment. see https://github.com/blokk-studio/HLiquity/blob/main/packages/lib-ethers/deployments/default/hedera.json for an example deployment configuration.`
      );
      continue;
    }

    try {
      const deployment: Deployment = JSON.parse(deploymentJsonString);
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
  const chain = useHederaChain();

  if (!chain) {
    const errorMessage = `i need a chain to get a deployment. useHederaChain() returned ${JSON.stringify(
      chain
    )}`;
    console.error(errorMessage, { deployments });

    return null;
  }

  const chainId = chain.id;
  const deployment = deployments.find(deployment => deployment.chainId === chainId);

  if (!deployment) {
    const errorMessage = `there is no deployment for chain with id ${JSON.stringify(chainId)}`;
    console.error(errorMessage, { deployments });

    return null;
  }

  return deployment;
};
