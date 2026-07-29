import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * "Acessar como empresa": o SA admin navega pelo painel do administrador de uma
 * empresa sem trocar de sessão. O contexto vive apenas na aba (sessionStorage),
 * então fechar a aba ou sair encerra a visualização.
 */
export interface EmpresaImpersonada {
  id: string;
  nome: string;
}

const STORAGE_KEY = "jh7:impersonacao-empresa";

function ler(): EmpresaImpersonada | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmpresaImpersonada;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

interface ImpersonacaoCtx {
  empresa: EmpresaImpersonada | null;
  impersonando: boolean;
  iniciar: (empresa: EmpresaImpersonada) => void;
  encerrar: () => void;
}

const Ctx = createContext<ImpersonacaoCtx>({
  empresa: null,
  impersonando: false,
  iniciar: () => {},
  encerrar: () => {},
});

export function ImpersonacaoProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<EmpresaImpersonada | null>(() => ler());

  const iniciar = useCallback((alvo: EmpresaImpersonada) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(alvo));
    } catch {
      /* ignora indisponibilidade de storage */
    }
    setEmpresa(alvo);
  }, []);

  const encerrar = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignora */
    }
    setEmpresa(null);
  }, []);

  const value = useMemo(
    () => ({ empresa, impersonando: empresa !== null, iniciar, encerrar }),
    [empresa, iniciar, encerrar],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useImpersonacao() {
  return useContext(Ctx);
}
