/** @jsxImportSource theme-ui */
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

import { TroveViewProvider } from "./components/Trove/context/TroveViewProvider";
import { StabilityViewProvider } from "./components/Stability/context/StabilityViewProvider";
import { StakingViewProvider } from "./components/Staking/context/StakingViewProvider";
import "tippy.js/dist/tippy.css"; // Tooltip default style
import { BondsProvider } from "./components/Bonds/context/BondsProvider";

import { Imprint } from "./components/Imprint";
import { DeploymentEnvironmentGenerator } from "./pages/DeploymentEnvironmentGenerator";

type LiquityFrontendProps = {
  loader?: React.ReactNode;
};

export const LiquityFrontend: React.FC<LiquityFrontendProps> = ({ loader }) => {
  const { account: accountAddress, provider, liquity } = useLiquity();

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
      {
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
                        {import.meta.env.DEV && (
                          <Route path="/deployment-environment-generator">
                            <DeploymentEnvironmentGenerator />
                          </Route>
                        )}
                      </Switch>
                    </Container>
                  </Flex>
                </BondsProvider>
              </StakingViewProvider>
            </StabilityViewProvider>
          </TroveViewProvider>
        </Router>
      }

      <footer sx={{ marginInline: "clamp(2rem, 100%, 50% - 38rem)", paddingBottom: "2rem" }}>
        <Imprint />
      </footer>

      <TransactionMonitor />
    </LiquityStoreProvider>
  );
};
