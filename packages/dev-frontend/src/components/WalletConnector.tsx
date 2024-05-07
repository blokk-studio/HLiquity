/** @jsxImportSource theme-ui */
import { ConnectKitButton } from "connectkit";
import { Box, Button, Flex, Heading, Paragraph } from "theme-ui";
import { Icon } from "./Icon";
import { useTranslation } from "react-i18next";
import ThemeSwitcher from "./ThemeSwitcher";
import React from "react";
import { useHashConnect } from "./HashConnectProvider";
import { HashPack } from "./icons/HashPack";

type WalletConnectorProps = {
  loader?: React.ReactNode;
};

export const WalletConnector: React.FC<WalletConnectorProps> = ({ children }) => {
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
          <Heading sx={{ color: "primary" }}>HLiquity.finance</Heading>

          <Paragraph sx={{ marginTop: "0.5rem", fontSize: "1.125rem" }}>
            {t("startScreen.subHeading")}
          </Paragraph>
        </hgroup>

        <Paragraph sx={{ marginTop: "2rem", fontSize: "1.125rem" }}>
          {t("startScreen.introText.0")}
          <span sx={{ color: "secondary", fontWeight: "bold" }}>{t("startScreen.introText.1")}</span>
          {t("startScreen.introText.2")}
          <span sx={{ color: "secondary", fontWeight: "bold" }}>{t("startScreen.introText.3")}</span>
        </Paragraph>

        <Button
          onClick={() => hashConnect.openPairingModal()}
          variant="outline"
          sx={{ alignSelf: "center", marginTop: "4rem", display: "flex", gap: "1rem" }}
        >
          <HashPack aria-label="HashPack" />
          {t("startScreen.connectHashPack")}
        </Button>

        {/* <ConnectKitButton.Custom>
        {connectKit =>
          connectKit.isConnected ? (
            children
          ) : (
            <Button onClick={connectKit.show} sx={{ marginTop: "4rem", alignSelf: "center" }}>
              <Icon name="plug" size="lg" />
              <Box sx={{ ml: 2 }}>{t("startScreen.connectWallet")}</Box>
            </Button>
          )
        }
      </ConnectKitButton.Custom> */}
      </Flex>
    </React.Fragment>
  );
};
