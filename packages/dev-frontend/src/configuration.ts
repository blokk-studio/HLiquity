if (!process.env.VITE_WALLETCONNECT_PROJECT_ID) {
  throw new Error(
    "you need to configure a walletconnect project id in the environment (f.e. .env file). VITE_WALLETCONNECT_PROJECT_ID=<replace this, including brackets>"
  );
}

export const useConfiguration = () => {
  const walletConnectProjectId = process.env.VITE_WALLETCONNECT_PROJECT_ID as string;

  return {
    walletConnectProjectId
  };
};
