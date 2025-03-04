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
import { createContext, useContext, useEffect, useState } from "react";
import { HederaChain, getChainFromId, mainnet } from "./configuration/chains";
import { useSelectedChain } from "./components/chain_context";
import {
  useHederaDappConnectorContext,
  useOptionalHederaDappConnectorSession
} from "./components/HederaDappConnectorProvider";
import { WalletConnector } from "./components/WalletConnector";

interface MultiWalletContext {
  hasWagmi: boolean;
  hasHashConnect: boolean;
  hasHederaDappConnector: boolean;
  hasConnection: boolean;
  addressDisplayText: string | undefined;
  chain: HederaChain;
  disconnect: () => Promise<void>;
  showConnectionDialog: () => void;
  hideConnectionDialog: () => void;
}

const multiWalletContext = createContext<MultiWalletContext>({
  hasConnection: false,
  hasHashConnect: false,
  hasHederaDappConnector: false,
  hasWagmi: false,
  addressDisplayText: undefined,
  chain: mainnet,
  disconnect: async () => undefined,
  showConnectionDialog: async () => undefined,
  hideConnectionDialog: async () => undefined
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
  // hedera dapp
  const hederaDappConnectorContext = useHederaDappConnectorContext();
  const hederaDappConnectorSession = useOptionalHederaDappConnectorSession();
  const hederaDappConnectorChain = useSelectedChain();

  const hasHashConnect = hashConnectConnectionState === "Paired";
  // recalculate the wagmi connection status when the user changes the network through metamask
  useSwitchNetwork();
  const hasWagmi = !!wagmiAccount.address && wagmiProvider && !!wagmiSigner.data && !!wagmiChainId;
  const hasHederaDappConnector = !!hederaDappConnectorSession?.userAccountId;

  const hasConnection = hasHashConnect || hasWagmi || hasHederaDappConnector;

  const [isDisplayingConnectionDialog, setIsDisplayingConnectionDialog] = useState(false);

  useEffect(() => {
    if (hasConnection) {
      setIsDisplayingConnectionDialog(false);
    }
  }, [hasConnection]);

  if (isDisplayingConnectionDialog) {
    return <WalletConnector />;
  }

  const disconnect = async (): Promise<void> => {
    if (hasHashConnect) {
      await hashConnect.disconnect();

      window.location.reload();
      return;
    }

    if (hasWagmi) {
      await wagmiDisconnect.disconnectAsync();

      return;
    }

    if (hasHederaDappConnector) {
      await hederaDappConnectorContext.disconnect();

      return;
    }

    console.warn(
      "there is no session from any wallet to disconnect from. you can safely ignore this warning, but you shouldn't be disconnecting when there is no active session."
    );
  };

  const addressDisplayText =
    hashConnectSessionData?.userAccountId.toString() ??
    (wagmiAccount.address ? shortenAddress(wagmiAccount.address) : undefined) ??
    hederaDappConnectorSession?.userAccountId.toString();

  let chain = mainnet;
  if (hasWagmi) {
    chain = getChainFromId(wagmiChainId);
  } else if (hasHashConnect) {
    chain = hashConnectChain;
  } else if (hasHederaDappConnector) {
    chain = hederaDappConnectorChain;
  }

  const showConnectionDialog = () => {
    setIsDisplayingConnectionDialog(true);
  };

  const hideConnectionDialog = () => {
    setIsDisplayingConnectionDialog(false);
  };

  const value: MultiWalletContext = {
    hasWagmi,
    hasHashConnect,
    hasHederaDappConnector,
    hasConnection,
    addressDisplayText,
    chain,
    disconnect,
    showConnectionDialog,
    hideConnectionDialog
  };

  return <multiWalletContext.Provider value={value}>{children}</multiWalletContext.Provider>;
};

export const useMultiWallet = () => {
  return useContext(multiWalletContext);
};

export const MultiWalletConsumer = multiWalletContext.Consumer;
