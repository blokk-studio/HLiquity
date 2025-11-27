import { Box, Flex, Text, ThemeUIStyleObject } from "theme-ui";

import { Icon } from "./Icon";
import React from "react";

export const ActionDescription: React.FC<
  React.PropsWithChildren<{
    icon?: React.ReactNode;
    sx?: ThemeUIStyleObject;
  }>
> = ({ children, icon, sx }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-around",

      mb: [2, 3],
      p: 3,

      border: 1,
      borderRadius: "8px",
      borderColor: "accent",
      boxShadow: 2,
      bg: "rgba(46, 182, 234, 0.05)",
      ...sx
    }}
  >
    <Flex sx={{ alignItems: "center" }}>
      {icon ?? <Icon name="info-circle" size="lg" />}
      <Text sx={{ ml: 2 }}>{children}</Text>
    </Flex>
  </Box>
);

export const Amount: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Text sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}>{children}</Text>
);
