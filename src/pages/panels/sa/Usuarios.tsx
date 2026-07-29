import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Power, ShieldCheck, UserCog, Users } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { SA_MENU } from "@/pages/panels/sa/menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { notifyError, notifySuccess } from "@/lib/system-message";
import {
  useUsuarios,
  useToggleUsuarioAtivo,
  type UsuarioSistema,
  type UsuarioRole,
} from "@/hooks/use-usuarios";

type Filtro = "TODOS" | UsuarioRole;

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "sa_admin", label: "Admin do SaaS" },
  { key: "admin", label: "Admin da empresa" },
  { key: "usuario", label: "Usuários" },
  { key: "sem_papel", label: "Sem papel" },
];

const ROLE_LABEL: Record<UsuarioRole, string> = {
  sa_admin: "Admin do SaaS",
  admin: "Admin da empresa",
  usuario: "Usuário",
  sem_papel: "Sem papel",
};

const ROLE_COR: Record<UsuarioRole, string> = {
  sa_admin: "var(--panel-accent)",
  admin: "var(--brand-green)",
  usuario: "hsl(var(--foreground))",
  sem_papel: "hsl(var(--muted-foreground))",
};

function formataData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function Badge({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{
        borderColor: `color-mix(in oklab, ${cor} 55%, transparent)`,
        color: cor,
        background: `color-mix(in oklab, ${cor} 12%, transparent)`,
      }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: cor }} />
      {children}
    </span>
  );
}

export default function UsuariosList() {
  usePageMeta("Usuários — JH7 Gestão Fotográfica", "Usuários do SaaS, administradores e equipes.");

  const { data, isLoading, error } = useUsuarios();
  const toggle = useToggleUsuarioAtivo();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [alvo, setAlvo] = useState<UsuarioSistema | null>(null);

  const lista = useMemo(() => {
    let list = data ?? [];
    const term = busca.trim().toLowerCase();
    if (term) {
      list = list.filter((u) =>
        [u.nome, u.email ?? "", u.empresa_nome ?? ""].join(" ").toLowerCase().includes(term),
      );
    }
    if (filtro !== "TODOS") list = list.filter((u) => u.role === filtro);
    return list;
  }, [data, busca, filtro]);

  const resumo = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      sa: list.filter((u) => u.role === "sa_admin").length,
      admin: list.filter((u) => u.role === "admin").length,
      usuario: list.filter((u) => u.role === "usuario").length,
    };
  }, [data]);

  function confirmar() {
    if (!alvo) return;
    const proximo = !alvo.ativo;
    toggle.mutate(
      { id: alvo.id, ativo: proximo },
      {
        onSuccess: () =>
          notifySuccess(
            proximo ? "Usuário ativado" : "Usuário inativado",
            `${alvo.nome} foi ${proximo ? "ativado" : "inativado"} com sucesso.`,
          ),
        onError: (err) => notifyError(err, "Não foi possível alterar o acesso do usuário."),
      },
    );
    setAlvo(null);
  }

  return (
    <PanelLayout accent="sa" menu={SA_MENU}>
      <div className="space-y-6">
        <header>
          <h1 className="text-[clamp(1.375rem,5vw,1.75rem)] font-bold tracking-tight">Usuários</h1>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
            Todos os acessos do sistema: SaaS, administradores e usuários das empresas.
          </p>
        </header>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(11rem,100%),1fr))]">
          {[
            { label: "Total", valor: resumo.total, cor: "var(--panel-accent)", Icon: Users },
            { label: "Admin do SaaS", valor: resumo.sa, cor: "var(--panel-accent)", Icon: ShieldCheck },
            { label: "Admin da empresa", valor: resumo.admin, cor: "var(--brand-green)", Icon: UserCog },
            { label: "Usuários", valor: resumo.usuario, cor: "hsl(var(--foreground))", Icon: Users },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-[clamp(0.875rem,3vw,1.25rem)]">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <c.Icon className="h-4 w-4" aria-hidden />
                {c.label}
              </h3>
              <p
                className="mt-2 text-[clamp(1.5rem,6vw,2rem)] font-bold leading-tight"
                style={{ color: c.cor }}
              >
                {c.valor}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou empresa"
            className="h-11 text-base"
            aria-label="Buscar usuários"
          />
          <div
            role="group"
            aria-label="Filtrar por tipo de usuário"
            className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface/50 p-1"
          >
            {FILTROS.map((op) => {
              const ativo = filtro === op.key;
              return (
                <button
                  key={op.key}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setFiltro(op.key)}
                  className="min-h-[var(--tap)] flex-1 whitespace-nowrap rounded-lg px-3 text-[0.8125rem] font-semibold transition-colors"
                  style={{
                    background: ativo
                      ? "color-mix(in oklab, var(--panel-accent) 15%, transparent)"
                      : undefined,
                    color: ativo ? "var(--panel-accent)" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : error ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            Não foi possível carregar os usuários: {(error as Error).message}
          </p>
        ) : lista.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Users className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum usuário encontrado para este filtro.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="grid gap-3 md:hidden">
              {lista.map((u) => (
                <li key={u.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{u.nome}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{u.email ?? "—"}</p>
                    </div>
                    <Badge cor={ROLE_COR[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <p className="col-span-2 truncate">
                      <span className="font-medium text-foreground">Empresa:</span>{" "}
                      {u.empresa_id ? (
                        <Link to={`/sa/empresas/${u.empresa_id}`} className="hover:underline">
                          {u.empresa_nome ?? "—"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Último acesso:</span>{" "}
                      {formataData(u.ultimo_login)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Criado em:</span>{" "}
                      {formataData(u.created_at)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Badge cor={u.ativo ? "var(--brand-green)" : "hsl(var(--destructive))"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setAlvo(u)}>
                      <Power className="mr-1.5 h-4 w-4" />
                      {u.ativo ? "Inativar" : "Ativar"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
              <table className="w-full text-sm">
                <thead className="bg-surface/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Último acesso</th>
                    <th className="px-4 py-3">Situação</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{u.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge cor={ROLE_COR[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.empresa_id ? (
                          <Link to={`/sa/empresas/${u.empresa_id}`} className="hover:underline">
                            {u.empresa_nome ?? "—"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formataData(u.ultimo_login)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge cor={u.ativo ? "var(--brand-green)" : "hsl(var(--destructive))"}>
                          {u.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => setAlvo(u)}>
                          <Power className="mr-1.5 h-4 w-4" />
                          {u.ativo ? "Inativar" : "Ativar"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={Boolean(alvo)} onOpenChange={(open) => !open && setAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alvo?.ativo ? "Inativar usuário?" : "Ativar usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alvo?.ativo
                ? `${alvo?.nome} perderá o acesso ao sistema até ser reativado.`
                : `${alvo?.nome} voltará a ter acesso ao sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmar}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelLayout>
  );
}
