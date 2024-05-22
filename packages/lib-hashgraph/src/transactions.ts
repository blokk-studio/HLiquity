import { AccountId, Status, Transaction, TransactionReceipt } from '@hashgraph/sdk'
import {
  LiquityReceipt,
  MinedReceipt,
  PopulatedLiquityTransaction,
  SentLiquityTransaction,
} from '@liquity/lib-base'
import { HashConnect } from 'hashconnect'

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

/**
 * builds the populated -> sent -> receipt pyramid/lasagna
 *
 * TODO: sending and getting the receipt should not be the responsibility of population. WHEEEEN the code hits your eye like a big lasagna pie it's-a odio.
 */
export const getPopulatedLiquityTransaction = <
  Details,
  RawPopulatedTransaction extends Transaction = Transaction,
>(options: {
  gasLimit: number
  rawPopulatedTransaction: RawPopulatedTransaction
  hashConnect: Pick<HashConnect, 'sendTransaction'>
  accountId: AccountId
  getDetails:
    | ((options: GetDetailsOptions<RawPopulatedTransaction>) => Promise<Details>)
    | ((options: GetDetailsOptions<RawPopulatedTransaction>) => Details)
}) => {
  const send = async (): Promise<SentHashgraphLiquityTransaction<Details>> => {
    const rawReceipt = await options.hashConnect.sendTransaction(
      options.accountId,
      options.rawPopulatedTransaction,
    )

    const waitForReceipt = async (): Promise<MinedReceipt<TransactionReceipt, Details>> => {
      // wait for the receipt before querying
      const details = await options.getDetails({
        rawPopulatedTransaction: options.rawPopulatedTransaction,
        rawReceipt,
      })

      const status = getLiquityReceiptStatus(rawReceipt.status)

      if (status === 'pending') {
        // this should never actually happen
        throw new Error(
          'TODO: figure out how to wait for the transaction to not be pending anymore.',
        )
      }

      return {
        status,
        rawReceipt,
        details,
      }
    }

    return {
      rawSentTransaction: rawReceipt,
      waitForReceipt,
      getReceipt: waitForReceipt,
    }
  }

  const populatedTransaction: PopulatedHashgraphLiquityTransaction<
    Details,
    RawPopulatedTransaction
  > = {
    rawPopulatedTransaction: options.rawPopulatedTransaction,
    send,
    gasLimit: options.gasLimit,
    gasHeadroom: 0,
  }

  return populatedTransaction
}
