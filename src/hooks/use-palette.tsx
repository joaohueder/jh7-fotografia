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
import { useTheme } from "@/hooks/use-theme";
import { DEFAULT_PALETTE_ID, getPalette, paletteVars } from "@/lib/palettes";

const STORAGE_KEY = "jh7:layout:palette";
const SYSTEM_KEY = "jh7:layout:palette-system";

const db = supabase as unknown as SupabaseClient;

function readCached(key: string) {
  if (typeof window === "undefined") return DEFAULT_PALETTE_ID;
  return window.localStorage.getItem(key) ?? DEFAULT_PALETTE_ID;
}

interface PaletteContextValue {
  /** Paleta em uso pelo usuário logado. */
  paletteId: string;
  /** Paleta padrão definida pelo super admin. */
  systemPalette: string;
  /** Troca a paleta do usuário (aplica na hora e salva). */
  setPalette: (id: string) => void;
  /** Volta ao padrão do sistema. */
  resetPalette: () => void;
  /** Define a paleta atual como padrão global (somente sa_admin). */
  saveAsSystemPalette: (id: string) => Promise<{ error: Error | null }>;
  /** Força uma paleta enquanto a tela estiver montada (ex.: login). */
  setForcedPalette: (id: string | null) => void;
  isDefault: boolean;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function PaletteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const userId = user?.id ?? null;

  const [paletteId, setPaletteId] = useState<string>(() => readCached(STORAGE_KEY));
  const [systemPalette, setSystemPalette] = useState<string>(() => readCached(SYSTEM_KEY));
  const [forcedPalette, setForcedPalette] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeId = forcedPalette ?? paletteId;

  // Aplica as variáveis CSS na raiz sempre que paleta ou tema mudam.
  useEffect(() => {
    const root = document.documentElement;
    const vars = paletteVars(getPalette(activeId), theme);
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
  }, [activeId, theme]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, paletteId);
  }, [paletteId]);

  useEffect(() => {
    window.localStorage.setItem(SYSTEM_KEY, systemPalette);
  }, [systemPalette]);

  // Carrega do banco: preferência do usuário + padrão global.
  useEffect(() => {
    let mounted = true;
    if (!userId) return;

    db.rpc("minha_paleta").then(({ data, error }) => {
      if (!mounted || error) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      if (row.padrao_sistema) setSystemPalette(String(row.padrao_sistema));
      if (row.paleta) setPaletteId(String(row.paleta));
    });

    return () => {
      mounted = false;
    };
  }, [userId]);

  const persist = useCallback(
    (id: string) => {
      if (!userId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await db
          .from("usuario_preferencias")
          .upsert({ user_id: userId, paleta: id }, { onConflict: "user_id" });
      }, 300);
    },
    [userId],
  );

  const setPalette = useCallback(
    (id: string) => {
      const next = getPalette(id).id;
      setPaletteId(next);
      persist(next);
    },
    [persist],
  );

  const resetPalette = useCallback(() => {
    setPaletteId(systemPalette);
    persist(systemPalette);
  }, [persist, systemPalette]);

  const saveAsSystemPalette = useCallback(
    async (id: string) => {
      const next = getPalette(id).id;
      const { error } = await db.from("sistema_config").update({ paleta: next }).eq("id", true);
      if (!error) {
        setSystemPalette(next);
        setPaletteId(next);
        persist(next);
      }
      return { error: (error as Error | null) ?? null };
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      paletteId,
      systemPalette,
      setPalette,
      resetPalette,
      saveAsSystemPalette,
      setForcedPalette,
      isDefault: paletteId === systemPalette,
    }),
    [paletteId, systemPalette, setPalette, resetPalette, saveAsSystemPalette],
  );

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette precisa estar dentro de PaletteProvider");
  return ctx;
}

/** Mantém a paleta padrão enquanto a tela estiver montada (ex.: login). */
export function useForcedPalette(id: string = DEFAULT_PALETTE_ID) {
  const { setForcedPalette } = usePalette();
  useEffect(() => {
    setForcedPalette(id);
    return () => setForcedPalette(null);
  }, [id, setForcedPalette]);
}
