import { UserTroveStatus } from '@liquity/lib-base'

// TODO: move this to lib-base
export enum BackendTroveStatus {
  nonExistent,
  active,
  closedByOwner,
  closedByLiquidation,
  closedByRedemption,
}

export const userTroveStatusFrom = (backendStatus: BackendTroveStatus): UserTroveStatus => {
  switch (backendStatus) {
    case BackendTroveStatus.nonExistent:
      return 'nonExistent'
    case BackendTroveStatus.active:
      return 'open'
    case BackendTroveStatus.closedByOwner:
      return 'closedByOwner'
    case BackendTroveStatus.closedByLiquidation:
      return 'closedByLiquidation'
    case BackendTroveStatus.closedByRedemption:
      return 'closedByRedemption'
  }

  throw new Error(`invalid backendStatus ${backendStatus}`)
}
