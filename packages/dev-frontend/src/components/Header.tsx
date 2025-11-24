/** @jsxImportSource theme-ui */
import React from "react";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { Container, Flex, Box } from "theme-ui";
import { AddressZero } from "@ethersproject/constants";
import { useLiquity } from "../hooks/LiquityContext";

import { LiquityLogo } from "./LiquityLogo";
import { SideNav } from "./SideNav";
import { Link } from "./Link";

const logoHeight = "32px";

const select = ({ frontend }: LiquityStoreState) => ({
  frontend
});

export const Header: React.FC = ({ children }) => {
  const {
    liquity: {
      connection: { frontendTag }
    }
  } = useLiquity();
  const { frontend } = useLiquitySelector(select);
  const isFrontendRegistered = frontendTag === AddressZero || frontend.status === "registered";

  return (
    <Container variant="header">
      <Flex sx={{ alignItems: "center", flex: 1 }}>
        <LiquityLogo height={logoHeight} />

        <Box
          sx={{
            mx: [2, 3],
            width: "0px",
            height: "100%",
            borderLeft: ["none", "none", "1px solid lightgrey"]
          }}
        />
        {isFrontendRegistered && (
          <>
            <nav sx={{ display: ["none", "none", "block"] }}>
              <Flex>
                <Link to="/" variant="logoLink">
                  Hliquity
                </Link>
              </Flex>
            </nav>
            <SideNav />
          </>
        )}
      </Flex>

      {children}
    </Container>
  );
};
