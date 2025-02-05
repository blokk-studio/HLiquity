/** @jsxImportSource theme-ui */
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";
import { Text } from "theme-ui";
import styles from "./NewFeatureDisclaimer.module.css";

export const NewFeatureDisclaimer: React.FC = () => {
  return (
    <div role="presentation" sx={{ display: "inline-block", pointerEvents: "all" }}>
      <Tooltip
        message={
          <Text>
            <em sx={{ fontStyle: "normal", fontWeight: "bold" }}>New Feature, tested on TestNet.</em>{" "}
            Now live, but needs validation on MainNet.
          </Text>
        }
      >
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
      </Tooltip>
    </div>
  );
};
