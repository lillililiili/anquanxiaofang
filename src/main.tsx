import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ResourceProvider } from "./features/resources/ResourceContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ResourceProvider><App /></ResourceProvider>
  </React.StrictMode>
);
