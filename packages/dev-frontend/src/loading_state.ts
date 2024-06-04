import { useEffect, useState } from "react";
import { useSnackbar } from "./components/Snackbar";
import { getNoMatchingKeyErrorSnack, isNoMatchingKeyError, isError } from "./errors";

export type LoadingState = "idle" | "pending" | "success" | "error";

export const useLoadingState = <Type>(
  callback: () => Promise<Type | null>,
  resetDependencies: unknown[] = []
): {
  state: LoadingState;
  call: typeof callback;
  result: Type | null;
  error: Error | null;
} => {
  const snackbar = useSnackbar();
  const [state, setState] = useState<LoadingState>("idle");
  const [result, setResult] = useState<Type | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const call = async () => {
    setState("pending");
    setResult(null);
    setError(null);
    try {
      const result = await callback();
      setState("success");
      setResult(result);
      setError(null);

      return result;
    } catch (throwable: unknown) {
      console.warn("callback resulted in an error", throwable, callback);

      const error = isError(throwable) ? throwable : new Error(`${throwable}`);
      setState("error");
      setResult(null);
      setError(error);

      if (isNoMatchingKeyError(error)) {
        snackbar.addSnack(getNoMatchingKeyErrorSnack());
      }
    }

    return null;
  };

  useEffect(() => {
    setState("idle");
    setResult(null);
    setError(null);
    // man, react sucks bad
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDependencies);

  return {
    state,
    call,
    result,
    error
  };
};
