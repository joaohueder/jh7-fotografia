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
import {
  DEFAULT_CUSTOM_COLORS,
  DEFAULT_PALETTE_ID,
  normalizeHex,
  paletteColors,
  paletteVars,
  type CustomColors,
} from "@/lib/palettes";

const STORAGE_KEY = "jh7:layout:palette";
const SYSTEM_KEY = "jh7:layout:palette-system";
const CUSTOM_KEY = "jh7:layout:palette-custom";

const db = supabase as unknown as SupabaseClient;

/** Sentinela: remove as variáveis e deixa o CSS base assumir (tela de login). */
const CSS_DEFAULT = "__css__";

function readCached(key: string) {
  if (typeof window === "undefined") return DEFAULT_PALETTE_ID;
  return window.localStorage.getItem(key) ?? DEFAULT_PALETTE_ID;
}

function readCachedCustom(): CustomColors {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_COLORS;
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return DEFAULT_CUSTOM_COLORS;
    return sanitizeCustom(JSON.parse(raw));
  } catch {
    return DEFAULT_CUSTOM_COLORS;
  }
}

function sanitizeCustom(value: unknown): CustomColors {
  const v = (value ?? {}) as Partial<CustomColors>;
  return {
    primary: normalizeHex(v.primary ?? "", DEFAULT_CUSTOM_COLORS.primary),
    secondary: normalizeHex(v.secondary ?? "", DEFAULT_CUSTOM_COLORS.secondary),
    accent: normalizeHex(v.accent ?? "", DEFAULT_CUSTOM_COLORS.accent),
  };
}

interface PaletteContextValue {
  paletteId: string;
  systemPalette: string;
  customColors: CustomColors;
  systemCustomColors: CustomColors;
  setPalette: (id: string) => void;
  setCustomColors: (colors: CustomColors) => void;
  resetPalette: () => void;
  saveAsSystemPalette: (
    id: string,
    colors?: CustomColors,
  ) => Promise<{ error: Error | null }>;
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
  const [customColors, setCustomColorsState] = useState<CustomColors>(readCachedCustom);
  const [systemCustomColors, setSystemCustomColors] = useState<CustomColors>(DEFAULT_CUSTOM_COLORS);
  const [forcedPalette, setForcedPalette] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeId = forcedPalette ?? paletteId;

  // Aplica as variáveis CSS na raiz sempre que paleta, cores ou tema mudam.
  useEffect(() => {
    const root = document.documentElement;
    const vars = paletteVars(paletteColors(activeId, customColors), theme);

    if (activeId === CSS_DEFAULT) {
      for (const key of Object.keys(vars)) root.style.removeProperty(key);
      return;
    }

    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
  }, [activeId, customColors, theme]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, paletteId);
  }, [paletteId]);

  useEffect(() => {
    window.localStorage.setItem(SYSTEM_KEY, systemPalette);
  }, [systemPalette]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(customColors));
  }, [customColors]);

  // Carrega do banco: preferência do usuário + padrão global.
  useEffect(() => {
    let mounted = true;
    if (!userId) return;

    db.rpc("minha_paleta").then(({ data, error }) => {
      if (!mounted || error) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      if (row.padrao_sistema) setSystemPalette(String(row.padrao_sistema));
      if (row.padrao_cores) setSystemCustomColors(sanitizeCustom(row.padrao_cores));
      if (row.paleta) setPaletteId(String(row.paleta));
      if (row.cores) setCustomColorsState(sanitizeCustom(row.cores));
    });

    return () => {
      mounted = false;
    };
  }, [userId]);

  const persist = useCallback(
    (id: string, colors: CustomColors) => {
      if (!userId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await db
          .from("usuario_preferencias")
          .upsert({ user_id: userId, paleta: id, paleta_cores: colors }, { onConflict: "user_id" });
      }, 400);
    },
    [userId],
  );

  const setPalette = useCallback(
    (id: string) => {
      setPaletteId(id);
      persist(id, customColors);
    },
    [persist, customColors],
  );

  const setCustomColors = useCallback(
    (colors: CustomColors) => {
      const next = sanitizeCustom(colors);
      setCustomColorsState(next);
      persist(paletteId, next);
    },
    [persist, paletteId],
  );

  const resetPalette = useCallback(() => {
    setPaletteId(systemPalette);
    setCustomColorsState(systemCustomColors);
    persist(systemPalette, systemCustomColors);
  }, [persist, systemPalette, systemCustomColors]);

  const saveAsSystemPalette = useCallback(
    async (id: string, colors?: CustomColors) => {
      const nextColors = sanitizeCustom(colors ?? customColors);
      const { error } = await db
        .from("sistema_config")
        .update({ paleta: id, paleta_cores: nextColors })
        .eq("id", true);
      if (!error) {
        setSystemPalette(id);
        setSystemCustomColors(nextColors);
        setPaletteId(id);
        setCustomColorsState(nextColors);
        persist(id, nextColors);
      }
      return { error: (error as Error | null) ?? null };
    },
    [persist, customColors],
  );

  const value = useMemo(
    () => ({
      paletteId,
      systemPalette,
      customColors,
      systemCustomColors,
      setPalette,
      setCustomColors,
      resetPalette,
      saveAsSystemPalette,
      setForcedPalette,
      isDefault: paletteId === systemPalette,
    }),
    [
      paletteId,
      systemPalette,
      customColors,
      systemCustomColors,
      setPalette,
      setCustomColors,
      resetPalette,
      saveAsSystemPalette,
    ],
  );

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette precisa estar dentro de PaletteProvider");
  return ctx;
}

/**
 * Mantém uma paleta fixa enquanto a tela estiver montada.
 * Sem argumento, restaura as cores originais do CSS (tela de login).
 */
export function useForcedPalette(id: string = CSS_DEFAULT) {
  const { setForcedPalette } = usePalette();
  useEffect(() => {
    setForcedPalette(id);
    return () => setForcedPalette(null);
  }, [id, setForcedPalette]);
}
