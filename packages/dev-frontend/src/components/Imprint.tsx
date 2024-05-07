/** @jsxImportSource theme-ui */
import React, { useEffect, useState } from "react";
import { Link } from "theme-ui";

const listSX = {
  width: 200,
  "& a": {
    display: "block",
    mb: 16,
    fontSize: 20
  },
  "& span": {
    display: "block",
    mb: 16,
    fontSize: 20
  }
};

export const Imprint: React.FC = () => {
  const [email, setEmail] = useState("");
  useEffect(() => {
    setEmail(atob("aGVsbG9AYmxva2suc3R1ZGlv"));
  }, []);

  return (
    <ul sx={{ p: 0, listStyleType: "none", display: "inline-flex" }}>
      <li sx={listSX}>
        <h2>Contact</h2>

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
      </li>
      <li sx={listSX}>
        <h2>Legal Stuff</h2>

        <Link href="/">Imprint</Link>
        <Link href="/">Privacy policy</Link>
      </li>
      <li sx={listSX}>
        <h2>Social Media</h2>

        <Link href="/">Twitter</Link>
        <Link href="/">LinkedIn</Link>
        <Link href="/">GitHub</Link>
      </li>
    </ul>
  );
};
