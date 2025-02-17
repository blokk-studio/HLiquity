// BSD 2-Clause License
//
// Copyright (c) 2022, LFE, Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer.

// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
// OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import { Connector, configureChains, ChainProviderFn } from "wagmi";
import { Chain, mainnet, polygon, optimism, arbitrum } from "wagmi/chains";
import { Provider, WebSocketProvider } from "@wagmi/core";

import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { CoinbaseWalletConnector } from "wagmi/connectors/coinbaseWallet";
import { SafeConnector } from "wagmi/connectors/safe";
import { InjectedConnector } from "wagmi/connectors/injected";

import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";
import { getHederaHashioChainProviderFunction } from "../hashgraph/HederaHashioProvider";

let globalAppName: string;
let globalAppIcon: string;

export const getAppName = () => globalAppName;
export const getAppIcon = () => globalAppIcon;

const defaultChains = [mainnet, polygon, optimism, arbitrum];

type DefaultConnectorsProps = {
  chains?: Chain[];
  app: {
    name: string;
    icon?: string;
    description?: string;
    url?: string;
  };
};

type ProviderOrProviderGetter<ProviderInstance extends Provider | undefined = Provider> =
  | ProviderInstance
  | ((options: { chainId?: number }) => ProviderInstance);

type DefaultClientProps = {
  appName: string;
  appIcon?: string;
  appDescription?: string;
  appUrl?: string;
  autoConnect?: boolean;
  alchemyId?: string;
  infuraId?: string;
  chains?: Chain[];
  connectors?: Connector[];
  provider?: ProviderOrProviderGetter;
  webSocketProvider?: ProviderOrProviderGetter<WebSocketProvider | undefined>;
  enableWebSocketProvider?: boolean;
  stallTimeout?: number;
  /* WC 2.0 requires a project ID (get one here: https://cloud.walletconnect.com/sign-in) */
  walletConnectProjectId: string;
};

type ConnectKitClientProps = {
  autoConnect?: boolean;
  connectors?: Connector[];
  provider: ProviderOrProviderGetter;
  webSocketProvider?: ProviderOrProviderGetter<WebSocketProvider | undefined>;
};

const getDefaultConnectors = ({ chains, app }: DefaultConnectorsProps) => {
  const shouldUseSafeConnector = !(typeof window === "undefined") && window?.parent !== window;

  let connectors: Connector[] = [];

  // If we're in an iframe, include the SafeConnector
  if (shouldUseSafeConnector) {
    connectors = [
      ...connectors,
      new SafeConnector({
        chains,
        options: {
          allowedDomains: [/gnosis-safe.io$/, /app.safe.global$/],
          debug: false
        }
      })
    ];
  }

  // Add the rest of the connectors
  connectors = [
    ...connectors,
    new MetaMaskConnector({
      chains,
      options: {
        shimDisconnect: true,
        UNSTABLE_shimOnConnectSelectAccount: true
      }
    }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: app.name,
        headlessMode: true
      }
    }),
    new InjectedConnector({
      chains,
      options: {
        shimDisconnect: true,
        name: detectedName =>
          `Injected (${typeof detectedName === "string" ? detectedName : detectedName.join(", ")})`
      }
    })
  ];

  return connectors;
};

const defaultClient = ({
  autoConnect = true,
  appName = "ConnectKit",
  appIcon,
  appDescription,
  appUrl,
  chains = defaultChains,
  connectors,
  provider,
  stallTimeout,
  webSocketProvider,
  enableWebSocketProvider
}: DefaultClientProps) => {
  globalAppName = appName;
  if (appIcon) globalAppIcon = appIcon;

  const providers: ChainProviderFn[] = [];

  providers.push(
    jsonRpcProvider({
      rpc: c => {
        return { http: c.rpcUrls.default.http[0] };
      },
      stallTimeout
    })
  );
  providers.push(getHederaHashioChainProviderFunction());
  providers.push(publicProvider());

  const {
    provider: configuredProvider,
    chains: configuredChains,
    webSocketProvider: configuredWebSocketProvider
  } = configureChains(chains, providers);

  const connectKitClient: ConnectKitClientProps = {
    autoConnect,
    connectors:
      connectors ??
      getDefaultConnectors({
        chains: configuredChains,
        app: {
          name: appName,
          icon: appIcon,
          description: appDescription,
          url: appUrl
        }
      }),
    provider: provider ?? configuredProvider,
    webSocketProvider: enableWebSocketProvider // Removed by default, breaks if used in Next.js – "unhandledRejection: Error: could not detect network"
      ? (webSocketProvider ?? configuredWebSocketProvider)
      : undefined
  };

  return { ...connectKitClient };
};

export default defaultClient;
