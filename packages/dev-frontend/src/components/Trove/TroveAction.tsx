import { Decimal, TroveChange } from "@liquity/lib-base";

import { useLiquity } from "../../hooks/LiquityContext";
import { useTxFunction } from "../Transaction";
import { LoadingThemeUiButton, LoadingThemeUiButtonProps } from "../LoadingButton";

type TroveActionProps = {
  transactionId: string;
  change: Exclude<TroveChange<Decimal>, { type: "invalidCreation" }>;
  maxBorrowingRate: Decimal;
  borrowingFeeDecayToleranceMinutes: number;
} & LoadingThemeUiButtonProps;

export const TroveAction: React.FC<React.PropsWithChildren<TroveActionProps>> = ({
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

  const [sendTransaction] = useTxFunction(
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
    <LoadingThemeUiButton {...loadingButtonProps} onClick={sendTransaction}>
      {children}
    </LoadingThemeUiButton>
  );
};
