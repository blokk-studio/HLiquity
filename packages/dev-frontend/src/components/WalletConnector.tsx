/** @jsxImportSource theme-ui */
import { Button, Container, Flex, Heading, Paragraph } from "theme-ui";
import ThemeSwitcher from "./ThemeSwitcher";
import React from "react";
import { ChainSelector } from "./chain_context";
import { ConnectKitButton } from "connectkit";
import { useHederaDappConnectorContext } from "./HederaDappConnectorProvider";
import { Hedera } from "./icons/Hedera";
import buttonStyles from "../styles/buttons.module.css";
import { LiquityLogo } from "./LiquityLogo.tsx";

type WalletConnectorProps = {
  loader?: React.ReactNode;
  onCloseWalletConnector: () => void;
};

export const WalletConnector: React.FC<WalletConnectorProps> = ({ onCloseWalletConnector }) => {
  const hederaDappConnectorContext = useHederaDappConnectorContext();

  return (
    <React.Fragment>
      <div className="switcher-header">
        <div className="switcher-container">
          <Container variant="header">
            <Flex sx={{ justifyContent: "space-between", alignItems: "center", flex: 1 }}>
              <LiquityLogo height={32} />

              <Flex sx={{ alignItems: "center" }}>
                <button className={buttonStyles.normal} onClick={onCloseWalletConnector}>Close</button>
                <ThemeSwitcher />
              </Flex>
            </Flex>
          </Container>

        </div>
      </div>
      <Flex
        sx={{
          minHeight: "100vh",
          justifyContent: "center",
          flexDirection: "column",
          marginInline: "clamp(2rem, 100%, 50% - 16rem)",
          paddingBottom: "12rem"
        }}
      >
        <hgroup>
          <Heading as="h1" sx={{ color: "primary" }}>
            HLiquity.finance
          </Heading>
        </hgroup>

        <Paragraph sx={{ marginTop: "2rem", fontSize: "1.125rem" }}>
          HLiquity.finance is the pioneering front-end for decentralized,{" "}
          <span sx={{ color: "primary", fontWeight: "bold" }}>interest-free</span> DeFi borrowing on
          the Hedera Network, using HCHF pegged to the{" "}
          <span sx={{ color: "primary", fontWeight: "bold" }}>Swiss Franc</span>.
        </Paragraph>

        <Flex sx={{ flexDirection: "column", alignSelf: "center", marginTop: "2rem" }}>
          <ChainSelector />
          {hederaDappConnectorContext.dappConnector.extensions.length ? (
            hederaDappConnectorContext.dappConnector.extensions.map(extension => {
              return (
                <Button
                  key={extension.id}
                  sx={{ justifyContent: "start", marginTop: "0.5rem", gap: "1rem" }}
                  onClick={() => {
                    hederaDappConnectorContext.connect(extension.id);
                  }}
                >
                  {extension.icon && (
                    <img src={extension.icon} aria-hidden="true" sx={{ height: "1.5rem" }} />
                  )}
                  {extension.name}
                </Button>
              );
            })
          ) : (
            <Button
              className={buttonStyles.normal}
              sx={{ justifyContent: "start", marginTop: "0.5rem", gap: "1rem" }}
              onClick={() => {
                hederaDappConnectorContext.connect();
              }}
            >
              <Hedera />
              Hedera Wallet
            </Button>
          )}

          <span sx={{ justifySelf: "center", marginTop: "1rem", textAlign: "center" }}>or</span>

          <ConnectKitButton.Custom>
            {connectkit => {
              return (
                <Button
                  className={buttonStyles.normal}
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
