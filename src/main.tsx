import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { installSupabaseSessionHeaders } from "./lib/supabase-session";
import { installPageRecovery } from "./lib/page-recovery";

installSupabaseSessionHeaders();
installPageRecovery();


const root = document.getElementById("root");
if (!root) throw new Error("Uygulama başlangıç alanı bulunamadı.");
createRoot(root).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
