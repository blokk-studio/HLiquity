import { HLiquityStore } from "@liquity/lib-base";
import React, { createContext, useEffect, useState } from "react";

export const LiquityStoreContext = createContext<HLiquityStore | undefined>(undefined);

type LiquityStoreProviderProps = {
  store: HLiquityStore;
  loader?: React.ReactNode;
};

export const LiquityStoreProvider: React.FC<LiquityStoreProviderProps> = ({
  store,
  children,
  loader
}) => {
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);

  useEffect(() => {
    store.onLoaded = () => setIsStoreLoaded(true);
    store.refresh();

    return () => {
      store.onLoaded = undefined;
      setIsStoreLoaded(false);
    };
  }, [store]);

  if (!isStoreLoaded) {
    return <>{loader}</>;
  }

  return <LiquityStoreContext.Provider value={store}>{children}</LiquityStoreContext.Provider>;
};
