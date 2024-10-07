import { Address } from "./Address";

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
  | "saucerSwapPool"
  | "pythCaller"
  | "supraCaller"
  | "uniToken";

export const getDeployment = (deploymentDefinition: DeploymentDefinition): Deployment => {
  const deploymentDate = new Date(deploymentDefinition.deploymentDate);

  return {
    ...deploymentDefinition,
    deploymentDate
  };
};

export interface Deployment {
  readonly chainId: number;
  readonly addresses: Record<DeploymentAddressesKey, Address>;
  readonly version: string;
  readonly deploymentDate: Date;
  readonly bootstrapPeriod: number;
  readonly totalStabilityPoolHLQTReward: string;
  readonly liquidityMiningHLQTRewardRate: string;
  readonly _priceFeedIsTestnet: boolean;
  readonly _uniTokenIsMock: boolean;
  readonly _isDev: boolean;
  readonly frontendTag: Address;
  /** @deprecated call contract methods instead */
  readonly hchfTokenAddress: Address;
  /** @deprecated call contract methods instead */
  readonly hlqtTokenAddress: Address;
}

export interface DeploymentDefinition {
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
