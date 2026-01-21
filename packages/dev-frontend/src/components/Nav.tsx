import { Box } from "theme-ui";
import { Link } from "./Link";
import { useLocation } from "react-router-dom";
import { FC, MouseEventHandler, useMemo, useState, useRef, useCallback } from "react";
import styles from "./Nav.module.css";
import clsx from "clsx";
import SecurityWarning from "../icons/SecurityWarning.svg?react";
import LowProtection from "../icons/LowProtection.svg?react";
import Swap from "../icons/Swap.svg?react";
import Atom from "../icons/Atom.svg?react";
import Coin from "../icons/Coin.svg?react";
import Rotation from "../icons/Rotation.svg?react";

const links = [
  {
    link: "/",
    icon: <LowProtection aria-hidden="true" />,
    label: 'Trove'
  },
  {
    link: "/risky-troves",
    icon: <SecurityWarning aria-hidden="true" />,
    label: 'Risky Troves'
  },
  {
    link: "/redeem",
    icon: <Swap aria-hidden="true" />,
    label: 'Redeem'
  },
  {
    link: "/stability",
    icon: <Atom aria-hidden="true" />,
    label: 'Stability Pool'
  },
  {
    link: "/staking",
    icon: <Coin aria-hidden="true" />,
    label: 'Staking'
  },
  {
    link: "/redemptions",
    icon: <Rotation aria-hidden="true" />,
    label: 'Redemptions'
  }
]

const NavLink: FC<Parameters<typeof Link>[0]> = props => {
  const location = useLocation();
  const isActive = useMemo(() => {
    return location.pathname === props.to;
  }, [location.pathname, props.to]);

  return (
    <Link {...props} to={props.to} className={clsx(styles.link, isActive && styles.navLinkIsActive)}>
      {props.children}
    </Link>
  );
};

export const Nav: FC<{
  onLinkClick?: MouseEventHandler<HTMLAnchorElement>;
  className?: string;
}> = props => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMouseInNav, setIsMouseInNav] = useState(false)
  const [shouldAnimateTranslate, setShouldAnimateTranslate] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleNavEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleNavLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsMouseInNav(false);
      setShouldAnimateTranslate(false);
    }, 200);
  }, []);

  const handleLinkEnter = useCallback((index: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setActiveIndex(index);
      setIsMouseInNav(true);
      setShouldAnimateTranslate(true);
    }, 0);
  }, []);

  const linkBackgroundStyle = useMemo(() => ({
    translate: `0 ${activeIndex * 46}px`,
    scale: isMouseInNav ? '1' : '0.85',
    opacity: isMouseInNav ? 1 : 0,
    transition: shouldAnimateTranslate
      ? 'translate 0.2s ease, scale 0.2s ease, opacity 0.2s ease'
      : 'scale 0.2s ease, opacity 0.2s ease'
  }), [activeIndex, isMouseInNav, shouldAnimateTranslate]);

  return (
    <Box
      as="nav"
      className={clsx(styles.container, props.className)}
      onMouseEnter={handleNavEnter}
      onMouseLeave={handleNavLeave}
    >
      <div className={styles.linkBackground} style={linkBackgroundStyle} />

      {links.map(({ link, icon, label }, index) => (
        <NavLink
          data-index={index}
          key={link}
          to={link}
          onClick={props.onLinkClick}
          onMouseEnter={() => handleLinkEnter(index)}
        >
          {icon} {label}
        </NavLink>
      ))}
    </Box>
  );
};