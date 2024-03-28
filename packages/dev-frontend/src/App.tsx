import React from "react";
import { Chain, createClient, WagmiConfig } from "wagmi";
import { ConnectKitProvider } from "connectkit";
import { Flex, Heading, ThemeProvider, Paragraph, Link } from "theme-ui";

import getDefaultClient from "./connectkit/defaultClient";
import { LiquityProvider } from "./hooks/LiquityContext";
import { WalletConnector } from "./components/WalletConnector";
import { TransactionProvider } from "./components/Transaction";
import { Icon } from "./components/Icon";
import { getConfig } from "./config";
import theme from "./theme";

import { DisposableWalletProvider } from "./testUtils/DisposableWalletProvider";
import { LiquityFrontend } from "./LiquityFrontend";
import { AppLoader } from "./components/AppLoader";
import { useAsyncValue } from "./hooks/AsyncValue";
import {
  mainnet as hederaMainnet,
  testnet as hederaTestnet,
  previewnet as hederaPreviewnet,
  useHederaChains
} from "./hedera/wagmi-chains";
import { AuthenticationProvider, LoginForm } from "./authentication";
import { HederaTokensProvider } from "./hedera/hedera_context";
import { useDeployments } from "./configuration/deployments";

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

const App = () => {
  const config = useAsyncValue(getConfig);
  const chains = useHederaChains();

  if (!config.loaded) {
    return <ThemeProvider theme={theme} />;
  }

  const loader = <AppLoader />;
  const client = createClient(
    getDefaultClient({
      appName: "Liquity",
      chains,
      walletConnectProjectId: config.value.walletConnectProjectId,
      infuraId: config.value.infuraApiKey,
      alchemyId: config.value.alchemyApiKey
    })
  );

  return (
    <ThemeProvider theme={theme}>
      <AuthenticationProvider loginForm={<LoginForm />}>
        <WagmiConfig client={client}>
          <ConnectKitProvider options={{ hideBalance: true }}>
            <WalletConnector loader={loader}>
              <LiquityProvider
                loader={loader}
                unsupportedNetworkFallback={
                  <UnsupportedNetworkFallback availableNetworks={chains} />
                }
                unsupportedMainnetFallback={
                  <UnsupportedNetworkFallback availableNetworks={chains} />
                }
              >
                <TransactionProvider>
                  <HederaTokensProvider>
                    <LiquityFrontend loader={loader} />
                  </HederaTokensProvider>
                </TransactionProvider>
              </LiquityProvider>
            </WalletConnector>
          </ConnectKitProvider>
        </WagmiConfig>
      </AuthenticationProvider>
    </ThemeProvider>
  );
};

export default App;
