import { AccountId, ContractId } from '@hashgraph/sdk'
import { ContractCallQueryGetter, getContractCallQueryFactory } from '../contracts'

export interface DefaultPool {
  getETH: ContractCallQueryGetter
  getHCHFDebt: ContractCallQueryGetter
}

interface DefaultPoolOptions {
  contractId: ContractId
  senderAccountId: AccountId
}

export const getDefaultPool = (options: DefaultPoolOptions): DefaultPool => {
  const { contractId, senderAccountId } = options

  const getETH = getContractCallQueryFactory({
    contractId,
    senderAccountId,
    function: 'getETH',
  })

  const getHCHFDebt = getContractCallQueryFactory({
    contractId,
    senderAccountId,
    function: 'getHCHFDebt',
  })

  const defaultPool = {
    getETH,
    getHCHFDebt,
  }

  return defaultPool
}
