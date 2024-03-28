import { Decimal, HLQTYStakeChange } from "@liquity/lib-base";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../Transaction";
import { LoadingButton, LoadingButtonProps } from "../LoadingButton";

type StakingActionProps = {
  change: HLQTYStakeChange<Decimal>;
} & LoadingButtonProps;

export const StakingManagerAction: React.FC<StakingActionProps> = ({
  change,
  children,
  ...loadingButtonProps
}) => {
  const { liquity } = useLiquity();

  const [sendTransaction] = useTransactionFunction(
    "stake",
    change.stakeHLQTY
      ? liquity.send.stakeHLQTY.bind(liquity.send, change.stakeHLQTY)
      : liquity.send.unstakeHLQTY.bind(liquity.send, change.unstakeHLQTY)
  );

  return (
    <LoadingButton {...loadingButtonProps} onClick={sendTransaction}>
      {children}
    </LoadingButton>
  );
};
