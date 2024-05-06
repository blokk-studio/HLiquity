import { useEffect, useState } from "react";

import { LiquityStoreListenerParams, LiquityStoreState } from "@liquity/lib-base";

import { equals } from "../utils/equals";
import { useLiquityStore } from "./useLiquityStore";

export const useLiquitySelector = <S, T>(select: (state: LiquityStoreState<T>) => S): S => {
  const store = useLiquityStore<T>();
  const [selectedState, setSelectedState] = useState<S>(select(store.state));

  useEffect(() => {
    const subscriber = (stateUpdate: LiquityStoreListenerParams<T>) => {
      const selectedNewState = select(stateUpdate.newState);
      const selectedOldState = select(stateUpdate.oldState);

      if (equals(selectedNewState, selectedOldState)) {
        return;
      }

      setSelectedState(selectedNewState);
    };

    const unsubscribe = store.subscribe(subscriber);

    return unsubscribe;
  }, [store, select]);

  return selectedState;
};
