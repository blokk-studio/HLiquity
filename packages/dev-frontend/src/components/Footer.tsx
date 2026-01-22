/** @jsxImportSource theme-ui */
import React, { useEffect, useState } from "react";
import { ImprintItem } from "./ImprintItem";
import { Link as RouteLink } from "./Link";
import { Box, Flex, Link } from "theme-ui";
import { Icon } from "./Icon.tsx";
import { Tooltip } from "./Tooltip.tsx";

export const Footer: React.FC = () => {
  const [email, setEmail] = useState("");
  useEffect(() => {
    setEmail(atob("aGxpcXVpdHlAYmxva2suc3R1ZGlv"));
  }, []);

  return (
    <Box variant="layout.footer">
      <footer>
        <ul sx={{
          gap: 16,
          p: 0,
          listStyleType: "none",
          display: ["block", "flex"]
        }}>
          <ImprintItem title="Contact">
            <address sx={{ display: "flex", flexDirection: "column", fontStyle: "normal" }}>
              <Link variant="links.footer" href="https://blokk.studio/" target="_blank">
                blokk.
              </Link>
              {email && (
                <Link variant="links.footer" href={`mailto:${email}`} target="_blank">
                  Feedback and Suggestions?
                </Link>
              )}
            </address>
          </ImprintItem>
          <ImprintItem title="Legal Stuff">
            <RouteLink variant="links.footer" to="/imprint">Imprint</RouteLink>
            <RouteLink variant="links.footer" to="/disclaimer">Disclaimer</RouteLink>
            <RouteLink variant="links.footer" to="/privacy-policy">Privacy policy</RouteLink>
          </ImprintItem>
          <ImprintItem title="Social Media">
            <Flex sx={{ gap: 16 }}>
              <Tooltip message="Visit on X" placement="top">
                <Link sx={{ "&:hover": { transform: "scale(1.05)" } }} href="https://x.com/blokkstudio" target="_blank">
                  <Icon name="twitter" />
                </Link>
              </Tooltip>

              <Tooltip message="Visit on Github" placement="top">
                <Link sx={{ "&:hover": { transform: "scale(1.05)" } }} href="https://github.com/blokk-studio"
                      target="_blank">
                  <Icon name="github" />
                </Link>
              </Tooltip>
            </Flex>
          </ImprintItem>
        </ul>
      </footer>
    </Box>
  );
};
