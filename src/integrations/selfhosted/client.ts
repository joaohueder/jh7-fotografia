import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Supabase autohospedado (JH7 Gestão Fotográfica)
export const SELF_HOSTED_SUPABASE_URL =
  "https://JH7GestaoEstudioFotografico.vps10189.panel.icontainer.cloud";

// Chave anon (pública, protegida por RLS)
const SELF_HOSTED_SUPABASE_ANON_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3ODUyNjYwMDcsImV4cCI6MjEwMDYyNjAwNywicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.XxcuL4C81AYLxDeambr9HhNa5NAo7Petz8td-EcuqoM";

export const supabase = createClient<Database>(
  SELF_HOSTED_SUPABASE_URL,
  SELF_HOSTED_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: "jh7-auth-token",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
