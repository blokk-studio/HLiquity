import { Button } from "theme-ui";
import { ActionDescription } from "./ActionDescription";
import { useMultiWallet } from "../multi_wallet";

export const WalletNotConnectedInfo: React.FC = () => {
  const { showConnectionDialog } = useMultiWallet();

  return (
    <ActionDescription>
      To interact with the HLiquity protocol, please connect your wallet.{" "}
      <Button
        sx={{
          display: "inline"
        }}
        variant="small"
        onClick={showConnectionDialog}
      >
        Connect
      </Button>
    </ActionDescription>
  );
};
