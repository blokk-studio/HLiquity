import React, { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createWeb3Modal } from "@web3modal/wagmi/react";
// import { injected } from "wagmi/connectors";
import { useHederaChains } from "./hedera/wagmi-chains";
// import { ConnectKitProvider, getDefaultConfig, getDefaultConnectors } from "connectkit";
import { Flex, Heading, ThemeUIProvider } from "theme-ui";
// import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { AuthenticationProvider, LoginForm } from "./authentication";
import { LiquityProvider } from "./hooks/LiquityContext";
import { WalletConnector } from "./components/WalletConnector";
// import { TransactionProvider } from "./components/Transaction";
import { Icon } from "./components/Icon";
import { getConfig } from "./config";
import theme from "./theme";

// import { DisposableWalletProvider } from "./testUtils/DisposableWalletProvider";
import { LiquityFrontend } from "./LiquityFrontend";
import { AppLoader } from "./components/AppLoader";
import { TransactionProvider } from "./components/Transaction";
import { useConfiguration } from "./configuration";
import { Web3Modal } from "@web3modal/wagmi";

// const isDemoMode = import.meta.env.VITE_APP_DEMO_MODE === "true";

const metadata = {
  name: "Liquity",
  description: "Liquity",
  url: "http://localhost:5173", // origin must match your domain & subdomain
  icons: [""]
};

// if (isDemoMode) {
//   const ethereum = new DisposableWalletProvider(
//     import.meta.env.VITE_APP_RPC_URL || `http://${window.location.hostname || "localhost"}:8545`,
//     "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7"
//   );

//   Object.assign(window, { ethereum });
// }

// Start pre-fetching the config
getConfig().then(config => {
  // console.log("Frontend config:");
  // console.log(config);
  Object.assign(window, { config });
});

const UnsupportedNetworkFallback: React.FC = () => {
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

      {/* {availableNetworks.length ? (
        <p>Please switch to {(availableNetworks)}.</p>
      ) : ( */}
      <p>No chains or deployments have been configured.</p>
      {/* )} */}
    </Flex>
  );
};

const App = () => {
  const loader = <AppLoader />;
  const chains = useHederaChains();
  const { walletConnectProjectId } = useConfiguration();

  const wagmiConfig = useMemo(() => {
    const wagmiConfig = defaultWagmiConfig({
      chains,
      projectId: walletConnectProjectId,
      metadata
    });

    return wagmiConfig;
  }, [chains, walletConnectProjectId]);

  const [modalCreated, setModalCreated] = useState(false);
  useEffect(() => {
    createWeb3Modal({
      wagmiConfig: wagmiConfig,
      projectId: walletConnectProjectId,
      enableAnalytics: true, // Optional - defaults to your Cloud configuration
      enableOnramp: true // Optional - false as default
    });

    setModalCreated(true);
  }, [wagmiConfig, walletConnectProjectId]);

  const queryClient = new QueryClient();

  return (
    <ThemeUIProvider theme={theme}>
      <AuthenticationProvider loginForm={<LoginForm />}>
        {!modalCreated ? (
          loader
        ) : (
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <WalletConnector loader={loader}>
                <LiquityProvider
                  loader={loader}
                  unsupportedNetworkFallback={<UnsupportedNetworkFallback />}
                  unsupportedMainnetFallback={<UnsupportedNetworkFallback />}
                >
                  <TransactionProvider>
                    <LiquityFrontend loader={loader} />
                  </TransactionProvider>
                </LiquityProvider>
              </WalletConnector>
            </QueryClientProvider>
          </WagmiProvider>
        )}
      </AuthenticationProvider>
    </ThemeUIProvider>
  );
};

export default App;
