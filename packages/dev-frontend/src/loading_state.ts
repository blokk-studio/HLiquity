import { useEffect, useState } from "react";

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

      return result;
    } catch (error: unknown) {
      setState("error");
      setError(error as Error);
      console.warn("callback resulted in an error", error, callback);
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
