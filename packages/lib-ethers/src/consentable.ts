import { Signer as EthersSigner, Contract, BigNumber, Signer } from "ethers";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { Address } from "@liquity/lib-base";

export const associateWithToken = async (options: {
  signer: EthersSigner;
  tokenAddress: Address;
}) => {
  const abi = [`function associate()`];
  const gasLimit = 1000000;

  try {
    const associationContract = new Contract(options.tokenAddress, abi, options.signer);
    const associationTransaction: TransactionResponse = await associationContract.associate({
      gasLimit: gasLimit
    });
    const associationReceipt = await associationTransaction.wait();
    return associationReceipt;
  } catch (error: unknown) {
    const errorMessage = `couldn't associate with token ${JSON.stringify(options.tokenAddress)}: ${
      (error as Error).message
    }`;
    console.error(errorMessage, error);
    throw new Error(errorMessage);
  }
};

export const dissociateFromToken = async (options: {
  signer: EthersSigner;
  tokenAddress: Address;
}) => {
  const abi = [`function dissociate()`];
  const gasLimit = 1000000;

  try {
    const dissociationContract = new Contract(options.tokenAddress, abi, options.signer);
    const dissociationTransaction: TransactionResponse = await dissociationContract.dissociate({
      gasLimit: gasLimit
    });
    const dissociationReceipt = await dissociationTransaction.wait();
    return dissociationReceipt;
  } catch (error: unknown) {
    const errorMessage = `couldn't dissociate from token ${JSON.stringify(options.tokenAddress)}: ${
      (error as Error).message
    }`;
    console.error(errorMessage, error);
    throw new Error(errorMessage);
  }
};

export const approveSpender = async (options: {
  contractAddress: Address;
  tokenAddress: Address;
  amount: BigNumber;
  signer: Signer;
}) => {
  const abi = [`function approve(address spender, uint256 amount) returns (bool)`];
  const gasLimit = 1000000;
  const contract = new Contract(options.tokenAddress, abi, options.signer);
  const approvalTransaction: TransactionResponse = await contract.approve(
    options.contractAddress,
    options.amount,
    { gasLimit }
  );

  const approvalTransactionReceipt = await approvalTransaction.wait();
  if (approvalTransactionReceipt.status !== 1) {
    const errorMessage = `unable to approve contract ${
      options.contractAddress
    } to spend ${options.amount.toString()} ${options.tokenAddress}`;
    console.error(errorMessage, {
      transactionReceipt: approvalTransactionReceipt,
      approvalTransaction
    });
    throw new Error(errorMessage);
  }

  return approvalTransactionReceipt;
};
