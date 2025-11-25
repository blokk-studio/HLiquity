/** @jsxImportSource theme-ui */
import { HLiquityStore } from "@liquity/lib-base";
import React, { createContext, useEffect, useState } from "react";
// app error
import { ReactNode } from "react";
import { Flex, Heading, Paragraph, Button } from "theme-ui";

export const LiquityStoreContext = createContext<HLiquityStore | undefined>(undefined);

type LiquityStoreProviderProps = {
  store: HLiquityStore;
  loader?: React.ReactNode;
};

export const LiquityStoreProvider: React.FC<React.PropsWithChildren<LiquityStoreProviderProps>> = ({
  store,
  children,
  loader
}) => {
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);
  const [storeError, setStoreError] = useState<Error | null>(null);

  useEffect(() => {
    store.onLoaded = () => setIsStoreLoaded(true);
    store.refresh().catch(setStoreError);

    return () => {
      store.onLoaded = undefined;
      setIsStoreLoaded(false);
    };
  }, [store]);

  if (storeError) {
    // TODO: move this stupid component to dev-frontend or everything here
    console.warn(`[LiquityStoreProvider] refreshing the store caused an error`, storeError);
    return <AppError error={storeError} />;
  }

  if (!isStoreLoaded) {
    return <>{loader}</>;
  }

  return <LiquityStoreContext.Provider value={store}>{children}</LiquityStoreContext.Provider>;
};

const AppError: React.FC<
  React.PropsWithChildren<void | {
    error: Error;
    heading?: string | ReactNode;
    infoText?: string | ReactNode;
  }>
> = props => (
  <Flex
    sx={{
      minHeight: "100%",
      flexDirection: "column",
      justifyContent: "center",
      marginInline: "clamp(2rem, 100%, 50% - 12rem)"
    }}
  >
    {props.children ? (
      props.children
    ) : (
      <>
        <Heading sx={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {"heading" in props ? props.heading : "Something went wrong"}
        </Heading>
        <Paragraph sx={{ marginTop: "1rem" }}>
          {"infoText" in props ? props.infoText : "Please refresh the page and try again."}
        </Paragraph>

        <Button
          sx={{ marginTop: "2rem", width: "100%" }}
          onClick={() => {
            window.location.reload();
          }}
        >
          Refresh the page
        </Button>

        {"error" in props && (
          <details style={{ marginTop: "3rem", width: "100%" }}>
            <summary>Error details</summary>

            <p>{props.error.message}</p>
          </details>
        )}
      </>
    )}
  </Flex>
);
