import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Largura máxima do sistema (px). Padrão de fábrica: 1200px. */
export const DEFAULT_MAX_WIDTH = 1200;
export const MIN_MAX_WIDTH = 960;
export const MAX_MAX_WIDTH = 1920;

const STORAGE_KEY = "jh7:layout:max-width";

function clampWidth(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_MAX_WIDTH;
  return Math.min(MAX_MAX_WIDTH, Math.max(MIN_MAX_WIDTH, Math.round(value)));
}

function readStored(): number {
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
  /** Atualiza em tempo real (usado enquanto o slider é arrastado). */
  setMaxWidth: (value: number) => void;
  resetMaxWidth: () => void;
  isDefault: boolean;
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export function AppLayoutProvider({ children }: { children: ReactNode }) {
  const [maxWidth, setMaxWidthState] = useState<number>(() => readStored());

  useEffect(() => {
    applyWidth(maxWidth);
    window.localStorage.setItem(STORAGE_KEY, String(maxWidth));
  }, [maxWidth]);

  const setMaxWidth = useCallback((value: number) => {
    setMaxWidthState(clampWidth(value));
  }, []);

  const resetMaxWidth = useCallback(() => {
    setMaxWidthState(DEFAULT_MAX_WIDTH);
  }, []);

  const value = useMemo(
    () => ({
      maxWidth,
      setMaxWidth,
      resetMaxWidth,
      isDefault: maxWidth === DEFAULT_MAX_WIDTH,
    }),
    [maxWidth, setMaxWidth, resetMaxWidth],
  );

  return <AppLayoutContext.Provider value={value}>{children}</AppLayoutContext.Provider>;
}

export function useAppLayout() {
  const ctx = useContext(AppLayoutContext);
  if (!ctx) throw new Error("useAppLayout precisa estar dentro de AppLayoutProvider");
  return ctx;
}
