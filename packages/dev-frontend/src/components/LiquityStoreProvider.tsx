import React, { ReactNode } from "react";
import { useLiquity } from "../hooks/LiquityContext";
import { LiquityStoreProvider as _LiquityStoreProvider } from "@liquity/lib-react";

export const LiquityStoreProvider: React.FC<{ loader: ReactNode }> = ({ loader, children }) => {
  const { store } = useLiquity();

  return (
    <_LiquityStoreProvider store={store} loader={loader}>
      {children}
    </_LiquityStoreProvider>
  );
};
