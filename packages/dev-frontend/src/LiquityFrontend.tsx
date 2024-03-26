/** @jsxImportSource theme-ui */
import React, { useMemo, useState } from "react";
import { Flex, Container, Button, Paragraph, Heading, Spinner } from "theme-ui";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { Wallet } from "@ethersproject/wallet";

import { Decimal, Difference, Trove } from "@liquity/lib-base";
import { LiquityStoreProvider } from "@liquity/lib-react";

import { useLiquity } from "./hooks/LiquityContext";
import { TransactionMonitor } from "./components/Transaction";
import { UserAccount } from "./components/UserAccount";
import { SystemStatsPopup } from "./components/SystemStatsPopup";
import { Header } from "./components/Header";

import { PageSwitcher } from "./pages/PageSwitcher";
import { RiskyTrovesPage } from "./pages/RiskyTrovesPage";

import { TroveViewProvider } from "./components/Trove/context/TroveViewProvider";
import { StabilityViewProvider } from "./components/Stability/context/StabilityViewProvider";
import { StakingViewProvider } from "./components/Staking/context/StakingViewProvider";
import "tippy.js/dist/tippy.css"; // Tooltip default style
import { BondsProvider } from "./components/Bonds/context/BondsProvider";
import { useAccount, useSigner } from "wagmi";

import { Signer as EthersSigner, Contract } from "ethers";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { Icon } from "./components/Icon";
import { TokenId } from "@hashgraph/sdk";
import { useHederaChain } from "./hedera/wagmi-chains";
import { Imprint } from "./components/Imprint";

type LiquityFrontendProps = {
  loader?: React.ReactNode;
};

const associateToken = async (options: { signer: EthersSigner; tokenAddress: string }) => {
  const abi = [`function associate()`, `function dissociate()`];
  const gasLimit = 1000000;

  try {
    const associationContract = new Contract(options.tokenAddress, abi, options.signer);
    const associationTransaction: TransactionResponse = await associationContract.associate({
      gasLimit: gasLimit
    });
    const associationReceipt = await associationTransaction.wait();
    return associationReceipt;
  } catch (error: unknown) {
    const errorMessage = `couldn't associate token ${JSON.stringify(options.tokenAddress)}`;
    console.error(errorMessage, error);
    throw new Error(errorMessage, { cause: error });
  }
};

interface HederaApiToken {
  token_id: `0.0.${string}`;
}
interface HederaApiTokensData {
  tokens: HederaApiToken[];
}
interface HederaToken {
  id: `0.0.${string}`;
}

const fetchTokens = async (options: { apiBaseUrl: string; accountAddress: `0x${string}` }) => {
  const accountAddressUrlSegment = options.accountAddress.replace(/^0x/, "");
  // TODO: get api endpoint based on chain id
  const response = await fetch(`${options.apiBaseUrl}/accounts/${accountAddressUrlSegment}/tokens`, {
    method: "GET",
    headers: {}
  });

  if (!response.ok) {
    const responseText = await response.text();
    const errorMessage = `tokens api responded with ${response.status}: \`${responseText}\``;
    console.error(errorMessage, { responseText, response });
    throw errorMessage;
  }

  const data: HederaApiTokensData = await response.json();

  const tokens = data.tokens.map(tokenData => {
    const id = tokenData.token_id;
    const token = {
      id
    };

    return token;
  });

  return tokens;
};

export const LiquityFrontend: React.FC<LiquityFrontendProps> = ({ loader }) => {
  const { account: accountAddress, provider, liquity, config } = useLiquity();
  const signerResult = useSigner();
  const account = useAccount();
  const hederaChain = useHederaChain();
  const [tokens, setTokens] = useState<HederaToken[]>([]);
  const [isConsentOverridden, setIsConsentOverridden] = useState(false);
  const [tokensApiError, setTokensApiError] = useState<Error | null>(null);
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
      setTokensApiError(error as Error);
    }
  }, [account.address, hederaChain]);

  const hchfTokenId = TokenId.fromSolidityAddress(config.hchfTokenId).toString();
  const hasAssociatedWithHchf = tokens.some(token => {
    const isHchf = token.id === hchfTokenId;
    return isHchf;
  });
  const hlqtTokenId = TokenId.fromSolidityAddress(config.hlqtTokenId).toString();
  const hasAssociatedWithHlqty = tokens.some(token => {
    const isHlqty = token.id === hlqtTokenId;
    return isHlqty;
  });
  const hasConsentedToAll =
    isConsentOverridden || [hasAssociatedWithHchf, hasAssociatedWithHlqty].every(consent => consent);

  // TODO: move consent to separate component
  const [isLoadingHchfAssociation, setIsLoadingHchfAssociation] = useState(false);
  const associateHchf = async () => {
    setIsLoadingHchfAssociation(true);
    try {
      if (!signerResult.data) {
        throw new Error(
          `need \`liquity.connection.signer\` to be defined to sign token association transactions`
        );
      }
      const signer = signerResult.data;

      await associateToken({ tokenAddress: config.hchfTokenId, signer });

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
    } catch {
      // eslint
    }
    setIsLoadingHchfAssociation(false);
  };

  const [isLoadingHlqtyAssociation, setIsLoadingHlqtyAssociation] = useState(false);
  const associateHlqty = async () => {
    setIsLoadingHlqtyAssociation(true);
    try {
      if (!signerResult.data) {
        throw new Error(
          `need \`liquity.connection.signer\` to be defined to sign token association transactions`
        );
      }
      const signer = signerResult.data;

      await associateToken({ tokenAddress: config.hlqtTokenId, signer });

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
    } catch {
      // eslint
    }
    setIsLoadingHlqtyAssociation(false);
  };

  // For console tinkering ;-)
  Object.assign(window, {
    account: accountAddress,
    provider,
    liquity,
    Trove,
    Decimal,
    Difference,
    Wallet
  });

  return (
    <LiquityStoreProvider {...{ loader }} store={liquity.store}>
      {!hasConsentedToAll ? (
        <Flex
          sx={{
            flexDirection: "column",
            minHeight: "100%",
            justifyContent: "center",
            marginInline: "clamp(2rem, 100%, 50% - 16rem)"
          }}
        >
          <Heading>Consent to HLiquity</Heading>

          <Paragraph sx={{ marginTop: "1rem" }}>
            You have to associate with HLiquity tokens and approve HLiquity contracts before you can
            use HLiquity.
          </Paragraph>

          <Flex
            sx={{
              marginTop: "2rem",
              flexDirection: "column",
              minHeight: "100%",
              gap: "1rem",
              justifyContent: "center"
            }}
          >
            <Button
              disabled={isLoadingHchfAssociation || hasAssociatedWithHchf}
              onClick={associateHchf}
              variant={hasAssociatedWithHchf ? "success" : "primary"}
              sx={{
                gap: "1rem"
              }}
            >
              <span>Consent to receiving HCHF</span>
              {hasAssociatedWithHchf && <Icon name="check" />}
              {isLoadingHchfAssociation && <Spinner size="1rem" color="inherit" />}
            </Button>

            <Button
              disabled={isLoadingHlqtyAssociation || hasAssociatedWithHlqty}
              onClick={associateHlqty}
              variant={hasAssociatedWithHlqty ? "success" : "primary"}
              sx={{
                gap: "1rem"
              }}
            >
              <span>Consent to receiving HLQT</span>
              {hasAssociatedWithHlqty && <Icon name="check" />}
              {isLoadingHlqtyAssociation && <Spinner size="1rem" color="inherit" />}
            </Button>
          </Flex>

          {tokensApiError && (
            <>
              <Heading sx={{ marginTop: "4rem", color: "danger" }}>
                Couldn't check your associations
              </Heading>

              <Paragraph sx={{ marginTop: "1rem", color: "danger" }}>
                Something went wrong while fetching which tokens you're associated with. Continuing
                without consent will cause transactions to fail.
              </Paragraph>

              <Button
                onClick={() => {
                  setIsConsentOverridden(true);
                }}
                variant="danger"
                sx={{ marginTop: "2rem" }}
              >
                Continue anyway
              </Button>
            </>
          )}
        </Flex>
      ) : (
        <Router>
          <TroveViewProvider>
            <StabilityViewProvider>
              <StakingViewProvider>
                <BondsProvider>
                  <Flex sx={{ flexDirection: "column", minHeight: "100%" }}>
                    <Header>
                      <UserAccount />
                      <SystemStatsPopup />
                    </Header>

                    <Container
                      variant="main"
                      sx={{
                        display: "flex",
                        flexGrow: 1,
                        flexDirection: "column",
                        alignItems: "center"
                      }}
                    >
                      <Switch>
                        <Route path="/" exact>
                          <PageSwitcher />
                        </Route>
                        <Route path="/risky-troves">
                          <RiskyTrovesPage />
                        </Route>
                      </Switch>
                    </Container>
                  </Flex>
                </BondsProvider>
              </StakingViewProvider>
            </StabilityViewProvider>
          </TroveViewProvider>
        </Router>
      )}

      <footer sx={{ marginInline: "clamp(2rem, 100%, 50% - 38rem)", paddingBottom: "2rem" }}>
        <Imprint />
      </footer>

      <TransactionMonitor />
    </LiquityStoreProvider>
  );
};
