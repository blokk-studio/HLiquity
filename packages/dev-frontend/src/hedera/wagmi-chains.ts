import { Chain } from "@wagmi/core";
import { useNetwork } from "wagmi";
import { AddressZero } from "@ethersproject/constants";
import { enabledChainIds } from "../configuration/enabled_chains";
import { deployments } from "../configuration/deployments";

interface HederaChain extends Chain {
  apiBaseUrl: string;
  color: `#${string}`;
  hchfTokenId: `0x${string}`;
  hlqtTokenId: `0x${string}`;
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
      http: ["https://296.rpc.thirdweb.com/"]
    },
    public: {
      http: ["https://296.rpc.thirdweb.com/", "https://testnet.hashio.io/api"]
    }
  },
  testnet: true,
  apiBaseUrl: "https://testnet.mirrornode.hedera.com/api/v1",
  hchfTokenId: "0x0000000000000000000000000000000000388c1c",
  hlqtTokenId: "0x0000000000000000000000000000000000388c1F"
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
  hchfTokenId: AddressZero,
  hlqtTokenId: AddressZero
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
      http: ["https://295.rpc.thirdweb.com/"]
    },
    public: {
      http: ["https://295.rpc.thirdweb.com/", "https://mainnet.hashio.io/api"]
    }
  },
  testnet: true,
  apiBaseUrl: "https://mainnet-public.mirrornode.hedera.com/api/v1",
  hchfTokenId: "0x0000000000000000000000000000000000500326",
  hlqtTokenId: "0x0000000000000000000000000000000000500334"
};

const enabledChainIdsSet = new Set(enabledChainIds);
const enabledChains = [mainnet, previewnet, testnet].filter(chain =>
  enabledChainIdsSet.has(chain.id)
);
const setOfChainIdsWithDeployment = new Set(deployments.map(deployment => deployment.chainId));
const chainsWithDeployment = enabledChains.filter(chain =>
  setOfChainIdsWithDeployment.has(chain.id)
);

export const useHederaChains = () => {
  return chainsWithDeployment;
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
