/** @jsxImportSource theme-ui */
import { Button, Flex, Heading, Paragraph } from "theme-ui";
import { useTranslation } from "react-i18next";
import ThemeSwitcher from "./ThemeSwitcher";
import React from "react";
import { useHashConnect } from "./HashConnectProvider";
import { HashPack } from "./icons/HashPack";
import { ChainSelector } from "./chain_context";
import { ConnectKitButton } from "connectkit";

type WalletConnectorProps = {
  loader?: React.ReactNode;
};

export const WalletConnector: React.FC<WalletConnectorProps> = () => {
  const { t } = useTranslation();
  const hashConnect = useHashConnect();

  return (
    <React.Fragment>
      <div className="switcher-header">
        <div className="switcher-container">
          <ThemeSwitcher />
        </div>
      </div>
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
          <Heading as="h1" sx={{ color: "primary" }}>HLiquity.finance</Heading>
        </hgroup>

        <Paragraph sx={{ marginTop: "2rem", fontSize: "1.125rem" }}>
          HLiquity.finance is the pioneering front-end for decentralized, <span sx={{ color: "primary", fontWeight: "bold" }}>interest-free</span> DeFi borrowing on the Hedera Network, using HCHF pegged to the <span sx={{ color: "primary", fontWeight: "bold" }}>Swiss Franc</span>.
        </Paragraph>

        <Flex sx={{ flexDirection: "column", alignSelf: "center", marginTop: "2rem" }}>
          <ChainSelector />

          <Button
            onClick={() => {
              hashConnect.openPairingModal();
            }}
            sx={{ marginTop: "1rem", display: "flex", gap: "1rem" }}
          >
            <HashPack aria-label="HashPack" />
            {t("startScreen.connectHashPack")}
          </Button>

          <span sx={{ justifySelf: "center", marginTop: "1rem", textAlign: "center" }}>or</span>

          <ConnectKitButton.Custom>
            {connectkit => {
              return (
                <Button
                  onClick={() => {
                    connectkit.show?.();
                  }}
                  sx={{ marginTop: "1rem" }}
                >
                  Connect other wallet
                </Button>
              );
            }}
          </ConnectKitButton.Custom>
        </Flex>
      </Flex>
    </React.Fragment>
  );
};
