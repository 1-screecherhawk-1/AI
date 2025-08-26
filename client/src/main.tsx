import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handlers with throttling
let lastErrorTime = 0;
const ERROR_THROTTLE_MS = 1000; // Only log errors once per second

window.addEventListener('unhandledrejection', (event) => {
  const now = Date.now();
  if (now - lastErrorTime > ERROR_THROTTLE_MS) {
    console.error('Unhandled promise rejection:', event.reason);
    lastErrorTime = now;
  }
  // Prevent the default behavior that would log to console
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  const now = Date.now();
  if (now - lastErrorTime > ERROR_THROTTLE_MS) {
    console.error('Global error:', event.error);
    lastErrorTime = now;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
