import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "jh7:theme";
const DEFAULT_THEME: Theme = "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setForcedTheme: (theme: Theme | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
}

/** Aplica as classes de tema no <html> (tokens + variante `dark:` do Tailwind). */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("theme-light", theme === "light");
  root.classList.toggle("theme-dark", theme === "dark");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  // Telas que impõem um tema (ex.: login sempre escuro) sem alterar a preferência
  const [forcedTheme, setForcedTheme] = useState<Theme | null>(null);

  useEffect(() => {
    applyTheme(forcedTheme ?? theme);
  }, [theme, forcedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* modo privado / storage indisponível: mantém apenas em memória */
    }
  }, []);

  // Sincroniza entre abas abertas do mesmo usuário
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) {
        setThemeState(event.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      setForcedTheme,
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de <ThemeProvider>");
  return ctx;
}

/**
 * Força um tema enquanto a tela estiver montada (ex.: login sempre escuro),
 * restaurando a preferência do usuário ao sair.
 */
export function useForcedTheme(forced: Theme) {
  const { setForcedTheme } = useTheme();

  useEffect(() => {
    setForcedTheme(forced);
    return () => setForcedTheme(null);
  }, [forced, setForcedTheme]);
}
