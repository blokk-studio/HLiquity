import React from "react";
import { WizardProvider } from "./Context";
import type { WizardProviderProps } from "./Context";

export const Wizard: React.FC<React.PropsWithChildren<WizardProviderProps>> = ({ children, onFinish, onCancel }) => {
  return (
    <WizardProvider onFinish={onFinish} onCancel={onCancel}>
      {children}
    </WizardProvider>
  );
};
