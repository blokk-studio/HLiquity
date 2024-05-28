import { useMultiWallet } from "../multi_wallet";
import { WalletConnector } from "./WalletConnector";

/** renders a wallet connector if no wallet is connected to ensure at least one wallet is available to its children */
export const MultiWalletGatekeeper: React.FC = ({ children }) => {
  const { hasConnection } = useMultiWallet();

  if (!hasConnection) {
    return <WalletConnector />;
  }

  return <>{children}</>;
};
