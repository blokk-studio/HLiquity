import { AccountId, ContractId } from '@hashgraph/sdk'
import { ContractCallQueryGetter, getContractCallQueryFactory } from '../contracts'

export interface ActivePool {
  getETH: ContractCallQueryGetter
  getHCHFDebt: ContractCallQueryGetter
}

interface ActivePoolOptions {
  contractId: ContractId
  senderAccountId: AccountId
}

export const getActivePool = (options: ActivePoolOptions): ActivePool => {
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

  const activePool = {
    getETH,
    getHCHFDebt,
  }

  return activePool
}
