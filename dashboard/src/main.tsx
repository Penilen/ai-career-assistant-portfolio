import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Entry point: mount the main React component inside <div id="root"> from index.html.
ReactDOM.createRoot(document.getElementById("root")!).render(
  // StrictMode adds extra development checks; it does not render visible UI.
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
