import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { wagmiConfig } from "./lib/wagmi";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" toastOptions={{ style: { background: "#1a1a1a", color: "#f1f5f9", border: "1px solid #2a2a2a" } }} />
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
