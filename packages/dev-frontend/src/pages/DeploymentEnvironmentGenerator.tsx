import { _LiquityDeploymentJSON } from "@liquity/lib-ethers/dist/src/contracts";
import { useState, useMemo } from "react";

type Address = `0x${string}`;

export const DeploymentEnvironmentGenerator: React.FC = () => {
  const [deploymentString, setDeploymentString] = useState<string | undefined>(undefined);
  const [hchfTokenAddress, setHchfTokenAddress] = useState<Address | undefined>(undefined);
  const [hlqtTokenAddress, setHlqtTokenAddress] = useState<Address | undefined>(undefined);
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

      return deployment;
    } catch (error) {
      setDeploymentStringFormatError(error as Error);
    }

    return null;
  }, [deploymentObject, hchfTokenAddress, hlqtTokenAddress, frontendTag]);

  return (
    <form style={{ marginTop: "4rem", width: "100%", maxWidth: "600px" }}>
      <label style={{ display: "grid" }}>
        <span>deployment string</span>
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
          hchf token address{" "}
          {deploymentObject && <>(hchf contract: {deploymentObject.addresses.hchfToken})</>}
        </span>

        <input
          required
          value={hchfTokenAddress}
          onInput={event => setHchfTokenAddress(event.currentTarget.value as Address)}
          style={{ fontFamily: "monospace" }}
        />
      </label>

      <label style={{ display: "grid", marginTop: "2rem" }}>
        <span>
          hlqt token address{" "}
          {deploymentObject && <>(hlqt contract: {deploymentObject.addresses.hlqtToken})</>}
        </span>

        <input
          required
          value={hlqtTokenAddress}
          onInput={event => setHlqtTokenAddress(event.currentTarget.value as Address)}
          style={{ fontFamily: "monospace" }}
        />
      </label>

      <label style={{ display: "grid", marginTop: "2rem" }}>
        <span>frontend tag </span>

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

      {!deploymentStringFormatError && (
        <pre style={{ overflowX: "auto", width: "100%" }}>{JSON.stringify(deployment)}</pre>
      )}

      <a href="https://hashscan.io/" rel="noreferrer noopener" target="_blank">
        hashscan
      </a>
    </form>
  );
};
