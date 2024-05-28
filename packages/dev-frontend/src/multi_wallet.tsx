import {
  useAccount,
  useChainId,
  useDisconnect,
  useProvider,
  useSigner,
  useSwitchNetwork
} from "wagmi";
import {
  useHashConnect,
  useHashConnectConnectionState,
  useOptionalHashConnectSessionData
} from "./components/HashConnectProvider";
import { shortenAddress } from "./utils/shortenAddress";
import { createContext, useContext } from "react";
import { HederaChain, getChainFromId } from "./configuration/chains";
import { useSelectedChain } from "./components/chain_context";

interface MultiWalletContext {
  hasWagmi: boolean;
  hasHashConnect: boolean;
  hasConnection: boolean;
  addressDisplayText: string | undefined;
  chain: HederaChain | null;
  disconnect: () => Promise<void>;
}

const multiWalletContext = createContext<MultiWalletContext>({
  hasConnection: false,
  hasHashConnect: false,
  hasWagmi: false,
  addressDisplayText: undefined,
  chain: null,
  disconnect: async () => undefined
});

export const MultiWalletProvider: React.FC = ({ children }) => {
  // hashpack
  const hashConnect = useHashConnect();
  const hashConnectSessionData = useOptionalHashConnectSessionData();
  const hashConnectConnectionState = useHashConnectConnectionState();
  const hashConnectChain = useSelectedChain();
  // wagmi
  const wagmiAccount = useAccount();
  const wagmiProvider = useProvider();
  const wagmiSigner = useSigner();
  const wagmiDisconnect = useDisconnect();
  const wagmiChainId = useChainId();
  const addressDisplayText =
    hashConnectSessionData?.userAccountId.toString() ??
    (wagmiAccount.address ? shortenAddress(wagmiAccount.address) : undefined);

  const hasHashConnect = hashConnectConnectionState === "Paired";
  // recalculate the wagmi connection status when the user changes the network through metamask
  useSwitchNetwork();
  const hasWagmi = !!wagmiAccount.address && wagmiProvider && !!wagmiSigner.data && !!wagmiChainId;

  const disconnect = async (): Promise<void> => {
    if (hasHashConnect) {
      await hashConnect.disconnect();

      window.location.reload();
      return;
    }

    if (hasWagmi) {
      await wagmiDisconnect.disconnectAsync();

      window.location.reload();
      return;
    }

    console.warn(
      "there is no session from any wallet to disconnect from. you can safely ignore this warning, but you shouldn't be disconnecting when there is no active session."
    );
  };

  const hasConnection = hasHashConnect || hasWagmi;

  let chain = null;
  if (hasWagmi) {
    chain = getChainFromId(wagmiChainId);
  }
  if (hasHashConnect) {
    chain = hashConnectChain;
  }

  const value = {
    hasWagmi,
    hasHashConnect,
    hasConnection,
    addressDisplayText,
    chain,
    disconnect
  };

  return <multiWalletContext.Provider value={value}>{children}</multiWalletContext.Provider>;
};

export const useMultiWallet = () => {
  return useContext(multiWalletContext);
};

export const MultiWalletConsumer = multiWalletContext.Consumer;
