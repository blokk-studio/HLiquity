import React from "react";
import { createRoot } from "react-dom/client";
import Modal from "react-modal";

import "./index.css";
import App from "./App";
import "./i18n";

Modal.setAppElement("#root");

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
