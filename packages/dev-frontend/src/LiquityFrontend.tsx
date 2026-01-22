/** @jsxImportSource theme-ui */
import React from "react";
import { Container, Box } from "theme-ui";
import { HashRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { Wallet } from "@ethersproject/wallet";

import { Decimal, Difference, Trove } from "@liquity/lib-base";

import { useLiquity } from "./hooks/LiquityContext";
import { TransactionMonitor } from "./components/Transaction";
import { Header } from "./components/Header";

import { PageSwitcher } from "./pages/PageSwitcher";
import { RiskyTrovesPage } from "./pages/RiskyTrovesPage";

import { TroveViewProvider } from "./components/Trove/context/TroveViewProvider";
import { StabilityViewProvider } from "./components/Stability/context/StabilityViewProvider";
import { StakingViewProvider } from "./components/Staking/context/StakingViewProvider";
import "tippy.js/dist/tippy.css"; // Tooltip default style

import { Footer } from "./components/Footer";
import { AutomaticDevelopmentDebugMenu } from "./components/DevelopmentDebugMenu";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { ImprintPage } from "./pages/ImprintPage";
import ScrollToTop from "./components/ScrollToTop";
import { ComponentTree } from "./components/ComponentTree";
import { DisclaimerPage } from "./pages/DisclaimerPage.tsx";
import { RedemptionsPage } from "./pages/RedemptionsPage.tsx";
import { Nav } from "./components/Nav.tsx";
import { Trove as TrovePage } from "./components/Trove/Trove.tsx";
import { RedeemHchf } from "./components/RedeemHchf/RedeemHchf.tsx";
import { Stability } from "./components/Stability/Stability.tsx";
import { Staking } from "./components/Staking/Staking.tsx";
import { SystemStats } from "./components/SystemStats.tsx";

const useShouldShowSystemStats = () => {
  const location = useLocation();
  return !["/redemptions", "/imprint", "/disclaimer", "/privacy-policy"].includes(location.pathname);
};

const ConditionalSystemStats: React.FC = () => {
  const shouldShowSystemStats = useShouldShowSystemStats();

  return shouldShowSystemStats ? <SystemStats /> : null;
};

const ConditionalLayoutBox: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const shouldShowSystemStats = useShouldShowSystemStats();

  return (
    <Box
      role="presentation"
      sx={{
        display: "grid",
        gridTemplateColumns: shouldShowSystemStats
          ? ["1fr", "1fr", "1fr", "240px 1fr 320px"]
          : ["1fr", "1fr", "1fr", "250px 1fr"],
        columnGap: [0, 0, 0, 3, 4]
      }}
    >
      {children}
    </Box>
  );
};

export const LiquityFrontend: React.FC = () => {
  const { account: accountAddress, liquity } = useLiquity();

  // For console tinkering ;-)
  Object.assign(window, {
    account: accountAddress,
    liquity,
    Trove,
    Decimal,
    Difference,
    Wallet
  });

  return (
    <>
      <ComponentTree
        renderers={[
          children => <Router>{children}</Router>,
          children => <TroveViewProvider>{children}</TroveViewProvider>,
          children => <StabilityViewProvider>{children}</StabilityViewProvider>,
          children => <StakingViewProvider>{children}</StakingViewProvider>,
          children => <StabilityViewProvider>{children}</StabilityViewProvider>
        ]}
      >
        <Header />

        <Container
          variant="main"
          sx={{
            paddingTop: 4
          }}
        >
          <PageSwitcher>
            <ScrollToTop />

            <ConditionalLayoutBox>
              <Nav
                sx={{
                  display: ["none", "none", "none", "grid"]
                }}
              />
              <Routes>
                <Route path="/risky-troves" element={<RiskyTrovesPage />} />
                <Route path="/" element={<TrovePage />} />
                <Route path="/redeem" element={<RedeemHchf />} />
                <Route path="/stability" element={<Stability />} />
                <Route path="/staking" element={<Staking />} />
                <Route path="/redemptions" element={<RedemptionsPage />} />

                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/imprint" element={<ImprintPage />} />
                <Route path="/disclaimer" element={<DisclaimerPage />} />
              </Routes>

              <ConditionalSystemStats />
            </ConditionalLayoutBox>
          </PageSwitcher>
        </Container>

        <Footer />
      </ComponentTree>

      <TransactionMonitor />
      <AutomaticDevelopmentDebugMenu />
    </>
  );
};
