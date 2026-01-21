/** @jsxImportSource theme-ui */
import React, { useEffect, useState } from "react";
import { ImprintItem } from "./ImprintItem";
import { Link as RouteLink } from "./Link";
import { Link } from "theme-ui";

export const Imprint: React.FC = () => {
  const [email, setEmail] = useState("");
  useEffect(() => {
    setEmail(atob("aGxpcXVpdHlAYmxva2suc3R1ZGlv"));
  }, []);

  return (
    <ul sx={{
      p: 0,
      listStyleType: "none",
      display: "inline-flex",
      '@media screen and (max-width: 1023px)': {
        display: "block"
      },
    }}>
      <ImprintItem title="Contact">
        <address sx={{ display: "flex", flexDirection: "column", fontStyle: "normal" }}>
          <span>blokk.</span>
          <Link href="https://blokk.studio/" target="_blank">
            https://blokk.studio/
          </Link>
          {email && (
            <Link href={`mailto:${email}`} target="_blank">
              Feedback and Suggestions?
            </Link>
          )}
        </address>
      </ImprintItem>
      <ImprintItem title="Legal Stuff">
        <RouteLink variant="default" to="/imprint">Imprint</RouteLink>
        <RouteLink variant="default" to="/disclaimer">Disclaimer</RouteLink>
        <RouteLink variant="default" to="/privacy-policy">Privacy policy</RouteLink>
      </ImprintItem>
      <ImprintItem title="Social Media">
        <Link href="https://x.com/blokkstudio" target="_blank">𝕏</Link>
        <Link href="https://github.com/blokk-studio" target="_blank">GitHub</Link>
      </ImprintItem>
    </ul>
  );
};
