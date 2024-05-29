/** @jsxImportSource theme-ui */
import React, { useEffect, useState } from "react";
import { Link } from "theme-ui";
import { ImprintItem } from "./ImprintItem";



export const Imprint: React.FC = () => {
  const [email, setEmail] = useState("");
  useEffect(() => {
    setEmail(atob("aGVsbG9AYmxva2suc3R1ZGlv"));
  }, []);

  return (
    <ul sx={{
      p: 0, 
      listStyleType: "none", 
      display: "inline-flex", 
      '@media screen and (max-width: 767px)': {
        display: "block"
      },
    }}>
      <ImprintItem title="Contact">
        <address sx={{ display: "flex", flexDirection: "column", fontStyle: "normal" }}>
          <span>blokk.</span>
          <span>Dammstrasse 16</span>
          <span>6300 Zug</span>
          <span>Switzerland</span>
          <Link href="https://blokk.studio/" target="_blank">
            https://blokk.studio/
          </Link>
          {email && (
            <Link href={`mailto:${email}`} target="_blank">
              {email}
            </Link>
          )}
        </address>
      </ImprintItem>
      <ImprintItem title="Legal Stuff">
        <Link href="/" target="_blank">Imprint</Link>
        <Link href="/" target="_blank">Privacy policy</Link>
      </ImprintItem>
      <ImprintItem title="Social Media">
        <Link href="/" target="_blank">Twitter</Link>
        <Link href="/" target="_blank">LinkedIn</Link>
        <Link href="/" target="_blank">GitHub</Link>
      </ImprintItem>
    </ul>
  );
};
