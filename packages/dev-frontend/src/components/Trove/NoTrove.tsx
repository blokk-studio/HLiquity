import React, { useCallback } from "react";
import { Flex } from "theme-ui";
import { InfoMessage } from "../InfoMessage";
import { useTroveView } from "./context/TroveViewContext";
import { FeatureHighlighter } from "../FeatureHighlighter";
import { HeadingWithChildren } from "../shared";
import buttons from "../../styles/buttons.module.css";

export const NoTrove: React.FC = () => {
  const { dispatchEvent } = useTroveView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("OPEN_TROVE_PRESSED");
  }, [dispatchEvent]);

  return (
    <div>
      <HeadingWithChildren text="Trove" />

      <div>
        <InfoMessage title="You haven't borrowed any HCHF yet.">
          You can borrow HCHF by opening a Trove.
        </InfoMessage>

        <Flex variant="layout.actions">
          <div role="presentation" style={{ position: "relative", isolation: "isolate" }}>
            <button className={buttons.normal} onClick={handleOpenTrove}>
              Open Trove
            </button>

            <div
              role="presentation"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "100%",
                pointerEvents: "none",
                display: "grid",
                justifyContent: "end",
                translate: "0.5rem -0.5rem"
              }}
            >
              <FeatureHighlighter />
            </div>
          </div>
        </Flex>
      </div>
    </div>
  );
};
