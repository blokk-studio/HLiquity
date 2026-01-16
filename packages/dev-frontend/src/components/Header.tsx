/** @jsxImportSource theme-ui */
import React, { useState, useRef, useEffect } from "react";
import { LiquityStoreState } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";
import { Container, Button } from "theme-ui";
import { AddressZero } from "@ethersproject/constants";
import { useLiquity } from "../hooks/LiquityContext";
import clsx from "clsx";

import { LiquityLogo } from "./LiquityLogo";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { UserAccount } from "./UserAccount";
import { Nav } from "./Nav";
import { Icon } from "./Icon";
import styles from "./HeaderMobile.module.css";
import { Link } from "./Link.tsx";
import { SystemStatsPopup } from "./SystemStatsPopup.tsx";

const logoHeight = "32px";

const select = ({ frontend }: LiquityStoreState) => ({
  frontend
});

export const Header: React.FC = () => {
  const {
    liquity: {
      connection: { frontendTag }
    }
  } = useLiquity();
  const { frontend } = useLiquitySelector(select);
  const isFrontendRegistered = frontendTag === AddressZero || frontend.status === "registered";

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // slide-in animation
  useEffect(() => {
    if (isMenuOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimatingIn(true);
        });
      });
    } else {
      setIsAnimatingIn(false);
    }
  }, [isMenuOpen]);

  // close animation
  const handleCloseMenu = () => {
    setIsAnimatingIn(false);
    closeTimeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false);
    }, 300);
  };

  // close on esc key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMenuOpen) {
        handleCloseMenu();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMenuOpen]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <Container variant="header" className={styles.header}>
        <div className={styles.headerContent}>
          <LiquityLogo height={logoHeight} />

          <Link to="/" variant="logoLink">
            Hliquity
          </Link>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.desktopUserAccount}>
            <UserAccount />
          </div>

          <SystemStatsPopup />

          <ThemeSwitcher />

          {isFrontendRegistered && (
            <Button
              variant="icon"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open menu"
              className={styles.menuButton}
            >
              <Icon name="bars" />
            </Button>
          )}
        </div>
      </Container>

      {isMenuOpen && (
        <>
          <div
            ref={overlayRef}
            onClick={(e) => {
              if (e.target === overlayRef.current) {
                handleCloseMenu();
              }
            }}
            className={clsx(styles.overlay, isAnimatingIn && styles.animatingIn)}
          />
          <div className={clsx(styles.menuPanel, isAnimatingIn && styles.animatingIn)}>
            <div className={styles.menuHeader}>
              <UserAccount />
              <Button
                variant="icon"
                onClick={handleCloseMenu}
                aria-label="Close menu"
              >
                <Icon name="times" />
              </Button>
            </div>

            <Nav onLinkClick={handleCloseMenu} className={styles.menuNav} />
          </div>
        </>
      )}
    </>
  );
};
