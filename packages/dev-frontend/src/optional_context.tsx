import { Consumer, ReactNode, useContext as useReactContext, Context } from "react";

export const getConsumer = <Type,>(
  context: Context<Type | null>,
  options?: { errorMessage?: string }
) => {
  const Consumer: Consumer<Type> = (props => {
    const contextValue = useReactContext(context);

    if (!contextValue) {
      throw new Error(
        options?.errorMessage ??
          `the context hasn't been set. make sure you have a <*Provider> and <*Loader> as ancestors of this <*Consumer>.`
      );
    }

    return <>{props.children(contextValue)}</>;
  }) as Consumer<Type>;

  return Consumer;
};

export const getLoader = <Type,>(context: Context<Type | null>) => {
  const Loader: React.FC<
    React.PropsWithChildren<{
      loader: ReactNode;
    }>
  > = props => {
    const hashConnect = useReactContext(context);

    if (!hashConnect) {
      return <>{props.loader}</>;
    }

    return <>{props.children}</>;
  };

  return Loader;
};

export const getOptionalHook = <Type,>(context: Context<Type | null>) => {
  const useOptionalContext = () => {
    const hashConnect = useReactContext(context);

    return hashConnect;
  };

  return useOptionalContext;
};

export const getHook = <Type,>(
  context: Context<Type | null>,

  options?: { errorMessage?: string }
) => {
  const useContext = (): Type => {
    const hashConnect = useReactContext(context);

    if (!hashConnect) {
      throw new Error(
        options?.errorMessage ??
          `the context hasn't been set. make sure you have a <*Provider> and <*Loader> as ancestors of the component you call use*() in.`
      );
    }

    return hashConnect;
  };

  return useContext;
};
