import { Snack } from "./components/Snackbar";

export const isError = (throwable: unknown): throwable is Error => throwable instanceof Error;

export const isNoMatchingKeyError = (error: Error) => {
  return /no matching key/gi.test(error.message);
};

export const getNoMatchingKeyErrorSnack = (): Snack => {
  return {
    type: "danger",
    title: "HashPack returned an unrecoverable error",
    content:
      "HashPack occasionally starts returning errors for all transactions, even if the user approves them and the transactions succeed, and doesn't stop until the browser is restarted. If you keep experiencing this error for all transactions after this one, we recommend you restart your browser and try again. Refreshing the page can work in some cases, but doesn't work for all flows."
  };
};
