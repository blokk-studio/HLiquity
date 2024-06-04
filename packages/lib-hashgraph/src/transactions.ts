import { Status, Transaction, TransactionReceipt } from '@hashgraph/sdk'
import {
  LiquityReceipt,
  PopulatedLiquityTransaction,
  SentLiquityTransaction,
} from '@liquity/lib-base'

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

export interface GetDetailsOptions<TransactionInstance extends Transaction> {
  rawPopulatedTransaction: TransactionInstance
  rawReceipt: TransactionReceipt
}

export type HashgraphLiquityReceipt<Details> = LiquityReceipt<TransactionReceipt, Details>
export type SentHashgraphLiquityTransaction<Details> = SentLiquityTransaction<
  TransactionReceipt,
  HashgraphLiquityReceipt<Details>
>
export type PopulatedHashgraphLiquityTransaction<
  Details,
  RawPopulatedTransaction extends Transaction = Transaction,
> = PopulatedLiquityTransaction<
  RawPopulatedTransaction,
  SentLiquityTransaction<TransactionReceipt, HashgraphLiquityReceipt<Details>>
>
