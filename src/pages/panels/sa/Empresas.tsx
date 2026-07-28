import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { SA_MENU } from "@/pages/panels/sa/menu";
import {
  useEmpresas,
  useDeleteEmpresa,
  fetchEmpresaDependencias,
  type Empresa,
} from "@/hooks/use-empresas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function StatusBadge({ status }: { status: Empresa["status"] }) {
  const ativo = status === "ATIVO";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{
        borderColor: ativo ? "var(--panel-accent)" : "hsl(var(--border))",
        color: ativo ? "var(--panel-accent)" : "hsl(var(--muted-foreground))",
        background: ativo ? "color-mix(in oklab, var(--panel-accent) 12%, transparent)" : undefined,
      }}
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

export default function EmpresasList() {
  usePageMeta("Empresas — JH7 Gestão Fotográfica", "Gestão das empresas do SaaS.");

  const navigate = useNavigate();
  const { data, isLoading, error } = useEmpresas();
  const remove = useDeleteEmpresa();
  const [busca, setBusca] = useState("");
  const [alvo, setAlvo] = useState<Empresa | null>(null);
  const [checando, setChecando] = useState(false);
  const [bloqueio, setBloqueio] = useState<string | null>(null);

  const resumo = useMemo(() => {
    const list = data ?? [];
    const ativos = list.filter((e) => e.status === "ATIVO").length;
    const meses: { mes: string; total: number }[] = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const total = list.filter((e) => {
        const d = new Date(e.created_at);
        return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
      }).length;
      meses.push({
        mes: ref.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        total,
      });
    }
    return { total: list.length, ativos, inativos: list.length - ativos, meses };
  }, [data]);

  const empresas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    const list = data ?? [];
    if (!term) return list;
    return list.filter((e) =>
      [e.razao_social, e.nome_fantasia, e.cnpj, e.cidade ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [data, busca]);

  async function abrirExclusao(empresa: Empresa) {
    setAlvo(empresa);
    setBloqueio(null);
    setChecando(true);
    try {
      const deps = await fetchEmpresaDependencias(empresa.id);
      if (deps.usuarios > 0) {
        setBloqueio(
          `Esta empresa possui ${deps.usuarios} usuário(s) vinculado(s). Remova as dependências antes de excluir.`,
        );
      }
    } catch (err) {
      setBloqueio((err as Error).message);
    } finally {
      setChecando(false);
    }
  }

  async function confirmarExclusao() {
    if (!alvo) return;
    try {
      await remove.mutateAsync(alvo.id);
      toast.success("Empresa excluída.");
      setAlvo(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <PanelLayout accent="sa" menu={SA_MENU}>
      <div className="space-y-[clamp(1.25rem,4vw,2rem)]">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">Empresas</h1>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Empresas clientes do SaaS.
            </p>
          </div>
          <Button asChild className="tap-target">
            <Link to="/sa/empresas/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova empresa
            </Link>
          </Button>
        </header>

        {/* Indicadores: apenas em telas médias/grandes (ocultos no mobile). */}
        <div className="hidden gap-3 md:grid [grid-template-columns:repeat(auto-fit,minmax(min(15rem,100%),1fr))]" hidden={vazio}>
          <div className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.25rem)]">
            <h3 className="text-sm font-semibold text-muted-foreground">Empresas cadastradas</h3>
            <p
              className="mt-2 text-[clamp(1.75rem,6vw,2rem)] font-bold leading-tight"
              style={{ color: "var(--panel-accent)" }}
            >
              {resumo.total}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.25rem)]">
            <h3 className="text-sm font-semibold text-muted-foreground">Ativos x Inativos</h3>
            <div className="mt-2 flex items-baseline gap-3">
              <p
                className="text-[clamp(1.75rem,6vw,2rem)] font-bold leading-tight"
                style={{ color: "var(--panel-accent)" }}
              >
                {resumo.ativos}
              </p>
              <span className="text-muted-foreground">/</span>
              <p className="text-[clamp(1.5rem,5vw,1.75rem)] font-bold leading-tight text-muted-foreground">
                {resumo.inativos}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">ativos / inativos</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.25rem)]">
            <h3 className="text-sm font-semibold text-muted-foreground">Últimos 6 meses</h3>
            <div className="mt-2 h-[88px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resumo.meses} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="mes"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="total" fill="var(--panel-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {vazio ? null : (
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por razão social, nome fantasia, CNPJ ou cidade"
            className="h-11 text-base"
            aria-label="Buscar empresas"
          />
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : error ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            Não foi possível carregar as empresas: {(error as Error).message}
          </p>
        ) : vazio ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-[clamp(2.5rem,12vw,4.5rem)] text-center">
            <span
              className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border"
              style={{
                borderColor: "var(--panel-accent)",
                background: "color-mix(in oklab, var(--panel-accent) 12%, transparent)",
              }}
            >
              <Building2 className="h-6 w-6" style={{ color: "var(--panel-accent)" }} />
            </span>
            <h2 className="text-[clamp(1.125rem,4vw,1.375rem)] font-bold tracking-tight">
              Nenhuma empresa cadastrada
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Você ainda não possui empresas no sistema. Cadastre a primeira para começar a gerenciar
              seus clientes.
            </p>
            <Button asChild className="tap-target mt-6">
              <Link to="/sa/empresas/nova">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar nova empresa
              </Link>
            </Button>
          </div>
        ) : empresas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Building2 className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa encontrada para esta busca.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: cards empilhados */}
            <ul className="grid gap-3 md:hidden">
              {empresas.map((e) => (
                <li key={e.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{e.nome_fantasia}</p>
                      <p className="truncate text-sm text-muted-foreground">{e.razao_social}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{e.cnpj}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="tap-target flex-1"
                      onClick={() => navigate(`/sa/empresas/${e.id}`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="tap-target"
                      aria-label={`Excluir ${e.nome_fantasia}`}
                      onClick={() => abrirExclusao(e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: tabela com scroll horizontal controlado */}
            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
              <table className="w-full min-w-[48rem] text-sm">
                <thead className="bg-surface/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome fantasia</th>
                    <th className="px-4 py-3 font-semibold">Razão social</th>
                    <th className="px-4 py-3 font-semibold">CNPJ</th>
                    <th className="px-4 py-3 font-semibold">Cidade/UF</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {empresas.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{e.nome_fantasia}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.razao_social}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.cnpj}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[e.cidade, e.uf].filter(Boolean).join("/") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${e.nome_fantasia}`}
                            onClick={() => navigate(`/sa/empresas/${e.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Excluir ${e.nome_fantasia}`}
                            onClick={() => abrirExclusao(e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
            <AlertDialogTitle>Excluir empresa</AlertDialogTitle>
            <AlertDialogDescription>
              {checando
                ? "Verificando dependências…"
                : bloqueio
                  ? bloqueio
                  : `Tem certeza que deseja excluir "${alvo?.nome_fantasia}"? O usuário administrador da empresa também será removido. Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="tap-target">Cancelar</AlertDialogCancel>
            {!bloqueio && !checando ? (
              <AlertDialogAction
                className="tap-target bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(ev) => {
                  ev.preventDefault();
                  void confirmarExclusao();
                }}
                disabled={remove.isPending}
              >
                {remove.isPending ? "Excluindo…" : "Excluir"}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelLayout>
  );
}
