import React from "react";
import { Chain, createClient, WagmiConfig } from "wagmi";
import { ConnectKitProvider } from "connectkit";
import { Flex, Heading, ThemeProvider } from "theme-ui";
import { Global, css } from "@emotion/react";

import getDefaultClient from "./connectkit/defaultClient";
import { LiquityProvider } from "./hooks/LiquityContext";
import { TransactionProvider } from "./components/Transaction";
import { Icon } from "./components/Icon";
import theme from "./theme";

import { DisposableWalletProvider } from "./testUtils/DisposableWalletProvider";
import { LiquityFrontend } from "./LiquityFrontend";
import { AppLoader } from "./components/AppLoader";
import { useHederaChains } from "./hooks/chains";
import { AuthenticationProvider, LoginForm } from "./authentication";
import { useConfiguration } from "./configuration";
import "./App.scss";
import { LiquityStoreProvider } from "./components/LiquityStoreProvider";
import { SelectedChainProvider, useSelectedChain } from "./components/chain_context";
import { MultiWalletProvider } from "./multi_wallet";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ComponentTree } from "./components/ComponentTree";
import { SnackbarProvider } from "./components/Snackbar";
import {
  HederaDappConnectorContextLoader,
  HederaDappConnectorProvider
} from "./components/HederaDappConnectorProvider";

const isDemoMode = import.meta.env.VITE_APP_DEMO_MODE === "true";

if (isDemoMode) {
  const ethereum = new DisposableWalletProvider(
    import.meta.env.VITE_APP_RPC_URL || `http://${window.location.hostname || "localhost"}:8545`,
    "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7"
  );

  Object.assign(window, { ethereum });
}

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

const DefaultWagmiClientProvider: React.FC = ({ children }) => {
  const selectedChain = useSelectedChain();
  const hederaChains = useHederaChains();
  const { walletConnectProjectId } = useConfiguration();

  const chainsOtherThanSelected = hederaChains.filter(chain => chain.id !== selectedChain.id);
  const chains = [selectedChain, ...chainsOtherThanSelected];

  const client = createClient(
    getDefaultClient({
      appName: "Liquity",
      chains,
      walletConnectProjectId
    })
  );

  return <WagmiConfig client={client}>{children}</WagmiConfig>;
};

const App = () => {
  const chains = useHederaChains();
  const { walletConnectProjectId } = useConfiguration();

  return (
    <>
      <Global
        styles={css`
          @font-face {
            font-family: "museo";
            src: url("fonts/Museo_Sans_Cyrl_100.ttf") format("truetype");
            font-style: normal;
            font-weight: 100;
          }
          @font-face {
            font-family: "museo";
            src: url("fonts/Museo_Sans_Cyrl_100_Italic.ttf") format("truetype");
            font-style: italic;
            font-weight: 100;
          }
          @font-face {
            font-family: "museo";
            src: url("fonts/Museo_Sans_Cyrl_300.ttf") format("truetype");
            font-style: normal;
            font-weight: 300;
          }
          @font-face {
            font-family: "museo";
            src: url("fonts/Museo_Sans_Cyrl_300_Italic.ttf") format("truetype");
            font-style: italic;
            font-weight: 300;
          }
          @font-face {
            font-family: "museo";
            src: url("fonts/Museo_Sans_Cyrl_500.ttf") format("truetype");
            font-style: normal;
            font-weight: 500;
          }
          @font-face {
            font-family: "museo";
            src: url("fonts/Museo_Sans_Cyrl_500_Italic.ttf") format("truetype");
            font-style: italic;
            font-weight: 500;
          }
          @font-face {
            font-family: "museo";
            src: url("fonts/Museo_Sans_Cyrl_700.ttf") format("truetype");
            font-style: normal;
            font-weight: 700;
          }
          @font-face {
            font-family: "museo";
            src: url("fonts/Museo_Sans_Cyrl_700_Italic.ttf") format("truetype");
            font-style: italic;
            font-weight: 700;
          }
          @font-face {
            font-family: "museo";
            src: url("fonts/Museo_Sans_Cyrl_900_Italic.ttf") format("truetype");
            font-style: italic;
            font-weight: 900;
          }
        `}
      />

      <ComponentTree
        renderers={[
          children => <ThemeProvider theme={theme}>{children}</ThemeProvider>,
          children => <AppErrorBoundary>{children}</AppErrorBoundary>,
          children => <SnackbarProvider>{children}</SnackbarProvider>,
          children => (
            <AuthenticationProvider loginForm={<LoginForm />}>{children}</AuthenticationProvider>
          ),
          children => <SelectedChainProvider>{children}</SelectedChainProvider>,
          children => <DefaultWagmiClientProvider>{children}</DefaultWagmiClientProvider>,
          children => (
            <ConnectKitProvider options={{ hideBalance: true }}>{children}</ConnectKitProvider>
          ),
          children => (
            <HederaDappConnectorProvider walletConnectProjectId={walletConnectProjectId}>
              {children}
            </HederaDappConnectorProvider>
          ),
          children => <TransactionProvider>{children}</TransactionProvider>,
          children => (
            <HederaDappConnectorContextLoader
              loader={<AppLoader content={<Heading>Setting up Hedera wallets</Heading>} />}
            >
              {children}
            </HederaDappConnectorContextLoader>
          ),
          children => <MultiWalletProvider>{children}</MultiWalletProvider>,
          children => (
            <LiquityProvider
              unsupportedNetworkFallback={<UnsupportedNetworkFallback availableNetworks={chains} />}
              unsupportedMainnetFallback={<UnsupportedNetworkFallback availableNetworks={chains} />}
            >
              {children}
            </LiquityProvider>
          ),
          children => (
            <LiquityStoreProvider loader={<AppLoader content={<Heading>Loading data</Heading>} />}>
              {children}
            </LiquityStoreProvider>
          )
        ]}
      >
        <LiquityFrontend />
      </ComponentTree>
    </>
  );
};

export default App;
