import { Flex, Paragraph } from "theme-ui";
import { LoadingThemeUiButton } from "../components/LoadingButton";
import { useLoadingState } from "../loading_state";
import { useLiquity } from "../hooks/LiquityContext";
import { useLiquitySelector } from "@liquity/lib-react";

export const AssociateAsFrontendOwner: React.FC = () => {
  const { userHasAssociatedWithHchf, userHasAssociatedWithHlqt } = useLiquitySelector(
    state => state
  );
  const { liquity } = useLiquity();

  const { call: associateWithHchf, state: hchfAssociationLoadingState } = useLoadingState(
    async () => {
      await liquity.associateWithHchf();
    }
  );

  const { call: associateWithHlqt, state: hlqtAssociationLoadingState } = useLoadingState(
    async () => {
      await liquity.associateWithHlqt();
    }
  );

  return (
    <Flex sx={{ flexDirection: "column", marginTop: "4rem" }}>
      <Paragraph>Frontend owners have to be associated with both tokens.</Paragraph>

      <LoadingThemeUiButton
        loading={hchfAssociationLoadingState === "pending"}
        onClick={associateWithHchf}
        disabled={userHasAssociatedWithHchf}
        sx={{ marginTop: "1rem" }}
        variant={userHasAssociatedWithHchf ? "success" : "primary"}
      >
        Associate with HCHF
      </LoadingThemeUiButton>

      <LoadingThemeUiButton
        loading={hlqtAssociationLoadingState === "pending"}
        onClick={associateWithHlqt}
        disabled={userHasAssociatedWithHlqt}
        sx={{ marginTop: "1rem" }}
        variant={userHasAssociatedWithHlqt ? "success" : "primary"}
      >
        Associate with HLQT
      </LoadingThemeUiButton>
    </Flex>
  );
};
