/** @jsxImportSource theme-ui */
import React, { useState, useRef } from "react";
import { Button, Container, Flex } from "theme-ui";
import { Icon } from "./Icon";
import { LiquityLogo } from "./LiquityLogo";
import { Nav } from "./Nav";

const logoHeight = "32px";

export const SideNav: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);

  if (!isVisible) {
    return (
      <Button
        sx={{ display: ["flex", "flex", "none"] }}
        variant="icon"
        onClick={() => setIsVisible(true)}
      >
        <Icon name="bars" size="lg" />
      </Button>
    );
  }
  return (
    <Container
      variant="infoOverlay"
      ref={overlay}
      onClick={e => {
        if (e.target === overlay.current) {
          setIsVisible(false);
        }
      }}
    >
      <Flex variant="layout.sidenav">
        <Button
          sx={{ position: "fixed", right: "25vw", m: 1 }}
          variant="icon"
          onClick={() => setIsVisible(false)}
        >
          <Icon name="times" size="2x" />
        </Button>
        <LiquityLogo height={logoHeight} p={2} />
        <Nav
          onLinkClick={() => {
            console.debug("click");
            setIsVisible(false);
          }}
          sx={{
            px: 3,
            py: 2
          }}
        />
      </Flex>
    </Container>
  );
};
