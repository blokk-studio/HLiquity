/** @jsxImportSource theme-ui */
import React, { useState } from "react";
import { Icon } from "./Icon";

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
  },
  '@media screen and (max-width: 1023px)': {
    display: "block"
  },
};

const listEl = {
  display: "block",
  '@media screen and (max-width: 1023px)': {
    "&.d-none": {
      display: "none"
    },
  },
};

const headerMobile = {
  display: "none",
  cursor: "pointer",
  '@media screen and (max-width: 1023px)': {
    display: "inline-block"
  },
};

const headerDesktop = {
  display: "block",
  '@media screen and (max-width: 1023px)': {
    display: "none"
  },
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
        <Icon name="chevron-down" size="xs" style={{marginLeft: 8, transition: "0.3s", transform: show ? "rotate(0)" : "rotate(-90deg)"}} />
      </h2>
      <h2 sx={headerDesktop}>{title}</h2>

      <div sx={listEl} className={show ? "d-block" : "d-none"}>
        {children}
      </div>
    </li >
  );
};
