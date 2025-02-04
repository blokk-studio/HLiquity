import { Constants, getConstantsFromJsonObjectString } from "@liquity/lib-base";
import { chains, enabledChainIds } from "../configuration/chains";
import { deployments } from "../configuration/deployments";
import { useMultiWallet } from "../multi_wallet";

const setOfEnabledChainIds = new Set(enabledChainIds);
export const enabledDeployments = deployments.filter(deployment =>
  setOfEnabledChainIds.has(deployment.chainId)
);
const chainConstants: Record<number, Constants> = Object.fromEntries(
  chains.map(chain => {
    const constantsJsonString = import.meta.env[`VITE_CHAIN_${chain.id}_CONSTANTS`];
    const constants = getConstantsFromJsonObjectString(constantsJsonString);

    return [chain.id, constants];
  })
);

/** returns the constants for the chain that is currently selected in wagmi or hashconnect */
export const useConstants = () => {
  const { chain } = useMultiWallet();

  if (!chain) {
    const errorMessage = `i need a chain to get a deployment. useMultiWallet() returned ${JSON.stringify(
      chain
    )}`;
    throw new Error(errorMessage);
  }

  const constants = chainConstants[chain.id];

  return constants;
};
