import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initThemeFromStorage } from "./lib/theme";
import "./styles/global.css";
import "./styles/app.css";
import "./styles/studio.css";

initThemeFromStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
