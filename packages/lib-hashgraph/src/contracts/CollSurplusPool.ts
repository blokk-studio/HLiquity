import { AccountId, ContractFunctionParameters, ContractId } from '@hashgraph/sdk'
import { Address } from '../address'
import { ContractCallQueryGetter, getContractCallQueryFactory } from '../contracts'

export interface CollSurplusPool {
  getCollateral: ContractCallQueryGetter<[Address]>
}

interface CollSurplusPoolOptions {
  contractId: ContractId
  senderAccountId: AccountId
}

export const getCollSurplusPool = (options: CollSurplusPoolOptions): CollSurplusPool => {
  const { contractId, senderAccountId } = options

  const getCollateral = getContractCallQueryFactory<[Address]>({
    contractId,
    senderAccountId,
    function: 'getCollateral',
    parameterFactory: (address) => {
      const parameters = new ContractFunctionParameters().addAddress(address)

      return parameters
    },
  })

  const collSurplusPool = {
    getCollateral,
  }

  return collSurplusPool
}
