import { Status } from '@hashgraph/sdk'

export const getLiquityReceiptStatus = (
  hashgraphStatus: Status,
): 'pending' | 'succeeded' | 'failed' => {
  switch (hashgraphStatus) {
    case Status.Success:
      return 'succeeded'

    case Status.FailBalance:
    case Status.FailFee:
    case Status.FailInvalid:
    case Status.AccountUpdateFailed:
    case Status.AuthorizationFailed:
    case Status.SerializationFailed:
    case Status.ContractUpdateFailed:
      return 'failed'

    default:
      return 'pending'
  }
}
