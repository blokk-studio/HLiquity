/** @jsxImportSource theme-ui */
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";
import { Text } from "theme-ui";
import { keyframes } from "@emotion/react";

const spin = keyframes({ from: { rotate: "0deg" }, to: { rotate: "360deg" } });
const scale = keyframes({ "0%": { scale: "1" }, "50%": { scale: "1.1" }, "100%": { scale: "1" } });

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
            placeContent: "center",
            animation: `${spin} 2s infinite linear`
          }}
        >
          <span
            role="presentation"
            sx={{
              display: "grid",
              placeContent: "center",
              animation: `${scale} 1s infinite ease`
            }}
          >
            <Icon name="certificate" size="lg" color="#ff755f" />
          </span>
        </span>
      </Tooltip>
    </div>
  );
};
