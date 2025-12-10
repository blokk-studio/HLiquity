import { Decimal } from "@liquity/lib-base";
import { useId } from "react";
import styles from "./DecimalInput.module.css";
import clsx from "clsx";

const isPropsWithMax = (props: DecimalInputProps): props is { max: Decimal } & DecimalInputProps => {
  return !!props.max;
};

interface DecimalInputProps {
  label: string;
  value: Decimal;
  onInput: (value: Decimal) => void;
  min?: Decimal;
  max?: Decimal;
  className?: string;
}

export const DecimalInput: React.FC<DecimalInputProps> = props => {
  const id = useId();
  const min = props.min ?? Decimal.ZERO;

  return (
    <fieldset className={clsx(styles.container, props.className)}>
      <legend className={styles.legend}>{props.label}</legend>

      {isPropsWithMax(props) && (
        <>
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
        </>
      )}

      <label className={styles.inputContainer}>
        <span role="presentation" className={styles.labelText}>
          {props.label}
        </span>

        <input
          id={id}
          type="number"
          value={props.value.toString()}
          min={min.toString()}
          max={props.max?.toString()}
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
          // carefully decrease, because decimal doesn't support negatives
          if (props.value.gt(Decimal.ONE)) {
            newValue = props.value.sub(Decimal.ONE);
          }

          if (newValue.lt(min)) {
            newValue = min;
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
          let newValue = props.value.add(Decimal.ONE);

          if (props.max && newValue.gt(props.max)) {
            newValue = props.max;
          }

          props.onInput(newValue);
        }}
        className={styles.plus}
      >
        +
      </button>
    </fieldset>
  );
};
