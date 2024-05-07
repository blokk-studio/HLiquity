import { createContext, useEffect, useState } from "react";
import { DappMetadata, HashConnect, SessionData, HashConnectConnectionState } from "hashconnect";
import { LedgerId } from "@hashgraph/sdk";
import { getConsumer, getHook, getLoader, getOptionalHook } from "../optional_context";
import { Flex, Heading, Paragraph } from "theme-ui";
import { Icon } from "./Icon";

const appMetadata: DappMetadata = {
  description: "Decentralized borrowing Protocol on Hedera",
  icons: ["https://hliquity.finance/hliquity.svg"],
  name: "HLiquity",
  url: "https://hliquity.finance/"
};

const hashConnectContext = createContext<HashConnect | null>(null);

export const OptionalHashConnectConsumer = hashConnectContext.Consumer;
export const HashConnectConsumer = getConsumer(hashConnectContext, {
  errorMessage: `the hashconnect instance hasn't been set in the context. make sure you have <HashConnectProvider> and <HashConnectLoader> as ancestors of this <HashConnectConsumer>.`
});
/**
 * displays a loader until the hashconnect context is populated
 *
 * the context is guaranteed to be populated for the children of this component
 */
export const HashConnectLoader = getLoader(hashConnectContext);
export const useOptionalHashConnect = getOptionalHook(hashConnectContext);
export const useHashConnect = getHook(hashConnectContext, {
  errorMessage: `the hashconnect instance hasn't been set in the context. make sure you have <HashConnectProvider> and <HashConnectLoader> as ancestors of the components you call useHashConnect() in.`
});

interface ExtendedHashConnectSessionData extends SessionData {
  userAccountEvmAddress: `0x${string}`;
  connectionState: HashConnectConnectionState;
}
const hashConnectSessionDataContext = createContext<ExtendedHashConnectSessionData | null>(null);

export const OptionalHashConnectSessionDataConsumer = hashConnectSessionDataContext.Consumer;
export const HashConnectSessionDataConsumer = getConsumer(hashConnectSessionDataContext, {
  errorMessage: `the hashconnect session data hasn't been set in the context. make sure you have <HashConnectSessionDataProvider> and <HashConnectSessionDataLoader> as ancestors of this <HashConnectSessionDataConsumer>.`
});
export const HashConnectSessionDataLoader = getLoader(hashConnectSessionDataContext);
export const useOptionalHashConnectSessionData = getOptionalHook(hashConnectSessionDataContext);
export const useHashConnectSessionData = getHook(hashConnectSessionDataContext, {
  errorMessage: `the hashconnect session data hasn't been set in the context. make sure you have <HashConnectProvider> and <HashConnectSessionDataLoader> as ancestors of the components you call useHashConnectSessionData() in.`
});

export const HashConnectProvider: React.FC<{ walletConnectProjectId: string }> = props => {
  const [hashConnect, setHashConnect] = useState<HashConnect | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [userAccountEvmAddress, setUserAccountEvmAddress] = useState<`0x${string}` | null>(null);
  const [hashConnectError, setHashConnectError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<HashConnectConnectionState>(
    HashConnectConnectionState.Disconnected
  );

  const setUpHashConnect = async (options: { walletConnectProjectId: string }) => {
    // TODO: handle all chains
    const hashConnect = new HashConnect(
      LedgerId.TESTNET,
      options.walletConnectProjectId,
      appMetadata,
      import.meta.env.DEV
    );

    const updateConnectionState = (connectionState: HashConnectConnectionState) => {
      setConnectionState(connectionState);
    };
    const updateSessionData = async (data: SessionData) => {
      const [userAccountId] = data.accountIds;
      // TODO: handle all chains
      const response = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${userAccountId.toString()}`
      );
      const { evm_address }: { evm_address: `0x${string}` } = await response.json();

      setSessionData(data);
      setUserAccountEvmAddress(evm_address);
    };
    const unsetHashConnect = () => {
      hashConnect.disconnectionEvent.off(unsetHashConnect);
      hashConnect.connectionStatusChangeEvent.off(updateConnectionState);
      setHashConnect(null);
      setSessionData(null);
      setUserAccountEvmAddress(null);
      setConnectionState(HashConnectConnectionState.Disconnected);
    };

    hashConnect.connectionStatusChangeEvent.on(updateConnectionState);
    hashConnect.pairingEvent.on(updateSessionData);
    hashConnect.disconnectionEvent.on(unsetHashConnect);

    await hashConnect.init();

    return hashConnect;
  };

  useEffect(() => {
    const effect = async () => {
      try {
        const hashConnect = await setUpHashConnect({
          walletConnectProjectId: props.walletConnectProjectId
        });

        const setUpHashConnectAgain = () => {
          hashConnect.disconnectionEvent.off(setUpHashConnectAgain);

          effect();
        };

        hashConnect.disconnectionEvent.on(setUpHashConnectAgain);
        hashConnect.pairingEvent.on(pairingEvent => console.debug({ pairingEvent }));
        hashConnect.disconnectionEvent.on(disconnectionEvent =>
          console.debug({ disconnectionEvent })
        );
        hashConnect.connectionStatusChangeEvent.on(connectionStatusChangeEvent =>
          console.debug({ connectionStatusChangeEvent })
        );

        setHashConnect(hashConnect);
      } catch (error: unknown) {
        setHashConnectError(error as Error);
      }
    };

    effect();
  }, [props.walletConnectProjectId]);

  if (hashConnectError) {
    return (
      <Flex
        sx={{
          minHeight: "100%",
          flexDirection: "column",
          justifyContent: "center",
          marginInline: "clamp(2rem, 100%, 50% - 12rem)"
        }}
      >
        <Heading sx={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Icon name="exclamation-triangle" />
          Something went wrong
        </Heading>
        <Paragraph sx={{ marginTop: "1rem" }}>
          Couldn't connect to HashPack. Please reload the page.
        </Paragraph>

        <details style={{ marginTop: "3rem", width: "100%" }}>
          <summary>Error details</summary>

          <p>{hashConnectError.message}</p>
        </details>
      </Flex>
    );
  }

  let sessionDataValue: ExtendedHashConnectSessionData | null = null;
  if (sessionData && userAccountEvmAddress) {
    sessionDataValue = {
      ...sessionData,
      userAccountEvmAddress,
      connectionState
    };
  }

  return (
    <hashConnectContext.Provider value={hashConnect}>
      <hashConnectSessionDataContext.Provider value={sessionDataValue}>
        {props.children}
      </hashConnectSessionDataContext.Provider>
    </hashConnectContext.Provider>
  );
};
