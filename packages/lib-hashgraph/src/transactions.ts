import { Status, Transaction, TransactionReceipt, TransactionResponse } from '@hashgraph/sdk'
import {
  LiquityReceipt,
  MinedReceipt,
  PopulatedLiquityTransaction,
  SentLiquityTransaction,
} from '@liquity/lib-base'
import { HashConnectSigner } from 'hashconnect/dist/signer'

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
  rawSentTransaction: TransactionResponse
  rawReceipt: TransactionReceipt
  signer: HashConnectSigner
}

/**
 * builds the populated -> sent -> receipt pyramid/lasagna
 *
 * TODO: sending and getting the receipt should not be the responsibility of population. WHEEEEN the code hits your eye like a big lasagna pie it's-a odio.
 */
export const getPopulatedLiquityTransaction = <
  Details,
  TransactionInstance extends Transaction = Transaction,
>(options: {
  gasLimit: number
  rawPopulatedTransaction: TransactionInstance
  signer: HashConnectSigner
  getDetails:
    | ((options: GetDetailsOptions<TransactionInstance>) => Promise<Details>)
    | ((options: GetDetailsOptions<TransactionInstance>) => Details)
}) => {
  const send = async (): Promise<
    SentLiquityTransaction<TransactionResponse, LiquityReceipt<TransactionReceipt, Details>>
  > => {
    const rawSentTransaction = await options.rawPopulatedTransaction.executeWithSigner(
      options.signer,
    )

    const waitForReceipt = async (): Promise<MinedReceipt<TransactionReceipt, Details>> => {
      // wait for the receipt before querying
      const rawReceipt = await rawSentTransaction.getReceiptWithSigner(options.signer)
      const details = await options.getDetails({
        rawPopulatedTransaction: options.rawPopulatedTransaction,
        signer: options.signer,
        rawSentTransaction,
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
      rawSentTransaction,
      waitForReceipt,
      getReceipt: waitForReceipt,
    }
  }

  const populatedTransaction: PopulatedLiquityTransaction<
    TransactionInstance,
    SentLiquityTransaction<TransactionResponse, LiquityReceipt<TransactionReceipt, Details>>
  > = {
    rawPopulatedTransaction: options.rawPopulatedTransaction,
    send,
    gasLimit: options.gasLimit,
    gasHeadroom: 0,
  }

  return populatedTransaction
}
