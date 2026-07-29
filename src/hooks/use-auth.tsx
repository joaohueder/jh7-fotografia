import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import {
  clearRememberState,
  isRememberExpired,
} from "@/integrations/selfhosted/auth-storage";


interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    // Encerra a sessão quando a janela de 30 dias do "ficar logado" expirou.
    async function expirarSePreciso() {
      if (!isRememberExpired()) return false;
      clearRememberState();
      await supabase.auth.signOut();
      if (mounted) {
        setSession(null);
        setUser(null);
      }
      return true;
    }

    expirarSePreciso().then((expirou) => {
      if (expirou) {
        if (mounted) setIsLoading(false);
        return;
      }
      supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (!mounted) return;
        if (sessionError) setError(sessionError);
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setIsLoading(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // Só troca a referência do usuário quando ele realmente muda,
      // evitando re-renders/refetch ao voltar para a aba (TOKEN_REFRESHED).
      setUser((prev) => {
        const next = newSession?.user ?? null;
        if (prev?.id === next?.id) return prev;
        return next;
      });
    });

    // Revalida o prazo ao voltar para a aba (sessão pode ter vencido enquanto ausente).
    function onVisibility() {
      if (document.visibilityState === "visible") void expirarSePreciso();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);


  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signInError) {
      setError(signInError);
      return { error: signInError };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError);
    return { error: signOutError };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, error, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
