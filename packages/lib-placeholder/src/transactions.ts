import { Transaction, TransactionReceipt } from '@hashgraph/sdk'
import {
  LiquityReceipt,
  PopulatedLiquityTransaction,
  SentLiquityTransaction,
} from '@liquity/lib-base'

export interface GetDetailsOptions<TransactionInstance extends Transaction> {
  rawPopulatedTransaction: TransactionInstance
  rawReceipt: TransactionReceipt
}

export type PlaceholderLiquityReceipt<Details> = LiquityReceipt<TransactionReceipt, Details>
export type SentPlaceholderLiquityTransaction<Details> = SentLiquityTransaction<
  TransactionReceipt,
  PlaceholderLiquityReceipt<Details>
>
export type PopulatedPlaceholderLiquityTransaction<
  Details,
  RawPopulatedTransaction extends Transaction = Transaction,
> = PopulatedLiquityTransaction<
  RawPopulatedTransaction,
  SentLiquityTransaction<TransactionReceipt, PlaceholderLiquityReceipt<Details>>
>
