import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Loader2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { IconAction } from "@/components/icon-action";
import { SA_MENU } from "@/pages/panels/sa/menu";
import {
  useEmpresas,
  useDeleteEmpresa,
  useSetEmpresaStatus,
  fetchEmpresaDependencias,
  type Empresa,
} from "@/hooks/use-empresas";
import { useAssinaturasAtivas } from "@/hooks/use-assinaturas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

/** Sinaliza se a empresa possui uma assinatura vigente. */
function AssinaturaBadge({ plano }: { plano: string | null }) {
  const tem = plano !== null;
  return (
    <span
      className="inline-flex max-w-[12rem] items-center gap-1.5 truncate rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{
        borderColor: tem
          ? "color-mix(in oklab, var(--brand-green) 55%, transparent)"
          : "hsl(var(--border))",
        color: tem ? "var(--brand-green)" : "hsl(var(--muted-foreground))",
        background: tem ? "color-mix(in oklab, var(--brand-green) 12%, transparent)" : undefined,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: tem ? "var(--brand-green)" : "hsl(var(--muted-foreground))" }}
      />
      <span className="truncate">{tem ? plano : "Sem assinatura"}</span>
    </span>
  );
}

type FiltroAssinatura = "TODAS" | "COM" | "SEM";


export default function EmpresasList() {
  usePageMeta("Empresas — JH7 Gestão Fotográfica", "Gestão das empresas do SaaS.");

  const navigate = useNavigate();
  const { data, isLoading, error } = useEmpresas();
  const remove = useDeleteEmpresa();
  const setStatus = useSetEmpresaStatus();
  const { data: assinaturas } = useAssinaturasAtivas();
  const [busca, setBusca] = useState("");
  const [filtroAssinatura, setFiltroAssinatura] = useState<FiltroAssinatura>("TODAS");

  const [alvo, setAlvo] = useState<Empresa | null>(null);
  const [checando, setChecando] = useState(false);
  const [bloqueio, setBloqueio] = useState<string | null>(null);
  const [alvoStatus, setAlvoStatus] = useState<Empresa | null>(null);
  const [nota, setNota] = useState("");

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
    const novas6m = meses.reduce((acc, m) => acc + m.total, 0);
    return { total: list.length, ativos, inativos: list.length - ativos, meses, novas6m };
  }, [data]);

  /** Nenhuma empresa cadastrada (estado vazio real, não filtro de busca). */
  const vazio = !isLoading && !error && (data?.length ?? 0) === 0;

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
      notifySuccess("Empresa excluída.");
      setAlvo(null);
    } catch (err) {
      notifyError(err);
    }
  }

  function abrirStatus(empresa: Empresa) {
    setNota("");
    setAlvoStatus(empresa);
  }

  async function confirmarStatus() {
    if (!alvoStatus) return;
    const inativando = alvoStatus.status === "ATIVO";
    // Justificativa só é exigida ao inativar; ativar é uma ação positiva e direta.
    if (inativando && nota.trim().length < 5) {
      notifyValidation("Informe uma nota com pelo menos 5 caracteres.");
      return;
    }
    const novo = inativando ? "INATIVO" : "ATIVO";
    try {
      await setStatus.mutateAsync({
        id: alvoStatus.id,
        status: novo,
        nota: nota.trim() || (inativando ? "" : "Empresa reativada."),
      });
      notifySuccess(novo === "ATIVO" ? "Empresa ativada." : "Empresa inativada.");
      setAlvoStatus(null);
      setNota("");
    } catch (err) {
      notifyError(err);
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
        {!vazio && (
          <div className="hidden gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(15rem,100%),1fr))] md:grid">
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

            <div className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.25rem)] md:col-span-full">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Novas empresas nos últimos 6 meses
                </h3>
                <p className="text-xs text-muted-foreground">
                  Total de cadastros por mês · {resumo.novas6m}{" "}
                  {resumo.novas6m === 1 ? "empresa" : "empresas"} no período
                </p>
              </div>
              <div className="mt-4 h-[clamp(9rem,18vw,11rem)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resumo.meses}
                    margin={{ top: 20, right: 8, bottom: 0, left: 8 }}
                    barCategoryGap="28%"
                  >
                    <defs>
                      <linearGradient id="empresaBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand-green-soft)" />
                        <stop offset="100%" stopColor="var(--brand-green)" />
                      </linearGradient>
                      <filter id="empresaBarShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow
                          dx="0"
                          dy="2"
                          stdDeviation="2"
                          floodColor="var(--brand-green)"
                          floodOpacity="0.35"
                        />
                      </filter>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      stroke="color-mix(in oklab, var(--border) 70%, transparent)"
                    />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis hide domain={[0, (max: number) => Math.max(1, max)]} />
                    <Tooltip
                      cursor={{ fill: "color-mix(in oklab, var(--muted) 25%, transparent)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const value = payload[0].value as number;
                        return (
                          <div
                            className="rounded-lg border px-2.5 py-1.5 text-xs shadow-lg"
                            style={{
                              background: "var(--card)",
                              borderColor: "var(--border)",
                            }}
                          >
                            <p className="font-semibold text-foreground">
                              {payload[0].payload.mes}
                            </p>
                            <p className="text-muted-foreground">
                              <span
                                className="font-semibold"
                                style={{ color: "var(--brand-green)" }}
                              >
                                {value}
                              </span>{" "}
                              {value === 1 ? "nova empresa" : "novas empresas"}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="total"
                      radius={[5, 5, 2, 2]}
                      minPointSize={3}
                      animationDuration={900}
                      animationBegin={150}
                    >
                      <LabelList
                        dataKey="total"
                        position="top"
                        offset={8}
                        content={(props: {
                          x?: number | string;
                          y?: number | string;
                          width?: number | string;
                          value?: number | string;
                        }) => {
                          const { x, y, width, value } = props;

                          const total = Number(value ?? 0);
                          return (
                            <text
                              x={Number(x) + Number(width) / 2}
                              y={Number(y) - 6}
                              textAnchor="middle"
                              fontSize={12}
                              fontWeight={700}
                              fill={
                                total === 0 ? "var(--muted-foreground)" : "var(--brand-green-soft)"
                              }
                              opacity={total === 0 ? 0.5 : 1}
                            >
                              {total}
                            </text>
                          );
                        }}
                      />
                      {resumo.meses.map((entry) => (
                        <Cell
                          key={`cell-${entry.mes}`}
                          fill={
                            entry.total === 0
                              ? "color-mix(in oklab, var(--muted-foreground) 30%, transparent)"
                              : "url(#empresaBarGradient)"
                          }
                          strokeWidth={0}
                          style={{
                            filter: entry.total === 0 ? undefined : "url(#empresaBarShadow)",
                            transition: "all 0.2s ease",
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {vazio ? null : (
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por razão social, nome fantasia, documento ou cidade"
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
              Você ainda não possui empresas no sistema. Cadastre a primeira para começar a
              gerenciar seus clientes.
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
                    <IconAction
                      variant="outline"
                      size="sm"
                      className="tap-target"
                      label={e.status === "ATIVO" ? "Desativar empresa" : "Ativar empresa"}
                      ariaLabel={`${e.status === "ATIVO" ? "Desativar" : "Ativar"} ${e.nome_fantasia}`}
                      onClick={() => abrirStatus(e)}
                    >
                      <Power className="h-4 w-4" />
                    </IconAction>
                    <IconAction
                      variant="outline"
                      size="sm"
                      className="tap-target text-destructive hover:bg-destructive/10 hover:text-destructive"
                      label="Excluir empresa"
                      ariaLabel={`Excluir ${e.nome_fantasia}`}
                      onClick={() => abrirExclusao(e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconAction>
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
                    <th className="px-4 py-3 font-semibold">CPF/CNPJ</th>
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
                          <IconAction
                            label="Editar empresa"
                            ariaLabel={`Editar ${e.nome_fantasia}`}
                            onClick={() => navigate(`/sa/empresas/${e.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconAction>
                          <IconAction
                            label={e.status === "ATIVO" ? "Desativar empresa" : "Ativar empresa"}
                            ariaLabel={`${e.status === "ATIVO" ? "Desativar" : "Ativar"} ${e.nome_fantasia}`}
                            onClick={() => abrirStatus(e)}
                          >
                            <Power
                              className="h-4 w-4"
                              style={{
                                color:
                                  e.status === "ATIVO"
                                    ? "var(--panel-accent)"
                                    : "var(--muted-foreground)",
                              }}
                            />
                          </IconAction>
                          <IconAction
                            label="Excluir empresa"
                            ariaLabel={`Excluir ${e.nome_fantasia}`}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => abrirExclusao(e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconAction>
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

      <AlertDialog
        open={Boolean(alvoStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setAlvoStatus(null);
            setNota("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alvoStatus?.status === "ATIVO" ? "Inativar empresa" : "Ativar empresa"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alvoStatus?.status === "ATIVO"
                ? `A empresa "${alvoStatus?.nome_fantasia}" ficará inativa. Descreva o motivo desta alteração.`
                : `A empresa "${alvoStatus?.nome_fantasia}" voltará a ficar ativa. Deseja confirmar?`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {alvoStatus?.status === "ATIVO" && (
            <div className="space-y-2">
              <Label htmlFor="nota-status">
                Nota <span style={{ color: "var(--panel-accent)" }}>*</span>
              </Label>
              <Textarea
                id="nota-status"
                value={nota}
                onChange={(ev) => setNota(ev.target.value)}
                placeholder="Ex.: contrato encerrado em 01/2026 por solicitação do cliente."
                rows={3}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                A nota é obrigatória (mínimo 5 caracteres) e fica registrada no histórico da
                empresa.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="tap-target">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="tap-target"
              onClick={(ev) => {
                ev.preventDefault();
                void confirmarStatus();
              }}
              disabled={
                setStatus.isPending || (alvoStatus?.status === "ATIVO" && nota.trim().length < 5)
              }
            >
              {setStatus.isPending
                ? "Salvando…"
                : alvoStatus?.status === "ATIVO"
                  ? "Inativar"
                  : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelLayout>
  );
}
