import React from "react";
import { Chain, createClient, WagmiConfig } from "wagmi";
import { ConnectKitProvider } from "connectkit";
import { Button, Flex, Heading, ThemeProvider } from "theme-ui";
import { Global, css } from "@emotion/react";

import getDefaultClient from "./connectkit/defaultClient";
import { LiquityProvider, LiquityConsumer } from "./hooks/LiquityContext";
import { TransactionProvider } from "./components/Transaction";
import { Icon } from "./components/Icon";
import { getConfig } from "./config";
import theme from "./theme";

import { DisposableWalletProvider } from "./testUtils/DisposableWalletProvider";
import { LiquityFrontend } from "./LiquityFrontend";
import { AppLoader } from "./components/AppLoader";
import { useAsyncValue } from "./hooks/AsyncValue";
import { useHederaChains } from "./hedera/wagmi-chains";
import { AuthenticationProvider, LoginForm } from "./authentication";
import { HederaTokensProvider } from "./hedera/hedera_context";
import { Lexicon } from "./lexicon";
import { useConfiguration } from "./configuration";
import "./App.scss";
import {
  HashConnectProvider,
  HashConnectConsumer,
  HashConnectLoader,
  HashConnectSessionDataConsumer,
  HashConnectSessionDataLoader
} from "./components/HashConnectProvider";
import { LiquityStoreProvider } from "@liquity/lib-react";

const isDemoMode = import.meta.env.VITE_APP_DEMO_MODE === "true";

if (isDemoMode) {
  const ethereum = new DisposableWalletProvider(
    import.meta.env.VITE_APP_RPC_URL || `http://${window.location.hostname || "localhost"}:8545`,
    "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7"
  );

  Object.assign(window, { ethereum });
}

// Start pre-fetching the config
getConfig().then(config => {
  // console.log("Frontend config:");
  // console.log(config);
  Object.assign(window, { config });
});

const getChainNameListString = (chains: Chain[]) => {
  if (chains.length === 1) {
    return chains[0].name;
  }

  const chainsWithoutLast = chains.slice(0, chains.length - 1);
  const lastChain = chains[chains.length - 1];

  const listString = `${chainsWithoutLast.map(chain => chain.name).join(", ")} or ${lastChain.name}`;

  return listString;
};

const UnsupportedNetworkFallback: React.FC<{ availableNetworks: Chain[] }> = ({
  availableNetworks
}) => {
  return (
    <Flex
      sx={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        textAlign: "center"
      }}
    >
      <Heading sx={{ mb: 3 }}>
        <Icon name="exclamation-triangle" /> HLiquity is not supported on this network.
      </Heading>

      {availableNetworks.length ? (
        <p>Please switch to {getChainNameListString(availableNetworks)}.</p>
      ) : (
        <p>No chains or deployments have been configured.</p>
      )}
    </Flex>
  );
};

const jsonifyLexicon = (lexicon: Record<string, Lexicon>) => {
  const entries = Object.entries(lexicon).map(([lexiconKey, value]) => {
    const jsonKey = lexiconKey
      .split("_")
      .map((string, index) => {
        if (index === 0) {
          return string.toLowerCase();
        }

        const firstLetter = string.substring(0, 1);
        const rest = string.substring(1);

        return `${firstLetter.toUpperCase()}${rest.toLowerCase()}`;
      })
      .join("");

    return [jsonKey, value];
  });

  return Object.fromEntries(entries);
};

const App = () => {
  const config = useAsyncValue(getConfig);
  const chains = useHederaChains();
  const { walletConnectProjectId } = useConfiguration();

  if (!config.loaded) {
    return <ThemeProvider theme={theme} />;
  }

  const client = createClient(
    getDefaultClient({
      appName: "Liquity",
      chains,
      walletConnectProjectId
    })
  );

  return (
    <ThemeProvider theme={theme}>
      <Global
        styles={css`
          @font-face {
            font-family: "museo";
            src: url("fonts/Museo_Sans_Cyrl_300.ttf") format("truetype");
            font-style: normal;
            font-weight: 300;
          }
        `}
      />
      <AuthenticationProvider loginForm={<LoginForm />}>
        <WagmiConfig client={client}>
          <ConnectKitProvider options={{ hideBalance: true }}>
            <HashConnectProvider walletConnectProjectId={config.value.walletConnectProjectId}>
              <HashConnectLoader
                loader={<AppLoader content={<Heading>Loading HashPack</Heading>} />}
              >
                <HashConnectSessionDataLoader
                  loader={<AppLoader content={<Heading>Loading HashPack</Heading>} />}
                >
                  <HashConnectConsumer>
                    {hashConnect => (
                      <HashConnectSessionDataConsumer>
                        {sessionData => {
                          if (sessionData.connectionState !== "Paired") {
                            <Flex
                              sx={{
                                minHeight: "100%",
                                flexDirection: "column",
                                justifyContent: "center",
                                marginInline: "clamp(2rem, 100%, 50% - 12rem)"
                              }}
                            >
                              <Button
                                sx={{ alignSelf: "center" }}
                                onClick={() => hashConnect.openPairingModal()}
                              >
                                Connect HashPack
                              </Button>
                            </Flex>;
                          }

                          return (
                            <TransactionProvider>
                              <HederaTokensProvider>
                                <LiquityProvider
                                  unsupportedNetworkFallback={
                                    <UnsupportedNetworkFallback availableNetworks={chains} />
                                  }
                                  unsupportedMainnetFallback={
                                    <UnsupportedNetworkFallback availableNetworks={chains} />
                                  }
                                >
                                  <LiquityConsumer>
                                    {liquityContext => {
                                      if (!liquityContext) {
                                        return;
                                      }

                                      return (
                                        <LiquityStoreProvider
                                          store={liquityContext.store}
                                          loader={
                                            <AppLoader content={<Heading>Loading data</Heading>} />
                                          }
                                        >
                                          <LiquityFrontend />
                                        </LiquityStoreProvider>
                                      );
                                    }}
                                  </LiquityConsumer>
                                </LiquityProvider>
                              </HederaTokensProvider>
                            </TransactionProvider>
                          );
                        }}
                      </HashConnectSessionDataConsumer>
                    )}
                  </HashConnectConsumer>
                </HashConnectSessionDataLoader>
              </HashConnectLoader>
            </HashConnectProvider>
          </ConnectKitProvider>
        </WagmiConfig>
      </AuthenticationProvider>
    </ThemeProvider>
  );
};

export default App;
