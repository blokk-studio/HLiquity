import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Hbar,
} from '@hashgraph/sdk'
import BigNumber from 'bignumber.js'
import { Address } from './address'

type FunctionNameFromAbi<Abi extends unknown[]> = Extract<
  {
    [Index in keyof Abi]: Abi[Index]
  }[keyof Abi],
  {
    type: 'function'
    stateMutability: 'payable' | 'nonpayable'
    name: string
  }
>['name']

export type FunctionInputsFromAbi<
  Abi extends unknown[],
  FunctionName extends string,
  FunctionAbi extends {
    inputs: { type: string; name: string }[]
    type: 'function'
    name: string
  } = Extract<
    {
      [Index in keyof Abi]: Abi[Index]
    }[keyof Abi],
    {
      type: 'function'
      stateMutability: 'payable' | 'nonpayable'
      name: FunctionName
      inputs: { type: string; name: string }[]
    }
  >,
> = FunctionAbi['inputs']

type NextIndexMap = {
  0: 1
  1: 2
  2: 3
  3: 4
  4: 5
  5: 6
  6: 7
  7: 8
  8: 9
  9: 10
}
type NextIndex<Index extends keyof NextIndexMap> = NextIndexMap[Index]

interface CompleteTypedContractFunctionParameters<FunctionInputs extends unknown[]>
  extends ContractFunctionParameters {
  '~complete': FunctionInputs
}

type TypedContractParameters<
  FunctionInputs extends { type: string; name: string }[],
  Index extends number = 0,
> = Index extends keyof NextIndexMap
  ? FunctionInputs[Index]['type'] extends 'uint256'
    ? {
        addUint256: (
          uint256: BigNumber,
        ) => TypedContractParameters<FunctionInputs, NextIndex<Index>>
      } & { [key in `~ ${FunctionInputs[Index]['name']}`]: never }
    : FunctionInputs[Index]['type'] extends 'address'
      ? {
          addAddress: (
            address: Address,
          ) => TypedContractParameters<FunctionInputs, NextIndex<Index>>
        } & { [key in `~ ${FunctionInputs[Index]['name']}`]: never }
      : FunctionInputs[Index]['type'] extends 'address[]'
        ? {
            addAddressArray: (
              addresses: Address[],
            ) => TypedContractParameters<FunctionInputs, NextIndex<Index>>
          } & { [key in `~ ${FunctionInputs[Index]['name']}`]: never }
        : FunctionInputs[Index]['type'] extends 'bool'
          ? {
              addBool: (bool: boolean) => TypedContractParameters<FunctionInputs, NextIndex<Index>>
            } & { [key in `~ ${FunctionInputs[Index]['name']}`]: never }
          : keyof FunctionInputs extends Index
            ? // unhandled parameter type
              {
                [key in `~ unhandled function type ${FunctionInputs[Index]['type']}. extend the TypedContractParameters type to handle it.`]: never
              }
            : // we've moved past the last function parameter
              // at this point all parameters have been set and we can safely return parameters
              CompleteTypedContractFunctionParameters<FunctionInputs>
  : // the function has more inputs than we can handle, this must never happen. we need to extend the map.
    never

export const TypedContractFunctionParameters = <
  Abi extends unknown[] = [],
  FunctionName extends string = string,
>() => {
  return new ContractFunctionParameters() as unknown as TypedContractParameters<
    FunctionInputsFromAbi<Abi, FunctionName>
  >
}

export interface TypedContractId<Abi extends unknown[]> extends ContractId {
  '~contractAbi': Abi
}

export const getTypedContractId = <Abi extends unknown[]>(
  shard: number,
  realm: number,
  evmAddress: `0x${string}`,
) => {
  return ContractId.fromEvmAddress(shard, realm, evmAddress) as TypedContractId<Abi>
}

export const TypedContractExecuteTransaction = <Abi extends unknown[]>(
  options: {
    [FunctionName in FunctionNameFromAbi<Abi>]: FunctionInputsFromAbi<Abi, FunctionName> extends []
      ? {
          contractId: TypedContractId<Abi>
          functionName: FunctionName
          gas: number
          hbar?: Hbar
        }
      : {
          contractId: TypedContractId<Abi>
          functionName: FunctionName
          functionParameters: CompleteTypedContractFunctionParameters<
            FunctionInputsFromAbi<Abi, FunctionName>
          >
          gas: number
          hbar?: Hbar
        }
  }[FunctionNameFromAbi<Abi>],
) => {
  const contractExecuteTransaction = new ContractExecuteTransaction({
    contractId: options.contractId,
    amount: options.hbar ?? Hbar.fromTinybars(0),
    gas: options.gas,
  })
  const functionParameters =
    'functionParameters' in options
      ? (options.functionParameters as unknown as ContractFunctionParameters)
      : undefined
  contractExecuteTransaction.setFunction(options.functionName, functionParameters)

  return contractExecuteTransaction
}
