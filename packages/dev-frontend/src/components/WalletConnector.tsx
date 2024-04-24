/** @jsxImportSource theme-ui */
import { ConnectKitButton } from "connectkit";
import { Box, Button, Flex, Heading, Paragraph } from "theme-ui";
import { Icon } from "./Icon";

type WalletConnectorProps = {
  loader?: React.ReactNode;
};

export const WalletConnector: React.FC<WalletConnectorProps> = ({ children }) => {
  return (
    <ConnectKitButton.Custom>
      {connectKit =>
        connectKit.isConnected ? (
          children
        ) : (
          <Flex
            sx={{
              minHeight: "100vh",
              justifyContent: "center",
              flexDirection: "column",
              marginInline: "clamp(2rem, 100%, 50% - 16rem)",
              paddingBlock: "4rem"
            }}
          >
            <hgroup>
              <Heading sx={{ color: "primary" }}>HLiquity.finance</Heading>

              <Paragraph sx={{ marginTop: "0.5rem", fontSize: "1.125rem" }}>
                DeFi Borrowing on the Hedera Network
              </Paragraph>
            </hgroup>

            <Paragraph sx={{ marginTop: "2rem", fontSize: "1.125rem" }}>
              A front-end for HLiquity &ndash; a decentralized borrowing protocol for{" "}
              <span sx={{ color: "secondary", fontWeight: "bold" }}>interest-free loans</span> paid
              out in HCHF, pegged to the{" "}
              <span sx={{ color: "secondary", fontWeight: "bold" }}>
                strong and reliable Swiss Franc
              </span>
              .
            </Paragraph>

            <Button onClick={connectKit.show} sx={{ marginTop: "4rem", alignSelf: "center" }}>
              <Icon name="plug" size="lg" />
              <Box sx={{ ml: 2 }}>Connect wallet</Box>
            </Button>
          </Flex>
        )
      }
    </ConnectKitButton.Custom>
  );
};
