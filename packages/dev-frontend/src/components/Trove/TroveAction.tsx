import { Decimal, TroveChange } from "@liquity/lib-base";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTransactionFunction } from "../Transaction";
import { LoadingButton, LoadingButtonProps } from "../LoadingButton";

type TroveActionProps = {
  transactionId: string;
  change: Exclude<TroveChange<Decimal>, { type: "invalidCreation" }>;
  maxBorrowingRate: Decimal;
  borrowingFeeDecayToleranceMinutes: number;
} & LoadingButtonProps;

export const TroveAction: React.FC<TroveActionProps> = ({
  children,
  transactionId,
  change,
  maxBorrowingRate,
  borrowingFeeDecayToleranceMinutes,
  ...loadingButtonProps
}) => {
  const { liquity } = useLiquity();

  // TODO: fix?
  borrowingFeeDecayToleranceMinutes;

  const [sendTransaction] = useTransactionFunction(
    transactionId,
    change.type === "creation"
      ? liquity.send.openTrove.bind(
          liquity.send,
          change.params,
          maxBorrowingRate
          // TODO: fix?
          // {
          //   borrowingFeeDecayToleranceMinutes
          // }
        )
      : change.type === "closure"
      ? liquity.send.closeTrove.bind(liquity.send)
      : liquity.send.adjustTrove.bind(
          liquity.send,
          change.params,
          maxBorrowingRate
          // TODO: fix?
          // {
          //   borrowingFeeDecayToleranceMinutes
          // }
        )
  );

  return (
    <LoadingButton {...loadingButtonProps} onClick={sendTransaction}>
      {children}
    </LoadingButton>
  );
};
