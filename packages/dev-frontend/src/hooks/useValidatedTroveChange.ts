import { useMemo } from "react";
import { useMultiWallet } from "../multi_wallet";
import { useConstants } from "./constants";
import { useLiquitySelector } from "@liquity/lib-react";
import {
  selectForTroveChangeValidation,
  validateTroveChange
} from "../components/Trove/validation/validateTroveChange";
import { Trove } from "@liquity/lib-base";
import { Decimal } from "@liquity/lib-base";
import { IsEqual, useEqualValue } from "./useEqualValue";

const paramsEq = (a?: Decimal, b?: Decimal) => (a && b ? a.eq(b) : !a && !b);
const isEqualValidatedTroveChange: IsEqual<ReturnType<typeof validateTroveChange>> = (
  validationA,
  validationB
): boolean => {
  const [a] = validationA;
  const [b] = validationB;

  return !!(
    (a === undefined && b === undefined) ||
    (a &&
      b &&
      a.type === b.type &&
      paramsEq(a.params.borrowHCHF, b.params.borrowHCHF) &&
      paramsEq(a.params.repayHCHF, b.params.repayHCHF) &&
      paramsEq(a.params.depositCollateral, b.params.depositCollateral) &&
      paramsEq(a.params.withdrawCollateral, b.params.withdrawCollateral))
  );
};

/** returns the validated trove change for a difference of troves */
export const useValidatedTroveChange = (
  updatedTrove: Trove,
  /** defaults to the user's current trove */
  previousTrove?: Trove
) => {
  const constants = useConstants();
  const multiWallet = useMultiWallet();
  const state = useLiquitySelector(state => {
    const borrowingRate = state.fees.borrowingRate();
    const validationContext = selectForTroveChangeValidation(state);

    return {
      trove: state.trove,
      borrowingRate,
      validationContext
    };
  });
  const validatedTroveChange = useMemo(() => {
    const validatedTroveChange = validateTroveChange(
      previousTrove ?? state.trove,
      updatedTrove,
      state.borrowingRate,
      state.validationContext,
      constants,
      multiWallet.hasConnection
    );

    return validatedTroveChange;
  }, [state, previousTrove, updatedTrove, constants, multiWallet.hasConnection]);
  const equalValidatedTroveChange = useEqualValue(validatedTroveChange, isEqualValidatedTroveChange);

  return equalValidatedTroveChange;
};
