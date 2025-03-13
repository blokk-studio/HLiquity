/** @jsxImportSource theme-ui */
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";
import { Text } from "theme-ui";
import styles from "./NewFeatureDisclaimer.module.css";
import { ReactNode } from "react";

export const NewFeatureDisclaimer: React.FC<{ tooltip?: ReactNode }> = props => {
  const spinnerElement = (
    <span
      role="presentation"
      sx={{
        display: "grid",
        placeContent: "center"
      }}
      className={styles.spinAnimation}
    >
      <span
        role="presentation"
        sx={{
          display: "grid",
          placeContent: "center"
        }}
        className={styles.scaleAnimation}
      >
        <Icon name="certificate" size="lg" color="#ff755f" />
      </span>
    </span>
  );
  return (
    <div role="presentation" sx={{ display: "inline-block", pointerEvents: "all" }}>
      {props.tooltip ? <Tooltip message={props.tooltip}>{spinnerElement}</Tooltip> : spinnerElement}
    </div>
  );
};
