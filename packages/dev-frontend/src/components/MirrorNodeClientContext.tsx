import createClient, { type Client } from "openapi-fetch";
import { paths } from "../../.mirror-node";
import { createContext, ReactNode, useContext, useMemo } from "react";
import { useSelectedChain } from "./chain_context";

const clientConfigErrorMessage =
  "The mirror node client context hasn't been set. Use <MirrorNodeClientProvider> as a parent of your component.";
const fallbackClient = createClient<paths>();
fallbackClient.use({
  onRequest: () => {
    return new Response(
      JSON.stringify({
        errors: [
          {
            message: clientConfigErrorMessage
          }
        ]
      }),
      {
        status: 500,
        statusText: clientConfigErrorMessage
      }
    );
  }
});
const mirrorNodeClientContext = createContext<Client<paths>>(fallbackClient);

export const MirrorNodeClientProvider: React.FC<{ children?: ReactNode }> = props => {
  const selectedChain = useSelectedChain();

  const client = useMemo(() => {
    const client = createClient<paths>({
      baseUrl: new URL(selectedChain.apiBaseUrl).origin
    });

    return client;
  }, [selectedChain]);

  return (
    <mirrorNodeClientContext.Provider value={client}>
      {props.children}
    </mirrorNodeClientContext.Provider>
  );
};

export const MirrorNodeClientConsumer = mirrorNodeClientContext.Consumer;

export const useMirrorNodeClient = () => useContext(mirrorNodeClientContext);
