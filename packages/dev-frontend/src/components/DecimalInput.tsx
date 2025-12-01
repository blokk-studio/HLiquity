import { Decimal } from "@liquity/lib-base";
import { useId } from "react";
import styles from "./DecimalInput.module.css";
import clsx from "clsx";

export const DecimalInput: React.FC<{
  label: string;
  value: Decimal;
  onInput: (value: Decimal) => void;
  max: Decimal;
  className?: string;
}> = props => {
  const id = useId();

  return (
    <fieldset className={clsx(styles.container, props.className)}>
      <legend className={styles.legend}>{props.label}</legend>

      <button
        type="button"
        aria-controls={id}
        aria-label="Set to 25%"
        onClick={() => {
          props.onInput(props.max.mul(0.25));
        }}
        className={styles.set25}
      >
        25%
      </button>
      <button
        type="button"
        aria-controls={id}
        aria-label="Set to 50%"
        onClick={() => {
          props.onInput(props.max.mul(0.5));
        }}
        className={styles.set50}
      >
        50%
      </button>
      <button
        type="button"
        aria-controls={id}
        aria-label="Set to 75%"
        onClick={() => {
          props.onInput(props.max.mul(0.75));
        }}
        className={styles.set75}
      >
        75%
      </button>
      <button
        type="button"
        aria-controls={id}
        aria-label="Set to maximum"
        onClick={() => {
          props.onInput(props.max);
        }}
        className={styles.setMax}
      >
        max
      </button>

      <label className={styles.inputContainer}>
        <span role="presentation" className={styles.labelText}>
          {props.label}
        </span>

        <input
          id={id}
          type="number"
          value={props.value.toString()}
          onInput={event => {
            let newDecimal = Decimal.ZERO;
            try {
              newDecimal = Decimal.from(event.currentTarget.value);
            } catch {
              // ignore errors (default to 0)
            }

            props.onInput(newDecimal);
          }}
          className={styles.inputField}
        />
      </label>

      <button
        type="button"
        aria-controls={id}
        aria-label="Decrease by 1"
        onClick={() => {
          let newValue = Decimal.ZERO;
          if (props.value.gt(Decimal.ONE)) {
            newValue = props.value.sub(Decimal.ONE);
          }
          props.onInput(newValue);
        }}
        className={styles.minus}
      >
        -
      </button>
      <button
        type="button"
        aria-controls={id}
        aria-label="Increase by 1"
        onClick={() => {
          props.onInput(props.value.add(Decimal.ONE));
        }}
        className={styles.plus}
      >
        +
      </button>
    </fieldset>
  );
};
