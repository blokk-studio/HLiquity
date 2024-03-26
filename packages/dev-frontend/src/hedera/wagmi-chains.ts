import { Chain } from "@wagmi/core";
import { useNetwork } from "wagmi";

interface HederaChain extends Chain {
  apiBaseUrl: string;
}

export const testnet: HederaChain = {
  id: 0x128,
  name: "Hedera Testnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18
  },
  network: "hederaTestnet",
  rpcUrls: {
    default: {
      http: ["https://testnet.hashio.io/api"]
    },
    public: {
      http: ["https://testnet.hashio.io/api"]
    }
  },
  testnet: true,
  apiBaseUrl: "https://testnet.mirrornode.hedera.com/api/v1"
};

export const previewnet: HederaChain = {
  id: 0x129,
  name: "Hedera Previewnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18
  },
  network: "hederaPreviewnet",
  rpcUrls: {
    default: {
      http: ["https://previewnet.hashio.io/api"]
    },
    public: {
      http: ["https://previewnet.hashio.io/api"]
    }
  },
  testnet: true,
  apiBaseUrl: "https://previewnet.mirrornode.hedera.com/api/v1"
};

export const mainnet: HederaChain = {
  id: 0x127,
  name: "Hedera",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18
  },
  network: "hedera",
  rpcUrls: {
    default: {
      http: ["https://mainnet.hashio.io/api"]
    },
    public: {
      http: ["https://mainnet.hashio.io/api"]
    }
  },
  testnet: true,
  apiBaseUrl: "https://mainnet.mirrornode.hedera.com/api/v1"
};

export const useHederaChain = () => {
  const network = useNetwork();

  const chainId = network.chain?.id;
  if (chainId === undefined) {
    return null;
  }

  const hederaChain = [mainnet, previewnet, testnet].find(chain => chain.id === chainId);
  if (!hederaChain) {
    return null;
  }

  return hederaChain;
};