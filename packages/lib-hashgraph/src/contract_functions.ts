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
  { type: 'function'; stateMutability: 'payable'; name: string }
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
      stateMutability: 'payable'
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

type TypedContractParameters<
  FunctionInputs extends { type: string; name: string }[],
  Index extends keyof FunctionInputs = 0,
> = Index extends keyof NextIndexMap
  ? NextIndex<Index> extends keyof NextIndexMap
    ? FunctionInputs[Index]['type'] extends 'uint256'
      ? {
          addUint256: (
            uint256: BigNumber,
          ) => TypedContractParameters<FunctionInputs, NextIndex<Index>>
        } & { [key in FunctionInputs[Index]['name']]: never }
      : FunctionInputs[Index]['type'] extends 'address'
        ? {
            addAddress: (
              address: Address,
            ) => TypedContractParameters<FunctionInputs, NextIndex<Index>>
          } & { [key in `~${FunctionInputs[Index]['name']}`]: never }
        : FunctionInputs[Index]['type'] extends 'bool'
          ? {
              addBool: (bool: boolean) => TypedContractParameters<FunctionInputs, NextIndex<Index>>
            } & { [key in FunctionInputs[Index]['name']]: never }
          : unknown
    : unknown
  : unknown

export const TypedContractFunctionParameters = <
  Abi extends unknown[] = [],
  FunctionName extends string = string,
>() => {
  return new ContractFunctionParameters() as unknown as TypedContractParameters<
    FunctionInputsFromAbi<Abi, FunctionName>
  >
}

export const TypedContractExecuteTransaction = <Abi extends unknown[]>(
  options: {
    [FunctionName in FunctionNameFromAbi<Abi>]: {
      contractId: ContractId
      functionName: FunctionName
      functionParameters: TypedContractParameters<FunctionInputsFromAbi<Abi, FunctionName>>
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
  contractExecuteTransaction.setFunction(
    'adjustTrove',
    options.functionParameters as unknown as ContractFunctionParameters,
  )
  return contractExecuteTransaction
}
