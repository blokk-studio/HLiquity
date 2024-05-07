import {
  AccountId,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
} from '@hashgraph/sdk'

/**
 * constructs a ContractCallQuery through a functional interface with the minimally required parameters
 *
 * likely uses closure to remember the contract.
 */
export interface ContractCallQueryGetter<Parameters extends any[] = []> {
  (...parameters: Parameters): ContractCallQuery
}

interface ContractCallFactoryOptions {
  contractId: ContractId
  function: string
  senderAccountId: AccountId
}

interface ContractCallFactoryOptionsWithParameterFactory<Parameters extends any[]>
  extends ContractCallFactoryOptions {
  parameterFactory: (...parameters: Parameters) => ContractFunctionParameters
}

/**
 * returns a function that can be used to call the method of the contract that is provided
 */
export const getContractCallQueryFactory = <Parameters extends any[] = []>(
  options: Parameters extends []
    ? ContractCallFactoryOptions
    : ContractCallFactoryOptionsWithParameterFactory<Parameters>,
) => {
  const getContractCallQuery: ContractCallQueryGetter<Parameters> = (...parameters) => {
    const contractFunctionParameters =
      'parameterFactory' in options ? options.parameterFactory(...parameters) : undefined
    const contractCallQuery = new ContractCallQuery()
      .setContractId(options.contractId)
      .setGas(10000)
      .setFunction(options.function, contractFunctionParameters)
      .setSenderAccountId(options.senderAccountId)

    return contractCallQuery
  }

  return getContractCallQuery
}
