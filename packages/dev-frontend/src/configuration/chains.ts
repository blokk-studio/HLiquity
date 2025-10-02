import { Chain } from "@wagmi/core";
import { LedgerId } from "@hashgraph/sdk";

const parseEnabledChainIdsFromEnv = (env: Record<string, string>) => {
  const enabledChainsString: string = env.VITE_ENABLED_CHAINS;
  if (!enabledChainsString) {
    const errorMessage = `there is no configuration for enabled chains. set the environment variable \`VITE_ENABLED_CHAINS\` to a string of comma-separated numbers (f.e. \`VITE_ENABLED_CHAINS=296,297,298\`).`;
    console.error(errorMessage, { env });

    return [];
  }

  const enabledChainIdStrings = enabledChainsString.split(",").filter(Boolean);
  const enabledChainIds = enabledChainIdStrings
    .map(idString => parseInt(idString, 10))
    .filter(number => !isNaN(number));

  return enabledChainIds;
};

export const enabledChainIds = parseEnabledChainIdsFromEnv(import.meta.env);

/** returns the ids for all currently enabled chains configured in the environment */
export const useEnabledChainIds = () => {
  return enabledChainIds;
};

export interface HederaChain extends Chain {
  apiBaseUrl: `https://${string}`;
  hashscanBaseUrl: `https://${string}`;
  color: `#${string}`;
  ledgerId: LedgerId;
}

export const testnet: HederaChain = {
  id: 0x128,
  ledgerId: LedgerId.TESTNET,
  name: "Hedera Testnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18
  },
  network: "hederaTestnet",
  rpcUrls: {
    default: {
      http: ["https://growth.arkhia.io/hedera/testnet/json-rpc/v1/7542b249WGllfVd4Gf7l8bf18V1G8fWW"],
      webSocket: [
        "wss://growth.arkhia.io/hedera/testnet/watchtower/v1/7542b249WGllfVd4Gf7l8bf18V1G8fWW"
      ]
    },
    public: {
      http: ["https://growth.arkhia.io/hedera/testnet/json-rpc/v1/7542b249WGllfVd4Gf7l8bf18V1G8fWW"],
      webSocket: [
        "wss://growth.arkhia.io/hedera/testnet/watchtower/v1/7542b249WGllfVd4Gf7l8bf18V1G8fWW"
      ]
    }
  },
  testnet: true,
  apiBaseUrl: "https://testnet.mirrornode.hedera.com/api/v1",
  hashscanBaseUrl: "https://hashscan.io/testnet",
  color: "#e302ab"
};

export const previewnet: HederaChain = {
  id: 0x129,
  ledgerId: LedgerId.PREVIEWNET,
  name: "Hedera Previewnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18
  },
  network: "hederaPreviewnet",
  rpcUrls: {
    default: {
      http: ["https://previewnet.hashio.io/api"],
      webSocket: ["wss://previewnet.hashio.io/ws"]
    },
    public: {
      http: ["https://previewnet.hashio.io/api"],
      webSocket: ["wss://previewnet.hashio.io/ws"]
    }
  },
  testnet: true,
  apiBaseUrl: "https://previewnet.mirrornode.hedera.com/api/v1",
  hashscanBaseUrl: "https://hashscan.io/previewnet",
  color: "#e47a2e"
};

export const mainnet: HederaChain = {
  id: 0x127,
  ledgerId: LedgerId.MAINNET,
  name: "Hedera Mainnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18
  },
  network: "hedera",
  rpcUrls: {
    default: {
      http: ["https://growth.arkhia.io/hedera/mainnet/json-rpc/v1/7542b249WGllfVd4Gf7l8bf18V1G8fWW"],
      webSocket: [
        "wss://growth.arkhia.io/hedera/mainnet/watchtower/v1/7542b249WGllfVd4Gf7l8bf18V1G8fWW"
      ]
    },
    public: {
      http: ["https://growth.arkhia.io/hedera/mainnet/json-rpc/v1/7542b249WGllfVd4Gf7l8bf18V1G8fWW"],
      webSocket: [
        "wss://growth.arkhia.io/hedera/mainnet/watchtower/v1/7542b249WGllfVd4Gf7l8bf18V1G8fWW"
      ]
    }
  },
  testnet: true,
  apiBaseUrl: "https://mainnet-public.mirrornode.hedera.com/api/v1",
  hashscanBaseUrl: "https://hashscan.io/mainnet",
  color: "#1896b2"
};

export const chains = [mainnet, previewnet, testnet];

const enabledChainIdsSet = new Set(enabledChainIds);
export const enabledChains = chains.filter(chain => enabledChainIdsSet.has(chain.id));

export const getChainFromId = (chainId: number) => {
  const chain = chains.find(chain => chain.id === chainId);
  if (!chain) {
    const errorMessage = `chain id ${chainId} does not belong to a hedera chain. pass one of ${chains
      .map(chain => `${chain.id} (${chain.name})`)
      .join(", ")}.`;
    console.error(errorMessage, "received:", { chainId });
    throw new Error(errorMessage);
  }

  return chain;
};

export const getChainFromLedgerId = (ledgerId: LedgerId) => {
  switch (ledgerId) {
    case LedgerId.TESTNET:
      return testnet;
    case LedgerId.PREVIEWNET:
      return previewnet;
  }

  return mainnet;
};
