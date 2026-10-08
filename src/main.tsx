import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ResourceProvider } from "./features/resources/ResourceContext";
import "./styles/layout-system.css";
import "./styles.css";
import "./styles/typography-system.css";
import "./styles/workbench-polish.css";
import "./styles/tech-blue-theme.css";
import "./features/resources/resources.css";
import "./styles/expert-government-blue.css";
import "./styles/specialty-tech.css";
import "./styles/visual-data-viz.css";
import "./styles/visual-system.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ResourceProvider><App /></ResourceProvider>
  </React.StrictMode>
);
