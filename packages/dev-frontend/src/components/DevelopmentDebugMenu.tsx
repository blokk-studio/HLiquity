import { Flex } from "theme-ui";
import { useDeployment } from "../hooks/deployments";
import { LoadingButton } from "./LoadingButton";
import { useLoadingState } from "../loading_state";
import React, { useEffect, useState } from "react";
import { DeploymentEnvironmentGenerator } from "../pages/DeploymentEnvironmentGenerator";
import { useLiquity } from "../hooks/LiquityContext";
import { useLiquitySelector } from "@liquity/lib-react";
import { Decimal } from "@liquity/lib-base";

export const DevelopmentDebugMenu: React.FC = () => {
  const deployment = useDeployment();
  const { liquity } = useLiquity();
  const { userHasAssociatedWithHchf, userHasAssociatedWithHlqt, userHasAssociatedWithLpToken } =
    useLiquitySelector(state => state);

  const {
    call: associateWithHchf,
    state: hchfAssociationLoadingState,
    error: hchfAssociationError
  } = useLoadingState(async () => {
    await liquity.associateWithHchf();
  });
  const {
    call: dissociateFromHchf,
    state: hchfDissociationLoadingState,
    error: hchfDissociationError
  } = useLoadingState(async () => {
    await liquity.dissociateFromHchf();
  });

  const {
    call: associateWithHlqt,
    state: hlqtAssociationLoadingState,
    error: hlqtAssociationError
  } = useLoadingState(async () => {
    await liquity.associateWithHlqt();
  });
  const {
    call: dissociateFromHlqt,
    state: hlqtDissociationLoadingState,
    error: hlqtDissociationError
  } = useLoadingState(async () => {
    await liquity.dissociateFromHlqt();
  });

  const {
    call: associateWithLpToken,
    state: lpTokenAssociationLoadingState,
    error: lpTokenAssociationError
  } = useLoadingState(async () => {
    await liquity.associateWithLpToken();
  });
  const {
    call: dissociateFromLpToken,
    state: lpTokenDissociationLoadingState,
    error: lpTokenDissociationError
  } = useLoadingState(async () => {
    await liquity.dissociateFromLpToken();
  });

  const {
    call: approveHchfToSpendHchf,
    state: hchfApprovalLoadingState,
    error: hchfApprovalError
  } = useLoadingState(async () => {
    await liquity.approveHchfToSpendHchf(Decimal.from(1));
  });

  const {
    call: approveHlqtToSpendHlqt,
    state: hlqtApprovalLoadingState,
    error: hlqtApprovalError
  } = useLoadingState(async () => {
    await liquity.approveHlqtToSpendHlqt(Decimal.from(1));
  });

  const {
    call: approveSaucerSwapToSpendLpToken,
    state: lpTokenApprovalLoadingState,
    error: lpTokenApprovalError
  } = useLoadingState(async () => {
    await liquity.approveSaucerSwapToSpendLpToken(Decimal.from(1));
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
              disabled={userHasAssociatedWithHchf}
              onClick={associateWithHchf}
            >
              Associate
            </LoadingButton>

            {hchfDissociationError && <p>{hchfDissociationError.message}</p>}
            <LoadingButton
              loading={hchfDissociationLoadingState === "pending"}
              variant="danger"
              disabled={!userHasAssociatedWithHchf}
              onClick={dissociateFromHchf}
            >
              Dissociate
            </LoadingButton>

            {hchfApprovalError && <p>{hchfApprovalError.message}</p>}
            <LoadingButton
              loading={hchfApprovalLoadingState === "pending"}
              onClick={approveHchfToSpendHchf}
            >
              Approve HCHF to spend 1 HCHF
            </LoadingButton>
          </dd>

          <dt>HLQT</dt>
          <dd>{deployment.hlqtTokenAddress}</dd>
          <dd>
            {hlqtAssociationError && <p>{hlqtAssociationError.message}</p>}
            <LoadingButton
              loading={hlqtAssociationLoadingState === "pending"}
              variant="success"
              disabled={userHasAssociatedWithHlqt}
              onClick={associateWithHlqt}
            >
              Associate
            </LoadingButton>

            {hlqtDissociationError && <p>{hlqtDissociationError.message}</p>}
            <LoadingButton
              loading={hlqtDissociationLoadingState === "pending"}
              variant="danger"
              disabled={!userHasAssociatedWithHlqt}
              onClick={dissociateFromHlqt}
            >
              Dissociate
            </LoadingButton>

            {hlqtApprovalError && <p>{hlqtApprovalError.message}</p>}
            <LoadingButton
              loading={hlqtApprovalLoadingState === "pending"}
              onClick={approveHlqtToSpendHlqt}
            >
              Approve HLQT to spend 1 HLQT
            </LoadingButton>
          </dd>

          <dt>LP Token</dt>
          <dd>
            {lpTokenAssociationError && <p>{lpTokenAssociationError.message}</p>}
            <LoadingButton
              loading={lpTokenAssociationLoadingState === "pending"}
              variant="success"
              disabled={userHasAssociatedWithLpToken}
              onClick={associateWithLpToken}
            >
              Associate
            </LoadingButton>

            {lpTokenDissociationError && <p>{lpTokenDissociationError.message}</p>}
            <LoadingButton
              loading={lpTokenDissociationLoadingState === "pending"}
              variant="danger"
              disabled={!userHasAssociatedWithLpToken}
              onClick={dissociateFromLpToken}
            >
              Dissociate
            </LoadingButton>

            {lpTokenApprovalError && <p>{lpTokenApprovalError.message}</p>}
            <LoadingButton
              loading={lpTokenApprovalLoadingState === "pending"}
              onClick={approveSaucerSwapToSpendLpToken}
            >
              Approve SaucerSwap pool to spend 1 LP Token
            </LoadingButton>
          </dd>

          {Object.entries(deployment.addresses).map(([contractKey, contractAddress]) => (
            <React.Fragment key={`${contractKey}:${contractAddress}`}>
              <dt>{contractKey}</dt>
              <dd>{contractAddress}</dd>
            </React.Fragment>
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
