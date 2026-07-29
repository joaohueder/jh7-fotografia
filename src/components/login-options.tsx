import { cn } from "@/lib/utils";

export type SocialProvider = "google" | "linkedin" | "facebook";

export interface LoginOptionsProps {
  /** Disparado ao clicar em um dos ícones de provedor. */
  onLoginSocial?: (payload: { provider: SocialProvider }) => void;
  className?: string;
  /** Empilha os ícones verticalmente (útil ao lado de um formulário). */
  orientation?: "horizontal" | "vertical";
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden focusable="false">
    <path
      fill="#4285F4"
      d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.08 7.94-2.93l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.1A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.26a12 12 0 0 0 0 10.74l4.01-3.1Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.1C6.22 6.89 8.87 4.77 12 4.77Z"
    />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden focusable="false">
    <path
      fill="#0A66C2"
      d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.95v5.66H9.34V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden focusable="false">
    <path
      fill="#1877F2"
      d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
    />
  </svg>
);

const PROVIDERS: { id: SocialProvider; label: string; Icon: () => JSX.Element }[] = [
  { id: "google", label: "Entrar com Google", Icon: GoogleIcon },
  { id: "linkedin", label: "Entrar com LinkedIn", Icon: LinkedInIcon },
  { id: "facebook", label: "Entrar com Facebook", Icon: FacebookIcon },
];

export function LoginOptions({
  onLoginSocial,
  className,
  orientation = "horizontal",
}: LoginOptionsProps) {
  return (
    <div
      role="group"
      aria-label="Entrar com uma conta social"
      className={cn(
        "flex items-center justify-center gap-2 py-4",
        orientation === "vertical" ? "flex-col" : "max-w-[150px] flex-row",
        className,
      )}
    >
      {PROVIDERS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => onLoginSocial?.({ provider: id })}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface/60 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-gold/50 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}

export default LoginOptions;
