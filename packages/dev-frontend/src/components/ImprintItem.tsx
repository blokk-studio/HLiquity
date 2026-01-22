/** @jsxImportSource theme-ui */
import React, { useState } from "react";
import { Icon } from "./Icon";

const listSX = {
  width: ["unset", 220],
  "& a": {
    display: "inline-flex",
    width: "fit-content",
    mb: 16,
    fontSize: 20,
  },
  "& span": {
    display: "inline-flex",
    mb: 16,
    fontSize: 20
  },
};

const headerMobile = {
  display: ["inline-block", "none"],
  cursor: "pointer"
};

const headerDesktop = {
  display: ["none", "block"]
};

export const ImprintItem: React.FC<{ children: React.ReactNode, title: string }> = ({ children, title }) => {
  const [show, setShow] = useState(false);

  const toggleList = () => {
    setShow((prevShow) => !prevShow)
  }

  return (
    <li sx={listSX}>
      <h2 sx={headerMobile} onClick={toggleList}>
        {title}
        <Icon name="chevron-down" size="xs"  style={{marginLeft: 8, transition: "0.3s", transform: show ? "rotate(0)" : "rotate(-90deg)"}} />
      </h2>

      <h2 sx={headerDesktop}>{title}</h2>

      <div sx={{display: [show ? "flex" : "none", "flex"], flexDirection: "column"}}>
        {children}
      </div>
    </li >
  );
};
