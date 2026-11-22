import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { LanguageProvider } from "@/i18n/Language";
import { CatalogProvider } from "@/components/system/CatalogProvider";
import { AuthProvider } from "@/services/auth";
import "@/styles/index.css";
import "maplibre-gl/dist/maplibre-gl.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
    },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root was not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CatalogProvider>
            <LanguageProvider><App /></LanguageProvider>
          </CatalogProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
