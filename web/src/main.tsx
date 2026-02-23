import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "~/styles/globals.css";
import { ContextProvider } from "./context/ContextProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <ContextProvider>
    <App />
  </ContextProvider>,
);
