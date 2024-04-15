import { Chain } from "@wagmi/core";
import { useNetwork } from "wagmi";
import { enabledChainIds } from "../configuration/enabled_chains";
import { deployments } from "../configuration/deployments";

interface HederaChain extends Chain {
  apiBaseUrl: string;
  color: `#${string}`;
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
      http: [
        "https://testnet.hedera.validationcloud.io/v1/6nS9fmvxizvD-mtFgelriSrv1CrXUzqDvUa76phY0zs"
      ],
      webSocket: [
        "wss://testnet.hedera.validationcloud.io/v1/wss/6nS9fmvxizvD-mtFgelriSrv1CrXUzqDvUa76phY0zs"
      ]
    },
    public: {
      http: [
        "https://testnet.hedera.validationcloud.io/v1/6nS9fmvxizvD-mtFgelriSrv1CrXUzqDvUa76phY0zs"
      ],
      webSocket: [
        "wss://testnet.hedera.validationcloud.io/v1/wss/6nS9fmvxizvD-mtFgelriSrv1CrXUzqDvUa76phY0zs"
      ]
    }
  },
  testnet: true,
  apiBaseUrl:
    "https://testnet.hedera.validationcloud.io/v1/6nS9fmvxizvD-mtFgelriSrv1CrXUzqDvUa76phY0zs/api/v1",
  color: "#e302ab"
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
      http: ["https://297.rpc.thirdweb.com/"]
    },
    public: {
      http: ["https://297.rpc.thirdweb.com/", "https://previewnet.hashio.io/api"]
    }
  },
  testnet: true,
  apiBaseUrl: "https://previewnet.mirrornode.hedera.com/api/v1",
  color: "#e47a2e"
};

export const mainnet: HederaChain = {
  id: 0x127,
  name: "Hedera Mainnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 18
  },
  network: "hedera",
  rpcUrls: {
    default: {
      http: [
        "https://mainnet.hedera.validationcloud.io/v1/lAUDY3DhBzENfGvggNqdDr-tm-CE8r-fSdV_kMag7z4"
      ],
      webSocket: [
        "wss://mainnet.hedera.validationcloud.io/v1/wss/lAUDY3DhBzENfGvggNqdDr-tm-CE8r-fSdV_kMag7z4"
      ]
    },
    public: {
      http: [
        "https://mainnet.hedera.validationcloud.io/v1/lAUDY3DhBzENfGvggNqdDr-tm-CE8r-fSdV_kMag7z4"
      ],
      webSocket: [
        "wss://mainnet.hedera.validationcloud.io/v1/wss/lAUDY3DhBzENfGvggNqdDr-tm-CE8r-fSdV_kMag7z4"
      ]
    }
  },
  testnet: true,
  apiBaseUrl:
    "https://mainnet.hedera.validationcloud.io/v1/lAUDY3DhBzENfGvggNqdDr-tm-CE8r-fSdV_kMag7z4/api/v1",
  color: "#1896b2"
};

const chains = [mainnet, previewnet, testnet];

const enabledChainIdsSet = new Set(enabledChainIds);
const enabledChains = chains.filter(chain => enabledChainIdsSet.has(chain.id));
const setOfChainIdsWithDeployment = new Set(deployments.map(deployment => deployment.chainId));
const chainsWithDeployment = enabledChains.filter(chain =>
  setOfChainIdsWithDeployment.has(chain.id)
);

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

export const useHederaChains = () => {
  return chainsWithDeployment;
};

export const useHederaChain = () => {
  const network = useNetwork();

  const chainId = network.chain?.id;
  if (chainId === undefined) {
    return null;
  }

  const hederaChain = chains.find(chain => chain.id === chainId);
  if (!hederaChain) {
    return null;
  }

  return hederaChain;
};
