import { useMemo } from "react";
import { useMultiWallet } from "../multi_wallet";
import { useConstants } from "./constants";
import { useLiquitySelector } from "@liquity/lib-react";
import {
  selectForTroveChangeValidation,
  validateTroveChange
} from "../components/Trove/validation/validateTroveChange";
import { Trove } from "@liquity/lib-base";

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

  return validatedTroveChange;
};
