import { AccountId, ContractId } from '@hashgraph/sdk'
import { ContractCallQueryGetter, getContractCallQueryFactory } from '../contracts'

export interface PriceFeed {
  fetchPrice: ContractCallQueryGetter
}

interface PriceFeedOptions {
  contractId: ContractId
  senderAccountId: AccountId
}

export const getPriceFeed = (options: PriceFeedOptions): PriceFeed => {
  const { contractId, senderAccountId } = options

  const fetchPrice = getContractCallQueryFactory({
    contractId,
    senderAccountId,
    function: 'fetchPrice',
  })

  const priceFeed = {
    fetchPrice,
  }

  return priceFeed
}
