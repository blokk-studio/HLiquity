/** @jsxImportSource theme-ui */
import React, { useEffect, useState } from "react";

export const Imprint: React.FC = () => {
  const [email, setEmail] = useState("");
  useEffect(() => {
    setEmail(atob("aGVsbG9AYmxva2suc3R1ZGlv"));
  }, []);

  return (
    <address sx={{ display: "flex", flexDirection: "column", fontStyle: "normal" }}>
      <span>blokk.</span>
      <span>Dammstrasse 16</span>
      <span>6300 Zug</span>
      <span>Switzerland</span>
      <a href="https://blokk.studio/" target="_blank">
        https://blokk.studio/
      </a>
      {email && (
        <a href={`mailto:${email}`} target="_blank">
          {email}
        </a>
      )}
    </address>
  );
};
