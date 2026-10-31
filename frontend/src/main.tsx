import React from "react";
import ReactDOM from "react-dom/client";
import { AppRouter } from "./AppRouter";
import "./typography.css";
import "./styles.css";
import "./reference-design.css";
import "./brand.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);
