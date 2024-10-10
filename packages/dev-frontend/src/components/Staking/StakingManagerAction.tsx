import { Decimal, HLQTStakeChange } from "@liquity/lib-base";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTxFunction } from "../Transaction";
import { LoadingButton, LoadingButtonProps } from "../LoadingButton";

type StakingActionProps = {
  change: HLQTStakeChange<Decimal>;
} & LoadingButtonProps;

export const StakingManagerAction: React.FC<StakingActionProps> = ({
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
    <LoadingButton {...loadingButtonProps} onClick={sendTransaction}>
      {children}
    </LoadingButton>
  );
};
