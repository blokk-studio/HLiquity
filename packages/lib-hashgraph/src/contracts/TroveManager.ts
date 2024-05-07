import { AccountId, ContractFunctionParameters, ContractId } from '@hashgraph/sdk'
import { Address } from '../address'
import { ContractCallQueryGetter, getContractCallQueryFactory } from '../contracts'

export interface TroveManager {
  lastFeeOperationTime: ContractCallQueryGetter
  baseRate: ContractCallQueryGetter
  L_ETH: ContractCallQueryGetter
  L_HCHFDebt: ContractCallQueryGetter
  Troves: ContractCallQueryGetter<[Address]>
  rewardSnapshots: ContractCallQueryGetter<[Address]>
}

interface TroveManagerOptions {
  contractId: ContractId
  senderAccountId: AccountId
}

export const getTroveManager = (options: TroveManagerOptions): TroveManager => {
  const { contractId, senderAccountId } = options

  const lastFeeOperationTime = getContractCallQueryFactory({
    contractId,
    senderAccountId,
    function: 'lastFeeOperationTime',
  })

  const baseRate = getContractCallQueryFactory({
    contractId,
    senderAccountId,
    function: 'baseRate',
  })

  const L_ETH = getContractCallQueryFactory({
    contractId,
    senderAccountId,
    function: 'L_ETH',
  })

  const L_HCHFDebt = getContractCallQueryFactory({
    contractId,
    senderAccountId,
    function: 'L_HCHFDebt',
  })

  const Troves = getContractCallQueryFactory<[Address]>({
    contractId,
    senderAccountId,
    function: 'Troves',
    parameterFactory: (address) => {
      const parameters = new ContractFunctionParameters().addAddress(address)

      return parameters
    },
  })

  const rewardSnapshots = getContractCallQueryFactory<[Address]>({
    contractId,
    senderAccountId,
    function: 'Troves',
    parameterFactory: (address) => {
      const parameters = new ContractFunctionParameters().addAddress(address)

      return parameters
    },
  })

  const troveManager = {
    lastFeeOperationTime,
    baseRate,
    L_ETH,
    L_HCHFDebt,
    Troves,
    rewardSnapshots,
  }

  return troveManager
}
