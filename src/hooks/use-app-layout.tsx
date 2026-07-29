import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useAuth } from "@/hooks/use-auth";

/** Largura máxima do sistema (px). Padrão de fábrica: 1200px. */
export const DEFAULT_MAX_WIDTH = 1200;
export const MIN_MAX_WIDTH = 960;
export const MAX_MAX_WIDTH = 1920;

/** Cache local — evita "pulo" de largura enquanto o banco responde. */
const STORAGE_KEY = "jh7:layout:max-width";

// Tabelas de configuração vivem no Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

function clampWidth(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_MAX_WIDTH;
  return Math.min(MAX_MAX_WIDTH, Math.max(MIN_MAX_WIDTH, Math.round(value)));
}

function readCached(): number {
  if (typeof window === "undefined") return DEFAULT_MAX_WIDTH;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_MAX_WIDTH;
  return clampWidth(Number(raw));
}

/** Aplica a largura na raiz do documento — o CSS lê `--app-max-w`. */
function applyWidth(value: number) {
  document.documentElement.style.setProperty("--app-max-w", `${value}px`);
}

interface AppLayoutContextValue {
  maxWidth: number;
  /** Padrão global definido em sistema_config. */
  systemDefault: number;
  /** Atualiza em tempo real (usado enquanto o slider é arrastado) e salva no banco. */
  setMaxWidth: (value: number) => void;
  /** Volta para o padrão do sistema (remove a preferência do usuário). */
  resetMaxWidth: () => void;
  /** Define a largura atual como padrão do sistema (somente sa_admin). */
  saveAsSystemDefault: () => Promise<{ error: Error | null }>;
  isDefault: boolean;
  isSaving: boolean;
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export function AppLayoutProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [maxWidth, setMaxWidthState] = useState<number>(() => readCached());
  const [systemDefault, setSystemDefault] = useState<number>(DEFAULT_MAX_WIDTH);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aplica no DOM + cache local sempre que muda.
  useEffect(() => {
    applyWidth(maxWidth);
    window.localStorage.setItem(STORAGE_KEY, String(maxWidth));
  }, [maxWidth]);

  // Carrega do banco (preferência do usuário ou padrão do sistema).
  useEffect(() => {
    let mounted = true;
    if (!userId) return;

    db.rpc("meu_layout").then(({ data, error }) => {
      if (!mounted || error) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      if (row.padrao_sistema) setSystemDefault(clampWidth(Number(row.padrao_sistema)));
      if (row.max_width) setMaxWidthState(clampWidth(Number(row.max_width)));
    });

    return () => {
      mounted = false;
    };
  }, [userId]);

  /** Grava a preferência do usuário (debounce — o slider dispara muitos eventos). */
  const persist = useCallback(
    (value: number) => {
      if (!userId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setIsSaving(true);
      saveTimer.current = setTimeout(async () => {
        await db
          .from("usuario_preferencias")
          .upsert({ user_id: userId, max_width: value }, { onConflict: "user_id" });
        setIsSaving(false);
      }, 500);
    },
    [userId],
  );

  const setMaxWidth = useCallback(
    (value: number) => {
      const next = clampWidth(value);
      setMaxWidthState(next);
      persist(next);
    },
    [persist],
  );

  const resetMaxWidth = useCallback(() => {
    setMaxWidthState(systemDefault);
    persist(systemDefault);
  }, [persist, systemDefault]);

  const saveAsSystemDefault = useCallback(async () => {
    const { error } = await db
      .from("sistema_config")
      .update({ max_width: maxWidth })
      .eq("id", true);
    if (!error) setSystemDefault(maxWidth);
    return { error: (error as Error | null) ?? null };
  }, [maxWidth]);

  const value = useMemo(
    () => ({
      maxWidth,
      systemDefault,
      setMaxWidth,
      resetMaxWidth,
      saveAsSystemDefault,
      isDefault: maxWidth === systemDefault,
      isSaving,
    }),
    [maxWidth, systemDefault, setMaxWidth, resetMaxWidth, saveAsSystemDefault, isSaving],
  );

  return <AppLayoutContext.Provider value={value}>{children}</AppLayoutContext.Provider>;
}

export function useAppLayout() {
  const ctx = useContext(AppLayoutContext);
  if (!ctx) throw new Error("useAppLayout precisa estar dentro de AppLayoutProvider");
  return ctx;
}
