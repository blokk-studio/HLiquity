import { TransactableLiquity } from '@liquity/lib-base'

type TransactionStage =
  | 'transactionSent'
  | 'transactionReceiptReceived'
  | 'storeRefreshedAfterTransactionReceiptReceived'
type TransactionActionName = keyof TransactableLiquity
type TransactionActionEventName = `${TransactionActionName}/${TransactionStage}`

export interface LiquityEvents extends Record<TransactionActionEventName, unknown> {
  // this might not be necessary, but in case we want to act on any transaction
  // /**
  //  * an event fired when any transaction is sent
  //  *
  //  * contains the name of the action and the event details
  //  */
  // transactionSent: {
  //   [TransactionActionNameInstance in TransactionActionName]: {
  //     action: TransactionActionNameInstance
  //     detail: LiquityEvents[`${TransactionActionNameInstance}/transactionSent`]
  //   }
  // }[TransactionActionName]
  // /**
  //  * an event fired when the receipt for any transaction is received
  //  *
  //  * contains the name of the action and the event details
  //  */
  // transactionReceiptReceived: {
  //   [TransactionActionNameInstance in TransactionActionName]: {
  //     action: TransactionActionNameInstance
  //     detail: LiquityEvents[`${TransactionActionNameInstance}/transactionReceiptReceived`]
  //   }
  // }[TransactionActionName]
  // /**
  //  * an event fired when the store is refreshed after any transaction receipt was received
  //  *
  //  * contains the name of the action and the event details
  //  */
  // storeRefreshedAfterTransactionReceiptReceived: {
  //   [TransactionActionNameInstance in TransactionActionName]: {
  //     action: TransactionActionNameInstance
  //     detail: LiquityEvents[`${TransactionActionNameInstance}/storeRefreshedAfterTransactionReceiptReceived`]
  //   }
  // }[TransactionActionName]

  // TODO: extend and amend as events are implemented
  'depositCollateral/transactionSent': {
    populatedTransaction: unknown
  }
  'depositCollateral/transactionReceiptReceived': {
    populatedTransaction: unknown
    transactionReceipt: unknown
  }
  'depositCollateral/storeRefreshedAfterTransactionReceiptReceived': {
    populatedTransaction: unknown
    transactionReceipt: unknown
    newStoreState: unknown
  }
}
