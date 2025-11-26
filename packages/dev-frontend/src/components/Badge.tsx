import React from "react";
import { Flex } from "theme-ui";

export const Badge: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <Flex variant="layout.badge">{children}</Flex>;
};
