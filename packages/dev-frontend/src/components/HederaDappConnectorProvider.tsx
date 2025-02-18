import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DappMetadata, HashConnectConnectionState } from "hashconnect";
import { AccountId, LedgerId } from "@hashgraph/sdk";
import { getConsumer, getHook, getLoader, getOptionalHook } from "../optional_context";
import { useSelectedChain } from "./chain_context";
import {
  chains,
  getChainFromLedgerId,
  HederaChain,
  useEnabledChainIds
} from "../configuration/chains";
import { Address } from "@liquity/lib-base";
import { AppError } from "./AppError";
import {
  DAppConnector,
  HederaChainId,
  HederaJsonRpcMethod,
  HederaSessionEvent
} from "@hashgraph/hedera-wallet-connect";

const getHederaChainId = (chainId: number): HederaChainId => {
  switch (chainId) {
    case 296:
      return HederaChainId.Mainnet;
    case 297:
      return HederaChainId.Previewnet;
    case 298:
      return HederaChainId.Devnet;
  }

  return HederaChainId.Mainnet;
};

type SessionStruct = Parameters<NonNullable<DAppConnector["onSessionIframeCreated"]>>[0];
const getSessionFromStruct = async (sessionStruct: SessionStruct) => {
  const sessionAccount = sessionStruct.namespaces?.hedera?.accounts?.[0];
  if (!sessionAccount) {
    return null;
  }
  const sessionParts = sessionAccount.split(":");
  const userAccountIdString = sessionParts.pop();
  const network = sessionParts.pop();
  if (!userAccountIdString) {
    return null;
  }
  if (!network) {
    return null;
  }

  const chain = chains.find(chain => chain.ledgerId.toString() === network);
  if (!chain) {
    console.error(
      `network ${JSON.stringify(
        network
      )} received from pairing data does not match any chain's ledger id`
    );
    return null;
  }

  const userAccountEvmAddress = await getAccountEvmAddress({
    accountIdString: userAccountIdString,
    chain
  });
  if (!userAccountEvmAddress) {
    return null;
  }

  const userAccountId = AccountId.fromString(userAccountIdString);
  const ledgerId = LedgerId.fromString(network);

  const sessionData: HederaDappConnectorSession = {
    userAccountId,
    userAccountEvmAddress,
    ledgerId
  };

  return sessionData;
};

const appMetadata: DappMetadata = {
  description: "Decentralized borrowing Protocol on Hedera",
  icons: ["https://hliquity.finance/hliquity.svg"],
  name: "HLiquity",
  url: "https://hliquity.finance/"
};

interface HederaDappConnectorContext {
  // exclude the properties that we need to wrap with our own abstraction
  dappConnector: Omit<
    DAppConnector,
    "openModal" | "connectExtension" | "connect" | "disconnect" | "disconnectAll"
  >;
  connect: (extensionId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const hederaDappConnectorContext = createContext<HederaDappConnectorContext | null>(null);
export const OptionalHederaDappConnectorContextConsumer = hederaDappConnectorContext.Consumer;
export const hederaDappConnectorContextConsumer = getConsumer(hederaDappConnectorContext, {
  errorMessage: `the hedera dapp connector instance hasn't been set in the context. make sure you have <HederaDappConnectorProvider> and <HederaDappConnectorLoader> as ancestors of this <HashConnectConsumer>.`
});
/**
 * displays a loader until the dapp connector context is populated
 *
 * the context is guaranteed to be populated for the children of this component
 */
export const HederaDappConnectorContextLoader = getLoader(hederaDappConnectorContext);
export const useOptionalHederaDappConnectorContext = getOptionalHook(hederaDappConnectorContext);
export const useHederaDappConnectorContext = getHook(hederaDappConnectorContext, {
  errorMessage: `the hedera dapp connector instance hasn't been set in the context. make sure you have <HederaDappConnectorProvider> and <HederaDappConnectorLoader> as ancestors of the components you call useHashConnect() in.`
});

interface HederaDappConnectorSession {
  /** the currently selected account id to use for all operations */
  userAccountId: AccountId;
  /** the evm address of the currently selected account id */
  userAccountEvmAddress: `0x${string}`;
  ledgerId: LedgerId;
}
const hederaDappConnectorSessionContext = createContext<HederaDappConnectorSession | null>(null);
export const OptionalHederaDappConnectorSessionConsumer = hederaDappConnectorSessionContext.Consumer;
export const HederaDappConnectorSessionConsumer = getConsumer(hederaDappConnectorSessionContext, {
  errorMessage: `the dapp connector session hasn't been set in the context. make sure you have <HederaDappConnectorProvider> and <HederaDappConnectorSessionLoader> as ancestors of this <HederaDappConnectorSessionConsumer>.`
});
export const HederaDappConnectorSessionLoader = getLoader(hederaDappConnectorSessionContext);
export const useOptionalHederaDappConnectorSession = getOptionalHook(
  hederaDappConnectorSessionContext
);
export const useHederaDappConnectorSession = getHook(hederaDappConnectorSessionContext, {
  errorMessage: `the dapp connector session hasn't been set in the context. make sure you have <HederaDappConnectorProvider> and <HederaDappConnectorSessionLoader> as ancestors of the components you call useHederaDappConnectorSession() in.`
});

const hederaDappConnectorConnectionStateContext = createContext(
  HashConnectConnectionState.Disconnected
);
export const useHederaDappConnectorConnectionState = () =>
  useContext(hederaDappConnectorConnectionStateContext);
export const HederaDappConnectorConnectionStateConsumer =
  hederaDappConnectorConnectionStateContext.Consumer;
const getAccountEvmAddress = async (options: { accountIdString: string; chain: HederaChain }) => {
  let accountEvmAddress: Address | undefined = undefined;
  try {
    // TODO: handle all chains
    const response = await fetch(`${options.chain.apiBaseUrl}/accounts/${options.accountIdString}`);
    const json: { evm_address: Address } = await response.json();

    accountEvmAddress = json.evm_address;
  } catch (error) {
    // shh eslint
    console.error(
      `unable to fetch evm address of account id ${JSON.stringify(options.accountIdString)}.`,
      error
    );
  }
  return accountEvmAddress;
};
export const HederaDappConnectorProvider: React.FC<{ walletConnectProjectId: string }> = props => {
  const [dappConnector, setHederaDappConnector] = useState<DAppConnector | null>(null);
  const [session, setSession] = useState<HederaDappConnectorSession | null>(null);
  const [connectionState, setConnectionState] = useState<HashConnectConnectionState>(
    HashConnectConnectionState.Disconnected
  );
  const [dappConnectorError, setDappConnectorError] = useState<Error | null>(null);
  const selectedChain = useSelectedChain();

  const initializeDappConnector = async (options: {
    walletConnectProjectId: string;
    ledgerId: LedgerId;
    enabledChainIds: HederaChainId[];
  }) => {
    const dappConnector = new DAppConnector(
      appMetadata,
      options.ledgerId,
      options.walletConnectProjectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      options.enabledChainIds
    );
    dappConnector.onSessionIframeCreated = async sessionStruct => {
      const extendedSession = await getSessionFromStruct(sessionStruct);
      setSession(extendedSession);
    };

    const logger = import.meta.env.DEV ? "debug" : "error";
    await dappConnector.init({ logger });

    // check existing connections
    if (dappConnector.signers.length) {
      const signer = dappConnector.signers[0];
      const userAccountId = signer.getAccountId();
      const ledgerId = signer.getLedgerId();
      const chain = getChainFromLedgerId(ledgerId);
      const userAccountEvmAddress = await getAccountEvmAddress({
        accountIdString: userAccountId.toString(),
        chain
      });
      if (userAccountEvmAddress) {
        const session: HederaDappConnectorSession = {
          userAccountId,
          userAccountEvmAddress,
          ledgerId
        };
        setSession(session);
      }
    }

    const walletConnectClient = dappConnector.walletConnectClient;
    const onSessionDelete = () => {
      setSession(null);
    };
    walletConnectClient?.on("session_delete", onSessionDelete);

    const destroy = () => {
      dappConnector.onSessionIframeCreated = null;
      walletConnectClient?.off("session_delete", onSessionDelete);

      setHederaDappConnector(null);
      setSession(null);
      setConnectionState(HashConnectConnectionState.Disconnected);
      setDappConnectorError(null);
    };

    return {
      dappConnector,
      destroy
    };
  };

  const enabledChainIds = useEnabledChainIds();
  useEffect(() => {
    let destroyEffect: () => void = () => undefined;

    const effect = async () => {
      try {
        destroyEffect();
        destroyEffect = () => {
          destroy();
        };

        const enabledHederaChainIds = enabledChainIds.map(chainId => {
          return getHederaChainId(chainId);
        });
        const { dappConnector, destroy } = await initializeDappConnector({
          walletConnectProjectId: props.walletConnectProjectId,
          ledgerId: selectedChain.ledgerId,
          enabledChainIds: enabledHederaChainIds
        });

        setHederaDappConnector(dappConnector);
      } catch (error: unknown) {
        setHederaDappConnector(null);
        setDappConnectorError(error as Error);
      }
    };

    effect();

    return destroyEffect;
  }, [props.walletConnectProjectId, selectedChain, enabledChainIds]);

  const hederaDappConnectorContextValue = useMemo<HederaDappConnectorContext | null>(() => {
    if (!dappConnector) {
      return null;
    }

    const connect = async (extensionId?: string) => {
      if (extensionId) {
        localStorage.clear();
        const sessionStruct = await dappConnector.connectExtension(extensionId);
        const extendedSession = await getSessionFromStruct(sessionStruct);
        setSession(extendedSession);
        return;
      }

      const sessionStruct = await dappConnector.openModal();
      const extendedSession = await getSessionFromStruct(sessionStruct);
      setSession(extendedSession);
    };

    const disconnect = async () => {
      await dappConnector.disconnectAll();
      setSession(null);
    };

    const contextValue: HederaDappConnectorContext = {
      dappConnector,
      connect,
      disconnect
    };

    return contextValue;
  }, [dappConnector]);

  if (dappConnectorError) {
    return (
      <AppError
        error={dappConnectorError}
        heading={"Something went wrong"}
        infoText={"Couldn't connect to your Hedera wallet. Please reload the page."}
      />
    );
  }

  return (
    <hederaDappConnectorContext.Provider value={hederaDappConnectorContextValue}>
      <hederaDappConnectorConnectionStateContext.Provider value={connectionState}>
        <hederaDappConnectorSessionContext.Provider value={session}>
          {props.children}
        </hederaDappConnectorSessionContext.Provider>
      </hederaDappConnectorConnectionStateContext.Provider>
    </hederaDappConnectorContext.Provider>
  );
};
