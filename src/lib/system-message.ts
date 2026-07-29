/**
 * Store simples (fora do React) para as mensagens do sistema.
 * Assim qualquer arquivo — inclusive fora de componentes — pode disparar o modal
 * chamando `notifyError` / `notifySuccess` / `showMessage`.
 */

export type SystemMessageVariant = "success" | "error" | "warning" | "info";

export interface SystemMessage {
  id: number;
  variant: SystemMessageVariant;
  /** Título curto do modal. */
  title: string;
  /** Explicação amigável: o que aconteceu e o que fazer. */
  description: string;
  /** Mensagem técnica original (quando existir). */
  original?: string;
  /** Contexto extra: código, dica, endpoint... */
  context?: Record<string, string | undefined>;
}

type Listener = (message: SystemMessage | null) => void;

let current: SystemMessage | null = null;
let seq = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(current));
}

export function subscribeSystemMessage(listener: Listener) {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function getSystemMessage() {
  return current;
}

export function dismissSystemMessage() {
  current = null;
  emit();
}

const DEFAULT_TITLES: Record<SystemMessageVariant, string> = {
  success: "Tudo certo",
  error: "Não foi possível concluir",
  warning: "Atenção",
  info: "Informação",
};

export function showMessage(input: {
  variant?: SystemMessageVariant;
  title?: string;
  description: string;
  original?: string;
  context?: Record<string, string | undefined>;
}) {
  const variant = input.variant ?? "info";
  seq += 1;
  current = {
    id: seq,
    variant,
    title: input.title ?? DEFAULT_TITLES[variant],
    description: input.description,
    original: input.original,
    context: input.context,
  };
  emit();
  return current.id;
}

export function notifySuccess(description: string, title?: string) {
  return showMessage({ variant: "success", title, description });
}

export function notifyWarning(description: string, title?: string) {
  return showMessage({ variant: "warning", title, description });
}

export function notifyInfo(description: string, title?: string) {
  return showMessage({ variant: "info", title, description });
}

/** Extrai a mensagem técnica original de qualquer tipo de erro. */
export function rawErrorMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const parts = ["message", "details", "hint", "code"]
      .map((k) => (anyErr[k] ? `${k}: ${String(anyErr[k])}` : null))
      .filter(Boolean);
    if (parts.length) return parts.join("\n");
    try {
      return JSON.stringify(err, null, 2);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

/**
 * Traduz erros técnicos conhecidos (Postgres/Supabase/rede) em uma
 * explicação clara para o usuário final.
 */
export function explainError(raw: string): string {
  const m = raw.toLowerCase();

  if (m.includes("duplicate key") && m.includes("cnpj")) {
    return "Já existe uma empresa cadastrada com este CPF/CNPJ. Verifique o documento informado ou edite a empresa existente.";
  }
  if (m.includes("duplicate key") && (m.includes("email") || m.includes("users"))) {
    return "Este e-mail já está cadastrado no sistema. Utilize outro e-mail para o usuário de acesso.";
  }
  if (m.includes("duplicate key")) {
    return "Já existe um registro com estes dados. Ajuste as informações duplicadas e tente novamente.";
  }
  if (m.includes("invalid input value for enum")) {
    return "Um dos campos foi enviado com um valor não permitido (provavelmente em branco). Revise os campos de seleção e tente novamente.";
  }
  if (m.includes("violates foreign key")) {
    return "Este registro está vinculado a outros dados do sistema e por isso a operação foi recusada. Remova os vínculos antes de continuar.";
  }
  if (m.includes("row-level security") || m.includes("permission denied")) {
    return "Seu usuário não tem permissão para executar esta operação. Fale com o administrador do sistema.";
  }
  if (m.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos. Confira os dados e tente novamente.";
  }
  if (m.includes("jwt") || m.includes("token") || m.includes("session")) {
    return "Sua sessão expirou ou é inválida. Entre novamente para continuar.";
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Não conseguimos falar com o servidor. Verifique sua conexão com a internet e tente novamente.";
  }
  if (m.includes("timeout")) {
    return "O servidor demorou demais para responder. Aguarde alguns instantes e tente novamente.";
  }
  return "Ocorreu um erro ao processar sua solicitação. Confira os dados informados e tente novamente. Se o problema continuar, copie os detalhes abaixo e envie ao suporte.";
}

/**
 * Exibe um erro no modal padrão.
 * - `err`: Error, string ou objeto retornado pela API.
 * - `description`: explicação personalizada (opcional; senão é deduzida).
 */
export function notifyError(
  err: unknown,
  options?: { title?: string; description?: string; context?: Record<string, string | undefined> },
) {
  const original = rawErrorMessage(err);
  return showMessage({
    variant: "error",
    title: options?.title,
    description: options?.description ?? explainError(original),
    original: original || undefined,
    context: options?.context,
  });
}

/** Mensagem de validação de formulário (erro previsível, sem stack técnico). */
export function notifyValidation(description: string, original?: string) {
  return showMessage({
    variant: "warning",
    title: "Revise os dados",
    description,
    original,
  });
}
