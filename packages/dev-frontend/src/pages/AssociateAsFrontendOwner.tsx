import { Flex, Paragraph } from "theme-ui";
import { useDeployment } from "../configuration/deployments";
import { useHedera } from "../hedera/hedera_context";
import { LoadingButton } from "../components/LoadingButton";
import { useLoadingState } from "../loading_state";

export const AssociateAsFrontendOwner: React.FC = () => {
  const deployment = useDeployment();
  const { hasAssociatedWithHchf, hasAssociatedWithHlqt, associateWithToken } = useHedera();

  const { call: associateWithHchf, state: hchfAssociationLoadingState } = useLoadingState(
    async () => {
      if (!deployment) {
        const errorMessage = `i cannot get the hchf token id if there is no deployment. please connect to a chain first.`;
        console.error(errorMessage, "context:", { deployment });
        throw new Error(errorMessage);
      }

      await associateWithToken({ tokenAddress: deployment.hchfTokenAddress });
    }
  );

  const { call: associateWithHlqt, state: hlqtAssociationLoadingState } = useLoadingState(
    async () => {
      if (!deployment) {
        const errorMessage = `i cannot get the hlqt token id if there is no deployment. please connect to a chain first.`;
        console.error(errorMessage, "context:", { deployment });
        throw new Error(errorMessage);
      }

      await associateWithToken({ tokenAddress: deployment.hlqtTokenAddress });
    }
  );

  return (
    <Flex sx={{ flexDirection: "column", marginTop: "4rem" }}>
      <Paragraph>Frontend owners have to be associated with both tokens.</Paragraph>

      <LoadingButton
        loading={hchfAssociationLoadingState === "pending"}
        onClick={associateWithHchf}
        disabled={hasAssociatedWithHchf}
        sx={{ marginTop: "1rem" }}
        variant={hasAssociatedWithHchf ? "success" : "primary"}
      >
        Associate with HCHF
      </LoadingButton>

      <LoadingButton
        loading={hlqtAssociationLoadingState === "pending"}
        onClick={associateWithHlqt}
        disabled={hasAssociatedWithHlqt}
        sx={{ marginTop: "1rem" }}
        variant={hasAssociatedWithHlqt ? "success" : "primary"}
      >
        Associate with HLQT
      </LoadingButton>
    </Flex>
  );
};
