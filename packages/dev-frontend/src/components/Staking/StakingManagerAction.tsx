import { Decimal, HLQTStakeChange } from "@liquity/lib-base";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTxFunction } from "../Transaction";
import { LoadingThemeUiButton, LoadingThemeUiButtonProps } from "../LoadingButton";

type StakingActionProps = {
  change: HLQTStakeChange<Decimal>;
} & LoadingThemeUiButtonProps;

export const StakingManagerAction: React.FC<React.PropsWithChildren<StakingActionProps>> = ({
  change,
  children,
  ...loadingButtonProps
}) => {
  const { liquity } = useLiquity();

  const [sendTransaction] = useTxFunction(
    "stake",
    change.stakeHLQT
      ? liquity.send.stakeHLQT.bind(liquity.send, change.stakeHLQT)
      : liquity.send.unstakeHLQT.bind(liquity.send, change.unstakeHLQT)
  );

  return (
    <LoadingThemeUiButton {...loadingButtonProps} onClick={sendTransaction}>
      {children}
    </LoadingThemeUiButton>
  );
};
