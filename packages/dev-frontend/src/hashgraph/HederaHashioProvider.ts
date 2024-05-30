import { Provider } from "@wagmi/core";
import { providers } from "ethers";
import { testnet, previewnet, mainnet } from "../configuration/chains";
import { ChainProviderFn } from "wagmi";
import { Chain } from "wagmi/chains";

export class HederaProvider extends providers.JsonRpcProvider implements Provider {
  public chains = [testnet, previewnet, mainnet];

  async detectNetwork(): Promise<providers.Network> {
    return this.network;
  }
}

export const getHederaHashioChainProviderFunction =
  (): ChainProviderFn<Chain, HederaProvider> => chain => {
    const hederaChains = [testnet, previewnet, mainnet];
    const hederaChain = hederaChains.find(hederaChain => hederaChain.id === chain.id);
    // this provider only supports hedera chains; return null if a non-hedera chain was given
    if (!hederaChain) {
      return null;
    }

    const url =
      hederaChain.rpcUrls.default.http.find(anything => !!anything) ??
      hederaChain.rpcUrls.public.http.find(anything => !!anything);
    if (!url) {
      const message = `i cannot give you a websocket provider without a websocket url`;
      console.error(message, "received:", { rpcUrls: hederaChain.rpcUrls });
      throw new Error(`${message}. received: ${JSON.stringify({ rpcUrls: hederaChain.rpcUrls })}`);
    }

    const network = {
      chainId: hederaChain.id,
      name: hederaChain.network
    };

    const provider = () => {
      const provider = new HederaProvider(
        { url, throttleLimit: 100, throttleSlotInterval: 60 * 60 * 1000 },
        network
      );

      return provider;
    };

    return {
      chain,
      provider
    };
  };
