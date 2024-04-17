import { Flex } from "theme-ui";
import { useDeployment } from "../configuration/deployments";
import { useHedera } from "../hedera/hedera_context";
import { LoadingButton } from "./LoadingButton";
import { useLoadingState } from "../loading_state";
import { useEffect, useState } from "react";
import { DeploymentEnvironmentGenerator } from "../pages/DeploymentEnvironmentGenerator";

export const DevelopmentDebugMenu: React.FC = () => {
  const {
    dissociateFromToken,
    associateWithToken,
    hasAssociatedWithHchf,
    hasAssociatedWithHlqt
  } = useHedera();
  const deployment = useDeployment();

  const {
    call: associateWithHchf,
    state: hchfAssociationLoadingState,
    error: hchfAssociationError
  } = useLoadingState(async () => {
    if (!deployment) {
      const errorMessage = `i cannot get the hchf token id if there is no deployment. please connect to a chain first.`;
      console.error(errorMessage, "context:", { deployment });
      throw new Error(errorMessage);
    }

    await associateWithToken({ tokenAddress: deployment.hchfTokenAddress });
  });

  const {
    call: dissociateFromHchf,
    state: hchfDissociationLoadingState,
    error: hchfDissociationError
  } = useLoadingState(async () => {
    if (!deployment) {
      const errorMessage = `i cannot get the hchf token id if there is no deployment. please connect to a chain first.`;
      console.error(errorMessage, "context:", { deployment });
      throw new Error(errorMessage);
    }

    await dissociateFromToken({ tokenAddress: deployment.hchfTokenAddress });
  });

  const {
    call: associateWithHlqt,
    state: hlqtAssociationLoadingState,
    error: hlqtAssociationError
  } = useLoadingState(async () => {
    if (!deployment) {
      const errorMessage = `i cannot get the hlqt token id if there is no deployment. please connect to a chain first.`;
      console.error(errorMessage, "context:", { deployment });
      throw new Error(errorMessage);
    }

    await associateWithToken({ tokenAddress: deployment.hlqtTokenAddress });
  });

  const {
    call: dissociateFromHlqt,
    state: hlqtDissociationLoadingState,
    error: hlqtDissociationError
  } = useLoadingState(async () => {
    if (!deployment) {
      const errorMessage = `i cannot get the hlqt token id if there is no deployment. please connect to a chain first.`;
      console.error(errorMessage, "context:", { deployment });
      throw new Error(errorMessage);
    }

    await dissociateFromToken({ tokenAddress: deployment.hlqtTokenAddress });
  });

  return (
    <Flex sx={{ flexDirection: "column" }}>
      {deployment && (
        <dl>
          <dt>Frontend tag</dt>
          <dd>{deployment.frontendTag}</dd>

          <dt>HCHF</dt>
          <dd>{deployment.hchfTokenAddress}</dd>
          <dd>
            {hchfAssociationError && <p>{hchfAssociationError.message}</p>}
            <LoadingButton
              loading={hchfAssociationLoadingState === "pending"}
              variant="success"
              disabled={hasAssociatedWithHchf}
              onClick={associateWithHchf}
            >
              Associate
            </LoadingButton>
            {hchfDissociationError && <p>{hchfDissociationError.message}</p>}
            <LoadingButton
              loading={hchfDissociationLoadingState === "pending"}
              variant="danger"
              disabled={!hasAssociatedWithHchf}
              onClick={dissociateFromHchf}
            >
              Dissociate
            </LoadingButton>
          </dd>

          <dt>HLQT</dt>
          <dd>{deployment.hlqtTokenAddress}</dd>
          <dd>
            {hlqtAssociationError && <p>{hlqtAssociationError.message}</p>}
            <LoadingButton
              loading={hlqtAssociationLoadingState === "pending"}
              variant="success"
              disabled={hasAssociatedWithHlqt}
              onClick={associateWithHlqt}
            >
              Associate
            </LoadingButton>
            {hlqtDissociationError && <p>{hlqtDissociationError.message}</p>}
            <LoadingButton
              loading={hlqtDissociationLoadingState === "pending"}
              variant="danger"
              disabled={!hasAssociatedWithHlqt}
              onClick={dissociateFromHlqt}
            >
              Dissociate
            </LoadingButton>
          </dd>

          {Object.entries(deployment.addresses).map(([contractKey, contractAddress]) => (
            <>
              <dt>{contractKey}</dt>
              <dd>{contractAddress}</dd>
            </>
          ))}
        </dl>
      )}

      <DeploymentEnvironmentGenerator />
    </Flex>
  );
};

export const AutomaticDevelopmentDebugMenu: React.FC = () => {
  const [forceShowDebugMenu, setForceShowDebugMenu] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    Object.assign(window, {
      showDebugMenu: () => {
        setForceShowDebugMenu(true);
      }
    });
  });

  const showDebugMenu = import.meta.env.DEV || forceShowDebugMenu;

  return showDebugMenu ? <DevelopmentDebugMenu /> : <></>;
};
