import { useEffect, useState } from "react";

export type IsEqual<Value> = (a: Value, b: Value) => boolean;

/** uses custom equality checks to reduce state updates for non-referentially equal values */
export const useEqualValue = <Value>(changingValue: Value, isEqual: IsEqual<Value>): Value => {
  const [equalValue, setEqualValue] = useState(changingValue);

  useEffect(() => {
    if (!isEqual(equalValue, changingValue)) {
      setEqualValue(changingValue);
    }
  }, [isEqual, equalValue, changingValue]);

  return equalValue;
};
