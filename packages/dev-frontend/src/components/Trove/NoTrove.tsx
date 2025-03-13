/** @jsxImportSource theme-ui */
import React, { useCallback } from "react";
import { Card, Heading, Box, Flex, Button } from "theme-ui";
import { InfoMessage } from "../InfoMessage";
import { useTroveView } from "./context/TroveViewContext";
import { FeatureHighlighter } from "../FeatureHighlighter";

export const NoTrove: React.FC = () => {
  const { dispatchEvent } = useTroveView();

  const handleOpenTrove = useCallback(() => {
    dispatchEvent("OPEN_TROVE_PRESSED");
  }, [dispatchEvent]);

  return (
    <Card>
      <Heading>Trove</Heading>
      <Box sx={{ p: [2, 3] }}>
        <InfoMessage title="You haven't borrowed any HCHF yet.">
          You can borrow HCHF by opening a Trove.
        </InfoMessage>

        <Flex variant="layout.actions">
          <div role="presentation" sx={{ position: "relative", isolation: "isolate" }}>
            <Button sx={{ minWidth: 160 }} onClick={handleOpenTrove}>
              Open Trove
            </Button>

            <div
              role="presentation"
              sx={{
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
      </Box>
    </Card>
  );
};
