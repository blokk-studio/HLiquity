import {
  Decimal,
  Trove,
  TroveAdjustmentParams,
  TroveChange,
  LiquityStoreState,
  TroveClosureParams,
  TroveCreationParams,
  Constants,
  Percent
} from "@liquity/lib-base";

import { COIN, COLLATERAL_COIN } from "../../../strings";

import { ActionDescription, Amount } from "../../ActionDescription";
import { ErrorDescription } from "../../ErrorDescription";
import { WalletNotConnectedInfo } from "../../WalletNotConnectedInfo";

type TroveAdjustmentDescriptionParams = {
  params: TroveAdjustmentParams<Decimal>;
};

const TroveChangeDescription: React.FC<TroveAdjustmentDescriptionParams> = ({ params }) => {
  return (
    <ActionDescription>
      {params.depositCollateral && params.borrowHCHF ? (
        <>
          You will deposit{" "}
          <Amount>
            {params.depositCollateral.prettify()} {COLLATERAL_COIN}
          </Amount>{" "}
          and receive{" "}
          <Amount>
            {params.borrowHCHF.prettify()} {COIN}
          </Amount>
        </>
      ) : params.repayHCHF && params.withdrawCollateral ? (
        <>
          You will pay{" "}
          <Amount>
            {params.repayHCHF.prettify()} {COIN}
          </Amount>{" "}
          and receive{" "}
          <Amount>
            {params.withdrawCollateral.prettify()} {COLLATERAL_COIN}
          </Amount>
        </>
      ) : params.depositCollateral && params.repayHCHF ? (
        <>
          You will deposit{" "}
          <Amount>
            {params.depositCollateral.prettify()} {COLLATERAL_COIN}
          </Amount>{" "}
          and pay{" "}
          <Amount>
            {params.repayHCHF.prettify()} {COIN}
          </Amount>
        </>
      ) : params.borrowHCHF && params.withdrawCollateral ? (
        <>
          You will receive{" "}
          <Amount>
            {params.withdrawCollateral.prettify()} {COLLATERAL_COIN}
          </Amount>{" "}
          and{" "}
          <Amount>
            {params.borrowHCHF.prettify()} {COIN}
          </Amount>
        </>
      ) : params.depositCollateral ? (
        <>
          You will deposit{" "}
          <Amount>
            {params.depositCollateral.prettify()} {COLLATERAL_COIN}
          </Amount>
        </>
      ) : params.withdrawCollateral ? (
        <>
          You will receive{" "}
          <Amount>
            {params.withdrawCollateral.prettify()} {COLLATERAL_COIN}
          </Amount>
        </>
      ) : params.borrowHCHF ? (
        <>
          You will receive{" "}
          <Amount>
            {params.borrowHCHF.prettify()} {COIN}
          </Amount>
        </>
      ) : (
        <>
          You will pay{" "}
          <Amount>
            {params.repayHCHF.prettify()} {COIN}
          </Amount>
        </>
      )}
      .
    </ActionDescription>
  );
};

export const selectForTroveChangeValidation = ({
  price,
  total,
  accountBalance,
  hchfBalance,
  numberOfTroves
}: LiquityStoreState) => ({ price, total, accountBalance, hchfBalance, numberOfTroves });

type TroveChangeValidationSelectedState = ReturnType<typeof selectForTroveChangeValidation>;

interface TroveChangeValidationContext extends TroveChangeValidationSelectedState {
  originalTrove: Trove;
  resultingTrove: Trove;
  recoveryMode: boolean;
  wouldTriggerRecoveryMode: boolean;
  /** whether a wallet is currently connected */
  hasConnection: boolean;
}

export const validateTroveChange = (
  originalTrove: Trove,
  adjustedTrove: Trove,
  borrowingRate: Decimal,
  selectedState: TroveChangeValidationSelectedState,
  constants: Constants,
  /** whether a wallet is currently connected */
  hasConnection: boolean
): [
  validChange: Exclude<TroveChange<Decimal>, { type: "invalidCreation" }> | undefined,
  description: JSX.Element | undefined
] => {
  const { total, price } = selectedState;
  const change = originalTrove.whatChanged(adjustedTrove, borrowingRate);

  if (!change) {
    return [undefined, undefined];
  }

  // Reapply change to get the exact state the Trove will end up in (which could be slightly
  // different from `edited` due to imprecision).
  const resultingTrove = originalTrove.apply(change, borrowingRate);
  const recoveryMode = total.collateralRatioIsBelowCritical(price);
  const wouldTriggerRecoveryMode = total
    .subtract(originalTrove)
    .add(resultingTrove)
    .collateralRatioIsBelowCritical(price);

  const context: TroveChangeValidationContext = {
    ...selectedState,
    originalTrove,
    resultingTrove,
    recoveryMode,
    wouldTriggerRecoveryMode,
    hasConnection
  };

  if (change.type === "invalidCreation") {
    // Trying to create a Trove with negative net debt
    return [
      undefined,
      <ErrorDescription>
        Total debt must be at least{" "}
        <Amount>
          {constants.HCHF_MINIMUM_DEBT.toString()} {COIN}
        </Amount>
        .
      </ErrorDescription>
    ];
  }

  const errorDescription =
    change.type === "creation"
      ? validateTroveCreation(change.params, context, constants)
      : change.type === "closure"
      ? validateTroveClosure(change.params, context, constants)
      : validateTroveAdjustment(change.params, context, constants);

  if (errorDescription) {
    return [undefined, errorDescription];
  }

  return [change, <TroveChangeDescription params={change.params} />];
};

const validateTroveCreation = (
  { depositCollateral, borrowHCHF }: TroveCreationParams<Decimal>,
  {
    resultingTrove,
    recoveryMode,
    wouldTriggerRecoveryMode,
    accountBalance,
    price,
    hasConnection
  }: TroveChangeValidationContext,
  constants: Constants
): JSX.Element | null => {
  if (borrowHCHF.lt(constants.HCHF_MINIMUM_NET_DEBT)) {
    return (
      <ErrorDescription>
        You must borrow at least{" "}
        <Amount>
          {constants.HCHF_MINIMUM_NET_DEBT.toString()} {COIN}
        </Amount>
        .
      </ErrorDescription>
    );
  }

  const ccrPercent = new Percent(constants.CRITICAL_COLLATERAL_RATIO).toString(0);
  const mcrPercent = new Percent(constants.MINIMUM_COLLATERAL_RATIO).toString(0);

  if (recoveryMode) {
    if (!resultingTrove.isOpenableInRecoveryMode(price)) {
      return (
        <ErrorDescription>
          You're not allowed to open a Trove with less than <Amount>{ccrPercent}</Amount> Collateral
          Ratio during recovery mode. Please increase your Trove's Collateral Ratio.
        </ErrorDescription>
      );
    }
  } else {
    if (resultingTrove.collateralRatioIsBelowMinimum(price)) {
      return (
        <ErrorDescription>
          Collateral ratio must be at least <Amount>{mcrPercent}</Amount>.
        </ErrorDescription>
      );
    }

    if (wouldTriggerRecoveryMode) {
      return (
        <ErrorDescription>
          You're not allowed to open a Trove that would cause the Total Collateral Ratio to fall
          below <Amount>{ccrPercent}</Amount>. Please increase your Trove's Collateral Ratio.
        </ErrorDescription>
      );
    }
  }

  if (!hasConnection) {
    return <WalletNotConnectedInfo />;
  }

  if (depositCollateral.gt(accountBalance)) {
    return (
      <ErrorDescription>
        The amount you're trying to deposit exceeds your balance by{" "}
        <Amount>
          {depositCollateral.sub(accountBalance).prettify()} {COLLATERAL_COIN}
        </Amount>
        .
      </ErrorDescription>
    );
  }

  return null;
};

const validateTroveAdjustment = (
  { depositCollateral, withdrawCollateral, borrowHCHF, repayHCHF }: TroveAdjustmentParams<Decimal>,
  {
    originalTrove,
    resultingTrove,
    recoveryMode,
    wouldTriggerRecoveryMode,
    price,
    accountBalance,
    hchfBalance
  }: TroveChangeValidationContext,
  constants: Constants
): JSX.Element | null => {
  const ccrPercent = new Percent(constants.CRITICAL_COLLATERAL_RATIO).toString(0);
  const mcrPercent = new Percent(constants.MINIMUM_COLLATERAL_RATIO).toString(0);

  if (recoveryMode) {
    if (withdrawCollateral) {
      return (
        <ErrorDescription>
          You're not allowed to withdraw collateral during recovery mode.
        </ErrorDescription>
      );
    }

    if (borrowHCHF) {
      if (resultingTrove.collateralRatioIsBelowCritical(price)) {
        return (
          <ErrorDescription>
            Your collateral ratio must be at least <Amount>{ccrPercent}</Amount> to borrow during
            recovery mode. Please improve your collateral ratio.
          </ErrorDescription>
        );
      }

      if (resultingTrove.collateralRatio(price).lt(originalTrove.collateralRatio(price))) {
        return (
          <ErrorDescription>
            You're not allowed to decrease your collateral ratio during recovery mode.
          </ErrorDescription>
        );
      }
    }
  } else {
    if (resultingTrove.collateralRatioIsBelowMinimum(price)) {
      return (
        <ErrorDescription>
          Collateral ratio must be at least <Amount>{mcrPercent}</Amount>.
        </ErrorDescription>
      );
    }

    if (wouldTriggerRecoveryMode) {
      return (
        <ErrorDescription>
          The adjustment you're trying to make would cause the Total Collateral Ratio to fall below{" "}
          <Amount>{ccrPercent}</Amount>. Please increase your Trove's Collateral Ratio.
        </ErrorDescription>
      );
    }
  }

  if (repayHCHF) {
    if (resultingTrove.debt.lt(constants.HCHF_MINIMUM_DEBT)) {
      return (
        <ErrorDescription>
          Total debt must be at least{" "}
          <Amount>
            {constants.HCHF_MINIMUM_DEBT.toString()} {COIN}
          </Amount>
          .
        </ErrorDescription>
      );
    }

    if (repayHCHF.gt(hchfBalance)) {
      return (
        <ErrorDescription>
          The amount you're trying to repay exceeds your balance by{" "}
          <Amount>
            {repayHCHF.sub(hchfBalance).prettify()} {COIN}
          </Amount>
          .
        </ErrorDescription>
      );
    }
  }

  if (depositCollateral?.gt(accountBalance)) {
    return (
      <ErrorDescription>
        The amount you're trying to deposit exceeds your balance by{" "}
        <Amount>
          {depositCollateral.sub(accountBalance).prettify()} {COLLATERAL_COIN}
        </Amount>
        .
      </ErrorDescription>
    );
  }

  return null;
};

const validateTroveClosure = (
  { repayHCHF }: TroveClosureParams<Decimal>,
  {
    recoveryMode,
    wouldTriggerRecoveryMode,
    numberOfTroves,
    hchfBalance
  }: TroveChangeValidationContext,
  constants: Constants
): JSX.Element | null => {
  if (numberOfTroves === 1) {
    return (
      <ErrorDescription>
        You're not allowed to close your Trove when there are no other Troves in the system.
      </ErrorDescription>
    );
  }

  if (recoveryMode) {
    return (
      <ErrorDescription>
        You're not allowed to close your Trove during recovery mode.
      </ErrorDescription>
    );
  }

  if (repayHCHF?.gt(hchfBalance)) {
    return (
      <ErrorDescription>
        You need{" "}
        <Amount>
          {repayHCHF.sub(hchfBalance).prettify()} {COIN}
        </Amount>{" "}
        more to close your Trove.
      </ErrorDescription>
    );
  }

  if (wouldTriggerRecoveryMode) {
    const ccrPercent = new Percent(constants.CRITICAL_COLLATERAL_RATIO).toString(0);

    return (
      <ErrorDescription>
        You're not allowed to close a Trove if it would cause the Total Collateralization Ratio to
        fall below <Amount>{ccrPercent}</Amount>. Please wait until the Total Collateral Ratio
        increases.
      </ErrorDescription>
    );
  }

  return null;
};
