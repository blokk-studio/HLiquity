import { createContext, useContext, useState } from "react";
import { HederaChain } from "../configuration/chains";
import { chainsWithDeployment } from "../hooks/chains";
import { Select, ThemeUIStyleObject } from "theme-ui";

const selectedChainContext = createContext<{
  chain: HederaChain;
  setChain: (chain: HederaChain) => HederaChain;
}>({
  chain: chainsWithDeployment[0],
  setChain: () => {
    throw new Error(
      "the selected chain context has not been set. make sure to use a <SelectedChainProvider> before the component calling setChain()"
    );
  }
});

export const useSelectedChain = () => {
  return useContext(selectedChainContext).chain;
};

export const ChainSelector: React.FC<{ sx?: ThemeUIStyleObject }> = props => {
  const { chain, setChain } = useContext(selectedChainContext);
  return (
    <Select
      sx={props.sx}
      value={chain.id}
      onInput={event => {
        const selectedChainId = parseInt(event.currentTarget.value);
        const selectedChain = chainsWithDeployment.find(chain => chain.id === selectedChainId);

        if (!selectedChain) {
          console.warn(
            `selected id ${selectedChainId} does not belong to any enabled chain that has a deployment configured.`,
            { selectedChainId, chainsWithDeployment }
          );
          return;
        }

        setChain(selectedChain);
      }}
    >
      {chainsWithDeployment.map(chain => {
        return (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        );
      })}
    </Select>
  );
};

const getSelectedChainIdCookieValue = (cookieString: typeof document.cookie) => {
  const cookieValue = cookieString
    .split("; ")
    .find(row => row.startsWith("hliquity_selected_chain_id="))
    ?.split("=")[1];

  if (!cookieValue) {
    return undefined;
  }

  const chainId = parseInt(cookieValue);

  return chainId;
};

export const SelectedChainProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const selectedChainIdCookieValue = getSelectedChainIdCookieValue(document.cookie);
  const initiallySelectedChain =
    chainsWithDeployment.find(chain => chain.id === selectedChainIdCookieValue) ??
    chainsWithDeployment[0];
  const [chain, setChainState] = useState<HederaChain>(initiallySelectedChain);

  const setChain = (chain: HederaChain) => {
    document.cookie = `hliquity_selected_chain_id=${chain.id}; max-age=31536000; SameSite=Strict; Secure`;

    setChainState(chain);

    return chain;
  };

  return (
    <selectedChainContext.Provider value={{ chain, setChain }}>
      {children}
    </selectedChainContext.Provider>
  );
};
