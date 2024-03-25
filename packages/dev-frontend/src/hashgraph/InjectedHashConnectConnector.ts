import { InjectedConnector } from "wagmi/connectors/injected";
import { Chain } from "wagmi/chains";
import { Address } from "@wagmi/core";
import { DappMetadata, HashConnect, HashConnectConnectionState, SessionData } from "hashconnect";
import { LedgerId, AccountId } from "@hashgraph/sdk";
import { testnet, previewnet, mainnet } from "../hedera/wagmi-chains";

export class HashConnectConnector extends InjectedConnector {
  public id = "hashconnect";
  public name = "HashConnect";
  private hashConnect: HashConnect | null = null;
  private state: HashConnectConnectionState = HashConnectConnectionState.Disconnected;
  // private sessionData: SessionData | null;
  private chain: Chain = mainnet;
  private walletConnectProjectId: string;
  private appMetadata: DappMetadata;
  private debugHashConnect: boolean;

  constructor(walletConnectProjectId: string, appMetadata: DappMetadata, debugHashConnect = false) {
    super({ chains: [testnet, previewnet, mainnet], options: {} });

    this.walletConnectProjectId = walletConnectProjectId;
    this.appMetadata = appMetadata;
    this.debugHashConnect = debugHashConnect;
  }

  async connect(options?: { chainId?: number }) {
    let ledgerId = LedgerId.TESTNET;
    if (options?.chainId === testnet.id) {
      ledgerId = LedgerId.TESTNET;
    }
    if (options?.chainId === previewnet.id) {
      ledgerId = LedgerId.PREVIEWNET;
    }
    if (options?.chainId === mainnet.id) {
      ledgerId = LedgerId.MAINNET;
    }
    const hashConnect = new HashConnect(
      ledgerId,
      this.walletConnectProjectId,
      this.appMetadata,
      this.debugHashConnect
    );
    hashConnect.connectionStatusChangeEvent.on(newState => {
      this.state = newState;
    });
    // hashConnect.pairingEvent.on(newSessionData => {
    //   this.sessionData = newSessionData;
    // });
    // hashConnect.disconnectionEvent.on(() => {
    //   this.sessionData = null;
    // });
    await hashConnect.init();

    const sessionData = await new Promise<SessionData>(resolve => {
      const resolveOnSessionData = (sessionData: SessionData | null) => {
        if (!sessionData) {
          return;
        }

        hashConnect.pairingEvent.off(resolveOnSessionData);
        resolve(sessionData);
      };

      hashConnect.pairingEvent.on(resolveOnSessionData);
    });
    this.hashConnect = hashConnect;

    const accountIdString = sessionData.accountIds[0];
    const accountId = AccountId.fromString(accountIdString);
    const account = accountId.toSolidityAddress() as Address;
    const supportedChain = this.chains.find(
      supportedChain => supportedChain.id === options?.chainId
    );
    const defaultChain = this.chains[0];
    const chain = {
      id: supportedChain?.id ?? defaultChain.id,
      unsupported: !supportedChain
    };
    const connectorData: {
      account: Address;
      chain: { id: number; unsupported: boolean };
      provider: void;
    } = {
      account,
      chain,
      provider: undefined
    };

    return connectorData;
  }

  async disconnect(): Promise<void> {
    await this.hashConnect?.disconnect();
  }

  async getAccount(): Promise<`0x${string}`> {
    const address = this.hashConnect?.connectedAccountIds[0].toSolidityAddress() as Address;

    return address;
  }

  async getChainId(): Promise<number> {
    return this.chain.id;
  }

  async getProvider() {
    return {};
  }

  async getSigner(): Promise<any> {
    if (!this.hashConnect) {
      return;
    }

    const account = this.hashConnect.connectedAccountIds[0];
    return this.hashConnect.getSigner(account);
  }

  async isAuthorized(): Promise<boolean> {
    return this.state === HashConnectConnectionState.Paired;
  }

  protected onAccountsChanged(accounts: `0x${string}`[]): void {
    // TODO:
    console.debug({ onAccountsChanged: accounts });
  }

  protected onChainChanged(chain: string | number): void {
    // TODO: remove all event listeners, create new hashconnect instance, add new event listeners
    console.debug({ onChainChanged: chain });
  }

  protected onDisconnect(error: Error): void {
    // TODO: remove all event listeners, unset hashconnect instance
    console.debug({ onDisconnect: error });
  }
}
