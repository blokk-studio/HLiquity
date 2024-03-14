import { Button } from "theme-ui";

import { Decimal, HLQTYStakeChange } from "@liquity/lib-base";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../Transaction";

type StakingActionProps = {
  change: HLQTYStakeChange<Decimal>;
};

export const StakingManagerAction: React.FC<StakingActionProps> = ({ change, children }) => {
  const { liquity } = useLiquity();

  const [sendTransaction] = useTransactionFunction(
    "stake",
    change.stakeHLQTY
      ? liquity.send.stakeHLQTY.bind(liquity.send, change.stakeHLQTY)
      : liquity.send.unstakeHLQTY.bind(liquity.send, change.unstakeHLQTY)
  );

  return <Button onClick={sendTransaction}>{children}</Button>;
};
