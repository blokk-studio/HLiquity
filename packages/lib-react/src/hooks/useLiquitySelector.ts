import { useEffect, useMemo, useState } from "react";

import { LiquityStoreListenerParams, LiquityStoreState } from "@liquity/lib-base";

import { useLiquityStore } from "./useLiquityStore";
import { equals } from "../utils/equals";

export const useLiquitySelector = <S, T>(select: (state: LiquityStoreState<T>) => S): S => {
  const store = useLiquityStore<T>();
  const [storeState, setStoreState] = useState<LiquityStoreState<T>>(store.state);

  useEffect(() => {
    const subscriber = (stateUpdate: LiquityStoreListenerParams<T>) => {
      if (equals(stateUpdate.newState, storeState)) {
        return;
      }

      setStoreState(stateUpdate.newState);
    };

    const unsubscribe = store.subscribe(subscriber);

    return unsubscribe;
  }, [storeState, store, select]);

  const selectedState = useMemo(() => {
    return select(storeState);
  }, [select, storeState]);

  return selectedState;
};
