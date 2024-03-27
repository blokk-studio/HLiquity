import { createContext, useContext, useMemo, useState } from "react";
import { BigNumber } from "ethers";
import { useHederaChain } from "./wagmi-chains";
import { useAccount, useSigner } from "wagmi";
import { useLiquity } from "../hooks/LiquityContext";
import { TokenId } from "@hashgraph/sdk";
import { fetchTokens } from "./mirrornode";
import { approveSpender, associateWithToken, dissociateFromToken } from "./consent";

interface HederaContext {
  approveSpender: (options: { contractAddress: `0x${string}`; tokenAddress: `0x${string}`; amount: BigNumber }) => Promise<void>;
  associateWithToken: (options: { tokenAddress: `0x${string}` }) => Promise<void>;
  dissociateFromToken: (options: { tokenAddress: `0x${string}` }) => Promise<void>;
  hasAssociatedWithHchf: boolean;
  hasAssociatedWithHlqt: boolean;
}

const noOp = async () => undefined;
const hederaContext = createContext<HederaContext>({
  approveSpender: noOp,
  associateWithToken: noOp,
  dissociateFromToken: noOp,
  hasAssociatedWithHchf: false,
  hasAssociatedWithHlqt: false
});

export const useHedera = () => {
  return useContext(hederaContext);
};

interface HederaToken {
  id: `0.0.${string}`;
}

export const HederaTokensProvider: React.FC = ({ children }) => {
  const { config } = useLiquity();
  const signerResult = useSigner();
  const account = useAccount();
  const hederaChain = useHederaChain();
  const [tokens, setTokens] = useState<HederaToken[]>([]);
  // const [tokensApiError, setTokensApiError] = useState<Error | null>(null);
  useMemo(async () => {
    if (!account.address) {
      return;
    }

    if (!hederaChain) {
      return;
    }

    try {
      const tokens = await fetchTokens({
        apiBaseUrl: hederaChain.apiBaseUrl,
        accountAddress: account.address
      });

      setTokens(tokens);
    } catch (error: unknown) {
      // setTokensApiError(error as Error);
    }
  }, [account.address, hederaChain]);

  const hchfTokenId = TokenId.fromSolidityAddress(config.hchfTokenId).toString();
  const hasAssociatedWithHchf = tokens.some(token => {
    const isHchf = token.id === hchfTokenId;
    return isHchf;
  });
  const hlqtTokenId = TokenId.fromSolidityAddress(config.hlqtTokenId).toString();
  const hasAssociatedWithHlqt = tokens.some(token => {
    const isHlqt = token.id === hlqtTokenId;
    return isHlqt;
  });

  const associateWithTokenWithContext: HederaContext["associateWithToken"] = async options => {
    if (!signerResult.data) {
      throw new Error(
        `need \`liquity.connection.signer\` to be defined to sign token association transactions`
      );
    }
    const signer = signerResult.data;

    await associateWithToken({ ...options, signer });

    if (!account.address) {
      console.warn(
        "need an account address to update the account info. refresh the page to get up-to-date (token) info."
      );
      return;
    }

    if (!hederaChain) {
      console.warn(
        "need a hedera chain to update the account info. refresh the page to get up-to-date (token) info."
      );
      return;
    }

    const tokens = await fetchTokens({
      apiBaseUrl: hederaChain.apiBaseUrl,
      accountAddress: account.address
    });

    setTokens(tokens);
  };

  const dissociateFromTokenWithContext: HederaContext["dissociateFromToken"] = async options => {
    if (!signerResult.data) {
      throw new Error(
        `need \`liquity.connection.signer\` to be defined to sign token association transactions`
      );
    }
    const signer = signerResult.data;

    await dissociateFromToken({ ...options, signer });

    if (!account.address) {
      console.warn(
        "need an account address to update the account info. refresh the page to get up-to-date (token) info."
      );
      return;
    }

    if (!hederaChain) {
      console.warn(
        "need a hedera chain to update the account info. refresh the page to get up-to-date (token) info."
      );
      return;
    }

    const tokens = await fetchTokens({
      apiBaseUrl: hederaChain.apiBaseUrl,
      accountAddress: account.address
    });

    setTokens(tokens);
  };

  const approveSpenderWithContext: HederaContext["approveSpender"] = async options => {
    if (!signerResult.data) {
      throw new Error(
        `need \`liquity.connection.signer\` to be defined to sign token association transactions`
      );
    }
    const signer = signerResult.data;

    await approveSpender({ ...options, signer });
  };


  return (
    <hederaContext.Provider
      value={{
        associateWithToken: associateWithTokenWithContext,
        dissociateFromToken: dissociateFromTokenWithContext,
        approveSpender: approveSpenderWithContext,
        hasAssociatedWithHchf,
        hasAssociatedWithHlqt,
      }}
    >
      {children}
    </hederaContext.Provider>
  );
};
