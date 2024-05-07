import { createContext, useContext, useEffect, useState } from "react";
import { DappMetadata, HashConnect, SessionData, HashConnectConnectionState } from "hashconnect";
import { LedgerId } from "@hashgraph/sdk";
import { getConsumer, getHook, getLoader, getOptionalHook } from "../optional_context";
import { Flex, Heading, Paragraph } from "theme-ui";
import { Icon } from "./Icon";
import { t } from "../i18n";

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

const hashConnectConnectionStateContext = createContext(HashConnectConnectionState.Disconnected);
export const useHashConnectConnectionState = () => useContext(hashConnectConnectionStateContext);
export const HashConnectConnectionStateConsumer = hashConnectConnectionStateContext.Consumer;

export const HashConnectProvider: React.FC<{ walletConnectProjectId: string }> = props => {
  const [hashConnect, setHashConnect] = useState<HashConnect | null>(null);
  const [sessionData, setSessionData] = useState<ExtendedHashConnectSessionData | null>(null);
  const [connectionState, setConnectionState] = useState<HashConnectConnectionState>(
    HashConnectConnectionState.Disconnected
  );
  const [hashConnectError, setHashConnectError] = useState<Error | null>(null);

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

      const extendedSessionData: ExtendedHashConnectSessionData = {
        ...data,
        userAccountEvmAddress: evm_address
      };

      setSessionData(extendedSessionData);
    };
    const destroyHashConnect = () => {
      hashConnect.connectionStatusChangeEvent.off(updateConnectionState);
      hashConnect.pairingEvent.off(updateSessionData);
      hashConnect.disconnectionEvent.off(destroyHashConnect);

      setHashConnect(null);
      setSessionData(null);
      setConnectionState(HashConnectConnectionState.Disconnected);
      setHashConnectError(null);
    };

    hashConnect.connectionStatusChangeEvent.on(updateConnectionState);
    hashConnect.pairingEvent.on(updateSessionData);
    hashConnect.disconnectionEvent.on(destroyHashConnect);

    return { hashConnect, destroyHashConnect };
  };

  useEffect(() => {
    let destroyEffect: () => void = () => undefined;

    const effect = async () => {
      try {
        destroyEffect();

        const { hashConnect, destroyHashConnect } = await setUpHashConnect({
          walletConnectProjectId: props.walletConnectProjectId
        });

        destroyEffect = () => {
          destroyHashConnect();
        };

        const setUpHashConnectAgain = () => {
          hashConnect.disconnectionEvent.off(setUpHashConnectAgain);

          effect();
        };

        hashConnect.disconnectionEvent.on(setUpHashConnectAgain);

        await hashConnect.init();

        setHashConnect(hashConnect);
      } catch (error: unknown) {
        setHashConnect(null);
        setHashConnectError(error as Error);
      }
    };

    effect();

    return destroyEffect;
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
          {t("hashPackError.heading")}
        </Heading>
        <Paragraph sx={{ marginTop: "1rem" }}>{t("hashPackError.infoText")}</Paragraph>

        <details style={{ marginTop: "3rem", width: "100%" }}>
          <summary>{t("hashPackError.errorDetails")}</summary>

          <p>{hashConnectError.message}</p>
        </details>
      </Flex>
    );
  }

  return (
    <hashConnectContext.Provider value={hashConnect}>
      <hashConnectConnectionStateContext.Provider value={connectionState}>
        <hashConnectSessionDataContext.Provider value={sessionData}>
          {props.children}
        </hashConnectSessionDataContext.Provider>
      </hashConnectConnectionStateContext.Provider>
    </hashConnectContext.Provider>
  );
};