import { NavLink as RouterLink, NavLinkProps as RouterLinkProps } from "react-router-dom";
import { NavLink as ThemeUINavLink, NavLinkProps as ThemeUILinkProps } from "theme-ui";
import { FunctionComponent } from "react";

type CombinedProps = ThemeUILinkProps & RouterLinkProps;

// 'RouterLink' cannot be used as a JSX component.
//   Its return type 'ReactElement<any, string | JSXElementConstructor<any>> | null' is not a valid JSX element.
const RouterLinkWithFixedType = RouterLink as unknown as FunctionComponent<RouterLinkProps>;

const ExactLink: React.FC<CombinedProps> = props => {
  return <RouterLinkWithFixedType {...props} />;
};

export const Link: React.FC<CombinedProps> = props => {
  return <ThemeUINavLink {...props} as={ExactLink} />;
};
