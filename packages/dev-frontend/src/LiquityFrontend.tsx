import React from "react";
import { Flex, Container } from "theme-ui";
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
import { Bonds } from "./pages/Bonds";

import { TroveViewProvider } from "./components/Trove/context/TroveViewProvider";
import { StabilityViewProvider } from "./components/Stability/context/StabilityViewProvider";
import { StakingViewProvider } from "./components/Staking/context/StakingViewProvider";
import "tippy.js/dist/tippy.css"; // Tooltip default style
import { BondsProvider } from "./components/Bonds/context/BondsProvider";
import { useSigner } from 'wagmi'

import { Signer as EthersSigner, Contract } from 'ethers'
import { TransactionResponse } from "@ethersproject/abstract-provider";

type LiquityFrontendProps = {
  loader?: React.ReactNode;
};


const associateToken = async (options: { signer: EthersSigner, tokenAddress: string }) => {
  const signer = options.signer
  const abi = [`function associate()`, `function dissociate()`];
  const gasLimit = 1000000;

  try {
    const associationContract = new Contract(options.tokenAddress, abi, signer);
    const associationTransaction: TransactionResponse = await associationContract.associate({ gasLimit: gasLimit });
    const associationReceipt = await associationTransaction.wait();
    return associationReceipt
  } catch (error: unknown) {
    const errorMessage = `couldn't associate token ${JSON.stringify(options.tokenAddress)}`
    console.error(errorMessage, error)
    throw new Error(errorMessage, { cause: error })
  }
}

export const LiquityFrontend: React.FC<LiquityFrontendProps> = ({ loader }) => {
  const { account, provider, liquity, config } = useLiquity();
  const signerResult = useSigner()

  const associate = async () => {
    if(!signerResult.data) {
      throw new Error(`need \`liquity.connection.signer\` to be defined to sign token association transactions`)
    }
    const signer = signerResult.data

    await associateToken({ tokenAddress: config.hchfTokenId, signer })
    await associateToken({ tokenAddress: config.hlqtyTokenId, signer })
  }

  // For console tinkering ;-)
  Object.assign(window, {
    account,
    provider,
    liquity,
    Trove,
    Decimal,
    Difference,
    Wallet
  });

  return (
    <LiquityStoreProvider {...{ loader }} store={liquity.store}>
      <Router>
        <TroveViewProvider>
          <StabilityViewProvider>
            <StakingViewProvider>
              <BondsProvider>
                <button onClick={associate}>associate with HCHF & HLQTY</button>
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
                      <Route path="/bonds">
                        <Bonds />
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
      <TransactionMonitor />
    </LiquityStoreProvider>
  );
};
