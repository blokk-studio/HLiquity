import React from "react";
import { Text } from "theme-ui";

export const PoolBalance: React.FC<React.PropsWithChildren<{ symbol: string }>> = ({ symbol, children }) => (
  <>
    <Text sx={{ fontWeight: "medium" }}>{children}</Text>
    &nbsp;
    <Text sx={{ fontWeight: "light", opacity: 0.8 }}>{symbol}</Text>
  </>
);
