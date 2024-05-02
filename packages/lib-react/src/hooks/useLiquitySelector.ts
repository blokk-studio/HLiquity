import { useEffect, useState } from "react";

import { LiquityStoreState } from "@liquity/lib-base";

import { equals } from "../utils/equals";
import { useLiquityStore } from "./useLiquityStore";

export const useLiquitySelector = <S, T>(select: (state: LiquityStoreState<T>) => S): S => {
  const store = useLiquityStore<T>();
  const [selectedState, setSelectedState] = useState<S>(select(store.state));

  useEffect(() => {
    const unsubscribe = store.subscribe(({ newState }) => {
      const newSelectedState = select(newState);
      if (equals(newSelectedState, selectedState)) {
        return;
      }

      setSelectedState(newSelectedState);
    });

    return unsubscribe;
  }, [store, select, selectedState]);

  return selectedState;
};
