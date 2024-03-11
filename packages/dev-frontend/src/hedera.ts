import { Chain } from "@wagmi/core";

// TODO: move these chains to a file that mentions hashio & wagmi in its name. these chains are specifically in wagmi format with hashio rpc urls!

export const testnet: Chain = {
  id: 0x128,
  name: "Hedera Testnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18
  },
  network: "hedera_testnet",
  rpcUrls: {
    default: {
      http: ["https://testnet.hashio.io/api"]
    },
    public: {
      http: ["https://testnet.hashio.io/api"]
    }
  },
  testnet: true
};

export const previewnet: Chain = {
  id: 0x129,
  name: "Hedera Previewnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18
  },
  network: "hedera_previewnet",
  rpcUrls: {
    default: {
      http: ["https://previewnet.hashio.io/api"]
    },
    public: {
      http: ["https://previewnet.hashio.io/api"]
    }
  },
  testnet: true
};

export const mainnet: Chain = {
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
  testnet: true
};
