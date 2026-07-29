/**
 * Armazenamento de sessão sensível ao "Ficar logado por 30 dias".
 *
 * - Flag ligada  → sessão gravada em localStorage e válida por 30 dias corridos.
 * - Flag desligada → sessão gravada em sessionStorage: expira ao fechar a aba/navegador.
 *
 * O adaptador é passado para o cliente Supabase (`auth.storage`), portanto todas as
 * leituras/escritas de token passam por aqui.
 */

export const AUTH_STORAGE_KEY = "jh7-auth-token";
const REMEMBER_FLAG_KEY = "jh7-auth-remember";
const EXPIRES_AT_KEY = "jh7-auth-expires-at";

export const REMEMBER_DAYS = 30;
const REMEMBER_MS = REMEMBER_DAYS * 24 * 60 * 60 * 1000;

const hasWindow = typeof window !== "undefined";

function safeLocal(): Storage | null {
  try {
    return hasWindow ? window.localStorage : null;
  } catch {
    return null;
  }
}

function safeSession(): Storage | null {
  try {
    return hasWindow ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function isRemembered(): boolean {
  return safeLocal()?.getItem(REMEMBER_FLAG_KEY) === "1";
}

/** Define a preferência ANTES do signIn, para a sessão nascer no storage correto. */
export function setRememberMe(remember: boolean) {
  const local = safeLocal();
  if (!local) return;

  if (remember) {
    local.setItem(REMEMBER_FLAG_KEY, "1");
    local.setItem(EXPIRES_AT_KEY, String(Date.now() + REMEMBER_MS));
  } else {
    local.removeItem(REMEMBER_FLAG_KEY);
    local.removeItem(EXPIRES_AT_KEY);
    // Descarta qualquer sessão persistida de um login anterior "lembrado".
    local.removeItem(AUTH_STORAGE_KEY);
  }
}

/** true quando a janela de 30 dias já passou (só se aplica ao modo "lembrado"). */
export function isRememberExpired(): boolean {
  if (!isRemembered()) return false;
  const raw = safeLocal()?.getItem(EXPIRES_AT_KEY);
  if (!raw) return false;
  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt)) return false;
  return Date.now() > expiresAt;
}

export function clearRememberState() {
  const local = safeLocal();
  local?.removeItem(REMEMBER_FLAG_KEY);
  local?.removeItem(EXPIRES_AT_KEY);
  local?.removeItem(AUTH_STORAGE_KEY);
  safeSession()?.removeItem(AUTH_STORAGE_KEY);
}

function activeStorage(): Storage | null {
  return isRemembered() ? safeLocal() : safeSession();
}

export const authStorage = {
  getItem: (key: string) => {
    // Lê do storage ativo; faz fallback para o outro para não perder sessões
    // criadas antes da troca de preferência.
    const primary = activeStorage()?.getItem(key) ?? null;
    if (primary !== null) return primary;
    const fallback = isRemembered() ? safeSession() : safeLocal();
    return fallback?.getItem(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    activeStorage()?.setItem(key, value);
    // Garante que a cópia no storage não usado não sobreviva.
    const other = isRemembered() ? safeSession() : safeLocal();
    other?.removeItem(key);
  },
  removeItem: (key: string) => {
    safeLocal()?.removeItem(key);
    safeSession()?.removeItem(key);
  },
};
