const parseEnabledChainIdsFromEnv = (env: Record<string, string>) => {
  const enabledChainsString: string = env.VITE_ENABLED_CHAINS;
  if (!enabledChainsString) {
    const errorMessage = `there is no configuration for enabled chains. set the environment variable \`VITE_ENABLED_CHAINS\` to a string of comma-separated numbers (f.e. \`VITE_ENABLED_CHAINS=296,297,298\`).`;
    console.error(errorMessage, { env });

    return [];
  }

  const enabledChainIdStrings = enabledChainsString.split(",").filter(Boolean);
  const enabledChainIds = enabledChainIdStrings
    .map(idString => parseInt(idString, 10))
    .filter(number => !isNaN(number));

  return enabledChainIds;
};

export const enabledChainIds = parseEnabledChainIdsFromEnv(import.meta.env);

/** returns the ids for all currently enabled chains configured in the environment */
export const useEnabledChainIds = () => {
  return enabledChainIds;
};
