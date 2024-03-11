import { Provider } from "@wagmi/core";
import { providers } from "ethers";
import { testnet, previewnet, mainnet } from "../hedera";
import { ChainProviderFn } from "wagmi";
import { Chain } from "wagmi/chains";
import {
  testnet as hederaTestnet,
  previewnet as hederaPreviewnet,
  mainnet as hederaMainnet
} from "../hedera";

export class HederaHashioProvider extends providers.BaseProvider implements Provider {
  public chains = [testnet, previewnet, mainnet];

  async detectNetwork(): Promise<providers.Network> {
    return this.network;
  }
}

export const getHederaHashioChainProviderFunction = (): ChainProviderFn<
  Chain,
  HederaHashioProvider
> => chain => {
  const hederaChains = [hederaTestnet, hederaPreviewnet, hederaMainnet];
  const hederaChain = hederaChains.find(hederaChain => hederaChain.id === chain.id);
  // this provider only supports hedera chains; return null if a non-hedera chain was given
  if (!hederaChain) {
    return null;
  }

  const network = {
    chainId: hederaChain.id,
    name: hederaChain.network
  };

  const provider = () => {
    const provider = new HederaHashioProvider(network);

    return provider;
  };

  return {
    chain,
    provider
  };
};
