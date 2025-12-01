import { Decimal, LiquityStoreState, StabilityDepositChange } from "@liquity/lib-base";
import { useLiquitySelector } from "@liquity/lib-react";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTxFunction } from "../Transaction";
import { LoadingThemeUiButton, LoadingThemeUiButtonProps } from "../LoadingButton";

type StabilityDepositActionProps = {
  transactionId: string;
  change: StabilityDepositChange<Decimal>;
} & LoadingThemeUiButtonProps;

const selectFrontendRegistered = ({ frontend }: LiquityStoreState) =>
  frontend.status === "registered";

export const StabilityDepositAction: React.FC<React.PropsWithChildren<StabilityDepositActionProps>> = ({
  children,
  transactionId,
  change,
  ...loadingButtonProps
}) => {
  const { liquity } = useLiquity();
  const frontendRegistered = useLiquitySelector(selectFrontendRegistered);

  const frontendTag = frontendRegistered ? liquity.connection.frontendTag : undefined;

  const [sendTransaction] = useTxFunction(
    transactionId,
    change.depositHCHF
      ? liquity.send.depositHCHFInStabilityPool.bind(liquity.send, change.depositHCHF, frontendTag)
      : liquity.send.withdrawHCHFFromStabilityPool.bind(liquity.send, change.withdrawHCHF)
  );

  return (
    <LoadingThemeUiButton {...loadingButtonProps} onClick={sendTransaction}>
      {children}
    </LoadingThemeUiButton>
  );
};
