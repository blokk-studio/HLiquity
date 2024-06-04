import { ReactNode, createContext, useContext, useState } from "react";
import { Heading, Paragraph, Alert, Flex, IconButton, Grid } from "theme-ui";
import { Icon } from "./Icon";

export interface Snack {
  type: "danger" | "info";
  title: string;
  content: ReactNode;
  /** time in milliseconds after which the snack is removed without user input */
  automaticallyRemoveIn?: number;
}

interface SnackbarContext {
  snacks: Snack[];
  addSnack: (snack: Snack) => void;
  removeSnack: (snack: Snack) => void;
}

const noOp = () => {
  throw new Error(
    "the snackbar context hasn't been set. you need to add a <SnackbarProvider> as an ancestor of the components you use `addSnack()` and `removeSnack()` in."
  );
};

const snackbarContext = createContext<SnackbarContext>({
  snacks: [],
  addSnack: noOp,
  removeSnack: noOp
});

export const useSnackbar = () => {
  return useContext(snackbarContext);
};

export const SnackbarProvider: React.FC = ({ children }) => {
  const [snacks, setSnacks] = useState<Snack[]>([]);

  const addSnack = (snack: Snack) => {
    const newSnacks = [...snacks, snack];

    if (snack.automaticallyRemoveIn) {
      setTimeout(() => {
        removeSnack(snack);
      }, snack.automaticallyRemoveIn);
    }

    setSnacks(newSnacks);
  };

  const removeSnack = (snack: Snack) => {
    const newSnacks = snacks.filter(existingSnack => existingSnack !== snack);

    setSnacks(newSnacks);
  };

  return (
    <snackbarContext.Provider
      value={{
        snacks,
        addSnack,
        removeSnack
      }}
    >
      {children}

      <Snackbar />
    </snackbarContext.Provider>
  );
};

export const Snackbar: React.FC = () => {
  const { snacks, removeSnack } = useSnackbar();

  return (
    <Flex
      sx={{
        position: "fixed",
        pointerEvents: "none",
        bottom: "0",
        right: "0",
        zIndex: "100000",
        padding: "2rem",
        flexDirection: "column",
        gap: "1rem",
        width: "100%",
        maxWidth: "30rem"
      }}
      aria-live="polite"
    >
      {snacks.map(snack => {
        return (
          <Alert
            sx={{
              backgroundColor: snack.type,
              pointerEvents: "all",
              display: "block",
              paddingTop: "1.1rem",
              paddingInline: "1.6rem",
              paddingBottom: "1.6rem"
            }}
            role="alert"
          >
            <Grid
              role="presentation"
              sx={{
                gridTemplateColumns: "1fr auto",
                marginBottom: "1rem",
                alignContent: "start"
              }}
            >
              <Heading>{snack.title}</Heading>
              <IconButton
                onClick={() => {
                  removeSnack(snack);
                }}
                aria-label="Dismiss"
              >
                <Icon name="window-close" color="inherit" />
              </IconButton>
            </Grid>

            {typeof snack.content === "string" ? (
              <Paragraph>{snack.content}</Paragraph>
            ) : (
              snack.content
            )}
          </Alert>
        );
      })}
    </Flex>
  );
};
