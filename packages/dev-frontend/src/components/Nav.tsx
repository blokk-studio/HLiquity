import { Box } from "theme-ui";
import { Link } from "./Link";
import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import styles from "./Nav.module.css";
import clsx from "clsx";
import SecurityWarning from "../icons/SecurityWarning.svg?react";
import LowProtection from "../icons/LowProtection.svg?react";
import Swap from "../icons/Swap.svg?react";
import Atom from "../icons/Atom.svg?react";
import Coin from "../icons/Coin.svg?react";
import Rotation from "../icons/Rotation.svg?react";

const NavLink: React.FC<Parameters<typeof Link>[0]> = props => {
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

export const Nav: React.FC<{
  onLinkClick?: React.MouseEventHandler<HTMLAnchorElement>;
  className?: string;
}> = props => {
  return (
    <Box as="nav" className={clsx(styles.container, props.className)}>
      <NavLink to="/risky-troves" onClick={props.onLinkClick}>
        <SecurityWarning aria-hidden="true" />
        Risky Troves
      </NavLink>
      <NavLink to="/" onClick={props.onLinkClick}>
        <LowProtection aria-hidden="true" />
        Trove
      </NavLink>
      <NavLink to="/redeem" onClick={props.onLinkClick}>
        <Swap aria-hidden="true" />
        Redeem
      </NavLink>
      <NavLink to="/stability" onClick={props.onLinkClick}>
        <Atom aria-hidden="true" />
        Stability Pool
      </NavLink>
      <NavLink to="/staking" onClick={props.onLinkClick}>
        <Coin aria-hidden="true" />
        Staking
      </NavLink>
      <NavLink to="/redemptions" onClick={props.onLinkClick}>
        <Rotation aria-hidden="true" />
        Redemptions
      </NavLink>
    </Box>
  );
};
