import { _LiquityDeploymentJSON } from "@liquity/lib-ethers/dist/src/contracts";
import { useState, useMemo } from "react";
import { Grid, Heading } from "theme-ui";

type Address = `0x${string}`;

export const DeploymentEnvironmentGenerator: React.FC = () => {
  const [deploymentString, setDeploymentString] = useState<string | undefined>(undefined);
  const [hchfTokenAddress, setHchfTokenAddress] = useState<Address | undefined>(undefined);
  const [hlqtTokenAddress, setHlqtTokenAddress] = useState<Address | undefined>(undefined);
  const [uniTokenAddress, setUniTokenAddress] = useState<Address | undefined>(undefined);
  const [frontendTag, setFrontendTag] = useState<Address>(import.meta.env.VITE_FRONTEND_TAG);
  const [deploymentStringFormatError, setDeploymentStringFormatError] = useState<Error | null>(null);
  const deploymentObject: Omit<
    _LiquityDeploymentJSON,
    "hchfTokenAddress" | "hlqtTokenAddress"
  > | null = useMemo(() => {
    try {
      const evaluatedDeploymentString = eval(`(${deploymentString})`);

      return evaluatedDeploymentString;
    } catch (error) {
      setDeploymentStringFormatError(error as Error);
    }

    return null;
  }, [deploymentString]);
  const deployment = useMemo<_LiquityDeploymentJSON | null>(() => {
    if (!deploymentObject) {
      return null;
    }

    setDeploymentStringFormatError(null);
    try {
      if (!hchfTokenAddress) {
        throw new Error("enter the hchf token address");
      }

      if (!hlqtTokenAddress) {
        throw new Error("enter the hlqt token address");
      }

      if (!frontendTag) {
        throw new Error("set the frontend tag");
      }

      const deployment = {
        ...deploymentObject,
        hchfTokenAddress,
        hlqtTokenAddress,
        frontendTag
      };

      if (uniTokenAddress) {
        deployment.addresses.uniToken = uniTokenAddress;
      }

      return deployment;
    } catch (error) {
      setDeploymentStringFormatError(error as Error);
    }

    return null;
  }, [deploymentObject, hchfTokenAddress, hlqtTokenAddress, frontendTag, uniTokenAddress]);

  return (
    <Grid>
      <Heading sx={{ marginTop: "4rem" }}>deployment environment-string generator</Heading>
      <form style={{ width: "100%" }}>
        <label style={{ display: "grid" }}>
          <span>1. paste the deployment json string you were given</span>
          <textarea
            required
            rows={20}
            style={{ width: "100%" }}
            value={deploymentString}
            onInput={event => setDeploymentString(event.currentTarget.value)}
          />
        </label>

        <label style={{ display: "grid", marginTop: "2rem" }}>
          <span>
            2. look up & paste the hchf token address (address of the fungible token, not the
            contract)
          </span>

          {deploymentObject && (
            <span>
              you can find the hchf & hlqt token addresses associated with the hlqt staking contract.
              its contract address is: {deploymentObject.addresses.hlqtStaking}
            </span>
          )}

          <input
            required
            value={hchfTokenAddress}
            onInput={event => setHchfTokenAddress(event.currentTarget.value as Address)}
            style={{ fontFamily: "monospace" }}
          />
        </label>
        <label style={{ display: "grid", marginTop: "2rem" }}>
          <span>
            3. look up & paste the hlqt token address (address of the fungible token, not the
            contract)
          </span>

          <input
            required
            value={hlqtTokenAddress}
            onInput={event => setHlqtTokenAddress(event.currentTarget.value as Address)}
            style={{ fontFamily: "monospace" }}
          />
        </label>

        <label style={{ display: "grid", marginTop: "2rem" }}>
          <span>
            4. look up & paste the uni/lp token address (address of the fungible token, not the
            contract). this can be left empty if it's no longer required.
          </span>

          {deploymentObject && (
            <span>
              you can find the uni/lp token address associated with the saucer swap pool. its
              contract address is: {deploymentObject.addresses.saucerSwapPool}
            </span>
          )}

          <input
            required
            value={uniTokenAddress}
            onInput={event => setUniTokenAddress(event.currentTarget.value as Address)}
            style={{ fontFamily: "monospace" }}
          />
        </label>

        <label style={{ display: "grid", marginTop: "2rem" }}>
          <span>
            5. paste the evm address of the account that should receive the kickback. this account
            owner needs to register the frontend before it can be used. you can use your own account
            for testnet (chain id 296) deployments.
          </span>

          <input
            required
            value={frontendTag}
            onInput={event => setFrontendTag(event.currentTarget.value as Address)}
            style={{ fontFamily: "monospace" }}
          />
        </label>

        {deploymentStringFormatError && (
          <p
            role="alert"
            style={{
              marginTop: "2rem",
              backgroundColor: "crimson",
              color: "white",
              padding: "0.75rem 1.25rem"
            }}
          >
            {deploymentStringFormatError.message}
          </p>
        )}

        {!deploymentStringFormatError && deployment && (
          <p>
            6. set the environment variable <code>VITE_CHAIN_{deployment.chainId}_DEPLOYMENT</code>{" "}
            to the following value:
            <pre style={{ overflowX: "auto", width: "100%" }}>{JSON.stringify(deployment)}</pre>
            or paste the following into your environment:
            <pre style={{ overflowX: "auto", width: "100%" }}>
              VITE_CHAIN_{deployment.chainId}_DEPLOYMENT={JSON.stringify(deployment)}
            </pre>
          </p>
        )}

        <a href="https://hashscan.io/" rel="noreferrer noopener" target="_blank">
          you can look up contract & token addresses here, on hashscan
        </a>
      </form>
    </Grid>
  );
};
