import { Link } from "react-router-dom";

import { usePageMeta } from "@/hooks/use-page-meta";

export default function NotFoundPage() {
  usePageMeta("Página não encontrada — JH7 Gestão Fotográfica");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-[var(--gutter)]">
      <div className="max-w-md text-center">
        <h1 className="text-[clamp(3.5rem,14vw,4.5rem)] font-bold leading-none text-foreground">404</h1>
        <h2 className="mt-4 text-[clamp(1.125rem,4vw,1.25rem)] font-semibold text-foreground">
          Página não encontrada
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="tap-target inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>

      </div>
    </div>
  );
}
