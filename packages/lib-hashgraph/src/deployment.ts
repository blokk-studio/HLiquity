import { Address } from './address'

export type DeploymentAddressesKey =
  | 'activePool'
  | 'borrowerOperations'
  | 'troveManager'
  | 'hchfToken'
  | 'collSurplusPool'
  | 'communityIssuance'
  | 'defaultPool'
  | 'hlqtToken'
  | 'hintHelpers'
  | 'lockupContractFactory'
  | 'hlqtStaking'
  | 'multiTroveGetter'
  | 'priceFeed'
  | 'sortedTroves'
  | 'stabilityPool'
  | 'gasPool'
  | 'unipool'
// | 'uniToken'

export interface Deployment {
  readonly chainId: number
  readonly addresses: Record<DeploymentAddressesKey, Address>
  readonly version: string
  readonly deploymentDate: number
  readonly bootstrapPeriod: number
  readonly totalStabilityPoolHLQTReward: string
  readonly liquidityMiningHLQTRewardRate: string
  readonly _priceFeedIsTestnet: boolean
  readonly _uniTokenIsMock: boolean
  readonly _isDev: boolean
  readonly hchfTokenAddress: Address
  readonly hlqtTokenAddress: Address
  readonly frontendTag: Address
}
