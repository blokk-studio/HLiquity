import {
  Decimal,
  LiquityStoreState,
  StabilityDeposit,
  StabilityDepositChange
} from "@liquity/lib-base";

import { COIN } from "../../../strings";
import { Amount } from "../../ActionDescription";
import { ErrorDescription } from "../../ErrorDescription";
import { StabilityActionDescription } from "../StabilityActionDescription";
import { WalletNotConnectedInfo } from "../../WalletNotConnectedInfo";

export const selectForStabilityDepositChangeValidation = ({
  trove,
  hchfBalance,
  ownFrontend,
  haveUndercollateralizedTroves
}: LiquityStoreState) => ({
  trove,
  hchfBalance,
  haveOwnFrontend: ownFrontend.status === "registered",
  haveUndercollateralizedTroves
});

type StabilityDepositChangeValidationContext = ReturnType<
  typeof selectForStabilityDepositChangeValidation
> & {
  /** whether a wallet is currently connected */
  hasConnection: boolean;
};

export const validateStabilityDepositChange = (
  originalDeposit: StabilityDeposit,
  editedLUSD: Decimal,
  {
    hchfBalance,
    haveOwnFrontend,
    haveUndercollateralizedTroves,
    hasConnection
  }: StabilityDepositChangeValidationContext
): [
  validChange: StabilityDepositChange<Decimal> | undefined,
  description: JSX.Element | undefined
] => {
  const change = originalDeposit.whatChanged(editedLUSD);

  if (haveOwnFrontend) {
    return [
      undefined,
      <ErrorDescription>
        You can’t deposit using a wallet address that is registered as a frontend.
      </ErrorDescription>
    ];
  }

  if (!change) {
    return [undefined, undefined];
  }

  if (hasConnection && change.depositHCHF?.gt(hchfBalance)) {
    return [
      undefined,
      <ErrorDescription>
        The amount you're trying to deposit exceeds your balance by{" "}
        <Amount>
          {change.depositHCHF.sub(hchfBalance).prettify()} {COIN}
        </Amount>
        .
      </ErrorDescription>
    ];
  }

  if (change.withdrawHCHF && haveUndercollateralizedTroves) {
    return [
      undefined,
      <ErrorDescription>
        You're not allowed to withdraw HCHF from your Stability Deposit when there are
        undercollateralized Troves. Please liquidate those Troves or try again later.
      </ErrorDescription>
    ];
  }

  return [
    change,
    <>
      <StabilityActionDescription originalDeposit={originalDeposit} change={change} />
      {!hasConnection && <WalletNotConnectedInfo />}
    </>
  ];
};
