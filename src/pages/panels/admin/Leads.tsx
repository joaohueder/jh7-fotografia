import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Clock,
  Eye,
  Heart,
  StickyNote,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserRound,
  BadgeCheck,
  RotateCcw,
  UserX,
} from "lucide-react";


import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { HelpTip } from "@/components/page-help";

import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { useEmpresaAtual } from "@/hooks/use-clientes";
import {
  LEAD_SITUACOES,
  useDeleteLead,
  useLeads,
  useLeadsEvolucao,
  useSalvarLead,
  useSituacaoLead,
  type Lead,
  type LeadSituacao,
} from "@/hooks/use-leads";
import { isValidPhone, maskPhone } from "@/lib/br-masks";
import { salvarNotaInicial, useNotaInicial } from "@/hooks/use-cliente-notas";
import { useLimitesEmpresa } from "@/hooks/use-limites";
import { ClienteNotas } from "@/components/cliente-notas";

import { dataHora, duracaoDesde, tempoDecorrido } from "@/lib/tempo";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/** Etiqueta colorida com a situação do lead no funil. */
function SituacaoBadge({ situacao }: { situacao: LeadSituacao }) {
  const mapa = {
    AGUARDANDO: {
      rotulo: "Aguardando",
      icone: Clock,
      classe: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    DESISTIU: {
      rotulo: "Desistiu",
      icone: UserX,
      classe: "border-destructive/40 bg-destructive/10 text-destructive",
    },
    CLIENTE: {
      rotulo: "Virou cliente",
      icone: BadgeCheck,
      classe: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  }[situacao];
  const Icone = mapa.icone;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${mapa.classe}`}
    >
      <Icone className="h-3 w-3" />
      {mapa.rotulo}
    </span>
  );
}

/** Leads: contatos interessados, com nome e WhatsApp apenas. */
export default function LeadsList() {
  usePageMeta("Leads — JH7 Gestão Fotográfica", "Contatos interessados no seu estúdio.");

  const navigate = useNavigate();
  const { data: empresaId } = useEmpresaAtual();
  const { data: leads, isLoading, error, refetch: recarregarLeads } = useLeads();
  const { data: evolucao, isLoading: carregandoEvolucao } = useLeadsEvolucao();
  const salvar = useSalvarLead();
  const remover = useDeleteLead();
  const situacaoLead = useSituacaoLead();
  const { data: limites } = useLimitesEmpresa();

  // Regra de limite: o plano da empresa define quantos leads podem existir.
  const limiteLeads = limites?.limite_leads ?? null;
  const usadoLeads = limites?.usado_leads ?? 0;
  const limiteAtingido = limiteLeads !== null && usadoLeads >= limiteLeads;
  const restantes = limiteLeads === null ? null : Math.max(limiteLeads - usadoLeads, 0);




  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"TODOS" | LeadSituacao>("AGUARDANDO");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Lead | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [interesse, setInteresse] = useState("");
  const [alvoExclusao, setAlvoExclusao] = useState<Lead | null>(null);
  // Lead aguardando confirmação de desistência (abre o modal de confirmação).
  const [alvoDesistencia, setAlvoDesistencia] = useState<Lead | null>(null);
  // Lead cujas notas estão abertas (tela separada da edição de dados).
  const [leadNotas, setLeadNotas] = useState<Lead | null>(null);

  const notaInicial = useNotaInicial(editando?.id);

  // Ao abrir a edição, preenche o campo com o interesse inicial já registrado.
  useEffect(() => {
    if (editando && notaInicial.data) setInteresse(notaInicial.data.descricao);
  }, [editando, notaInicial.data]);

  const contagem = useMemo(() => {
    const base = { AGUARDANDO: 0, DESISTIU: 0, CLIENTE: 0 } as Record<LeadSituacao, number>;
    for (const l of leads ?? []) base[l.situacao] += 1;
    return base;
  }, [leads]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (leads ?? [])
      .filter((l) => (filtro === "TODOS" ? true : l.situacao === filtro))
      .filter((l) =>
        !termo
          ? true
          : [l.nome, l.contato_whatsapp]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(termo)),
      );
  }, [leads, busca, filtro]);

  async function alterarSituacao(lead: Lead, situacao: "AGUARDANDO" | "DESISTIU") {
    if (lead.situacao === "CLIENTE") {
      notifyValidation("Este lead já virou cliente, a situação não pode mais ser alterada.");
      return;
    }
    try {
      await situacaoLead.mutateAsync({ id: lead.id, situacao });
      notifySuccess(
        situacao === "DESISTIU"
          ? "Lead marcado como desistente."
          : "Lead voltou para a lista de aguardando.",
      );
    } catch (err) {
      notifyError(err, { title: "Não foi possível alterar a situação do lead" });
    }
  }

  function abrirNovo() {
    // Nenhum cadastro novo quando a cota de leads do plano já foi usada por completo.
    if (limiteAtingido) {
      notifyValidation(
        `Limite de leads do plano atingido (${usadoLeads} de ${limiteLeads}). Fale com o administrador para contratar um plano maior.`,
      );
      return;
    }
    setEditando(null);
    setNome("");
    setWhatsapp("");
    setInteresse("");
    setAberto(true);
  }


  function abrirEdicao(lead: Lead) {
    // Leads que já viraram clientes são editados apenas na tela de Clientes.
    if (lead.situacao === "CLIENTE") {
      notifyValidation(
        "Este lead já virou cliente. Faça as alterações pela tela de Clientes.",
      );
      return;
    }
    setEditando(lead);
    setNome(lead.nome);
    setWhatsapp(maskPhone(lead.contato_whatsapp ?? ""));
    setInteresse("");
    setAberto(true);
  }

  async function handleSalvar() {
    if (!nome.trim()) {
      notifyValidation("Informe o nome do lead.");
      return;
    }
    if (!isValidPhone(whatsapp)) {
      notifyValidation("Informe um WhatsApp válido com DDD.");
      return;
    }
    if (!interesse.trim()) {
      notifyValidation("Descreva o interesse do lead para registrar o motivo do primeiro contato.");
      return;
    }
    if (!empresaId) return;
    // Revalida o limite no momento de gravar: outra pessoa da equipe pode ter
    // ocupado a última vaga enquanto este formulário estava aberto.
    if (!editando && limiteAtingido) {
      notifyValidation(
        `Limite de leads do plano atingido (${usadoLeads} de ${limiteLeads}). Fale com o administrador para contratar um plano maior.`,
      );
      return;
    }



    try {
      const leadId = await salvar.mutateAsync({ id: editando?.id, empresaId, nome, whatsapp });
      const interesseMudou = interesse.trim() !== (notaInicial.data?.descricao ?? "").trim();
      if (interesse.trim() && interesseMudou) {
        await salvarNotaInicial(leadId, interesse, "LEADS", editando ? notaInicial.data?.id : null);
      }
      // Fecha na hora: a lista e o interesse se atualizam sozinhos logo em seguida,
      // sem deixar o usuário esperando o recarregamento completo da tela.
      notifySuccess(editando ? "Lead atualizado." : "Lead cadastrado com sucesso.");
      setAberto(false);
      void notaInicial.refetch();
      void recarregarLeads();
    } catch (err) {
      notifyError(err, { title: "Não foi possível salvar o lead" });
    }
  }


  async function confirmarDesistencia() {
    if (!alvoDesistencia) return;
    const lead = alvoDesistencia;
    setAlvoDesistencia(null);
    await alterarSituacao(lead, "DESISTIU");
  }

  async function confirmarExclusao() {
    if (!alvoExclusao) return;
    if (alvoExclusao.situacao === "CLIENTE") {
      notifyValidation(
        "Este lead já virou cliente e não pode ser excluído por aqui. Use a tela de Clientes.",
      );
      setAlvoExclusao(null);
      return;
    }
    try {
      await remover.mutateAsync(alvoExclusao.id);
      notifySuccess("Lead excluído.");
    } catch (err) {
      notifyError(err, { title: "Não foi possível excluir o lead" });
    } finally {
      setAlvoExclusao(null);
    }
  }

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">Leads</h1>
              <HelpTip text="Leads são pessoas interessadas que ainda não viraram clientes. Aqui você guarda o nome, o WhatsApp e o interesse para retornar o contato depois. Esta tela se atualiza sozinha: se alguém da sua equipe cadastrar ou alterar um lead, a lista muda automaticamente, sem precisar recarregar a página. Use os filtros para separar quem está aguardando retorno, quem desistiu e quem já virou cliente. O seu plano define quantos leads podem ser cadastrados: quando o limite é atingido, o botão “Novo lead” some e aparece um aviso — o consumo completo fica em Configurações › Limites." />
            </div>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Contatos captados por formulários ou cadastrados manualmente.
            </p>
          </div>
          {limiteAtingido ? null : (
            <div className="flex flex-col items-end gap-1">
              <Button className="tap-target gap-2" onClick={abrirNovo}>
                <Plus className="h-4 w-4" />
                Novo lead
              </Button>
              {restantes !== null ? (
                <span className="text-xs text-muted-foreground">
                  {restantes} cadastro(s) de lead disponíveis no seu plano
                </span>
              ) : null}
            </div>
          )}
        </header>

        {limiteAtingido ? (
          <div className="flex flex-wrap items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-destructive">
                Limite de leads atingido ({usadoLeads} de {limiteLeads})
              </p>
              <p className="text-sm text-muted-foreground">
                O plano contratado pela sua empresa não permite cadastrar novos leads. Você continua
                podendo consultar, editar, registrar notas e converter os leads existentes. Para
                cadastrar mais, fale com o administrador para contratar um plano maior — o consumo
                completo está em Configurações › Limites.
              </p>
            </div>
          </div>
        ) : null}


        <div className="grid gap-4 md:grid-cols-[minmax(13rem,1fr)_2fr]">
          <div className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Total de leads</h3>
              <HelpTip text="Quantidade de contatos interessados guardados até agora." />
            </div>
            <p
              className="mt-2 text-[clamp(1.5rem,5vw,2rem)] font-bold leading-tight"
              style={{ color: "var(--panel-accent)" }}
            >
              {(leads ?? []).length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Evolução dos últimos 6 meses
              </h3>
              <HelpTip text="Mostra quantos leads novos entraram em cada um dos últimos 6 meses e, em barras, quantos deles já viraram clientes. Se um lead virou cliente, ele continua contando no mês em que foi captado, para você acompanhar o histórico real de captação e conversão." />
            </div>
            <div className="mt-3 h-[9rem] w-full">
              {carregandoEvolucao ? (
                <div className="flex h-full items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando gráfico…
                </div>
              ) : (evolucao ?? []).every((m) => m.total === 0) ? (
                <p className="flex h-full items-center text-sm text-muted-foreground">
                  Ainda não há leads captados nos últimos 6 meses.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolucao ?? []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-leads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--panel-accent)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--panel-accent)" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--border))" }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: "0.8rem",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(v: number, name: string) => {
                        const label = name === "clientes" ? "Viraram cliente" : "Captados";
                        return [`${v} lead${v === 1 ? "" : "s"}`, label];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="var(--panel-accent)"
                      strokeWidth={2}
                      fill="url(#grad-leads)"
                    />
                    <Bar
                      dataKey="clientes"
                      fill="var(--panel-accent)"
                      fillOpacity={0.9}
                      radius={[4, 4, 0, 0]}
                      barSize={16}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

          </div>
        </div>


        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Filtrar por situação</span>
            <HelpTip text="Aguardando: contatos ainda em negociação. Desistiu: quem avisou que não tem mais interesse. Virou cliente: leads que já preencheram o cadastro completo." />
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ valor: "TODOS" as const, rotulo: "Todos" }, ...LEAD_SITUACOES].map((op) => {
              const ativo = filtro === op.valor;
              const total =
                op.valor === "TODOS" ? (leads ?? []).length : contagem[op.valor as LeadSituacao];
              return (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => setFiltro(op.valor as "TODOS" | LeadSituacao)}
                  aria-pressed={ativo}
                  className={`tap-target rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    ativo
                      ? "border-transparent text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent/40"
                  }`}
                  style={ativo ? { background: "var(--panel-accent)" } : undefined}
                >
                  {op.rotulo}
                  <span className={ativo ? "ml-1.5 opacity-80" : "ml-1.5 text-foreground/70"}>
                    ({total})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-[16rem] max-w-md space-y-1">
          <label htmlFor="busca-leads" className="text-xs font-semibold text-muted-foreground">
            Buscar lead
          </label>
          <Input
            id="busca-leads"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite o nome ou o WhatsApp…"
            className="h-11 w-full text-base"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando leads…
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
            Não conseguimos carregar os leads agora. Verifique sua conexão e atualize a página. Se
            continuar assim, fale com o suporte JH7.
          </p>
        ) : (leads ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-[clamp(2.5rem,8vw,4rem)] text-center">
            <span
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
                color: "var(--panel-accent)",
              }}
            >
              <UserPlus className="h-8 w-8" />
            </span>
            <div className="space-y-1">
              <h2 className="text-[clamp(1.125rem,4vw,1.375rem)] font-bold tracking-tight">
                Nenhum lead cadastrado ainda
              </h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Cadastre o primeiro contato interessado para não perder nenhuma oportunidade.
              </p>
            </div>
            {limiteAtingido ? null : (
              <Button className="tap-target gap-2" onClick={abrirNovo}>
                <Plus className="h-4 w-4" />
                Cadastrar primeiro lead
              </Button>
            )}

          </div>
        ) : lista.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum lead encontrado com os filtros escolhidos.
            </p>
            <Button
              variant="ghost"
              className="tap-target mt-3"
              onClick={() => {
                setBusca("");
                setFiltro("TODOS");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {lista.map((l) => (
              <li
                key={l.id}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/30"
              >
                {/* Linha de ações — sempre alinhada à direita */}
                <div className="flex flex-wrap justify-end gap-2">
                  {l.situacao === "CLIENTE" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="tap-target gap-2"
                      title="Este lead já virou cliente. O cadastro é editado na tela de Clientes."
                      aria-label={`Abrir cadastro do cliente ${l.nome}`}
                      onClick={() => navigate(`/admin/clientes/${l.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      Ver cadastro do cliente
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="tap-target gap-2"
                        title="Alterar nome, WhatsApp e interesse inicial deste lead."
                        aria-label={`Editar dados de ${l.nome}`}
                        onClick={() => abrirEdicao(l)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar dados
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="tap-target gap-2"
                        title="Ver e adicionar notas de acompanhamento deste lead."
                        aria-label={`Abrir notas do lead ${l.nome}`}
                        onClick={() => setLeadNotas(l)}
                      >
                        <StickyNote className="h-4 w-4" />
                        Notas do lead
                      </Button>
                      {l.situacao === "AGUARDANDO" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="tap-target gap-2"
                          title="Registrar que este contato não tem mais interesse no momento."
                          aria-label={`Marcar ${l.nome} como desistiu`}
                          onClick={() => setAlvoDesistencia(l)}
                        >
                          <UserX className="h-4 w-4" />
                          Marcar desistência
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="tap-target gap-2"
                          title="Voltar este contato para a lista de leads em negociação."
                          aria-label={`Retomar negociação com ${l.nome}`}
                          onClick={() => void alterarSituacao(l, "AGUARDANDO")}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Retomar negociação
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="tap-target gap-2"
                        title="Abre o cadastro completo de cliente já preenchido com os dados do lead."
                        aria-label={`Transformar ${l.nome} em cliente`}
                        onClick={() => navigate(`/admin/clientes/novo?lead=${l.id}`)}
                      >
                        <UserCheck className="h-4 w-4" />
                        Transformar em cliente
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="tap-target gap-2 text-destructive hover:text-destructive"
                        title="Remove o lead definitivamente da lista."
                        aria-label={`Excluir o lead ${l.nome}`}
                        onClick={() => setAlvoExclusao(l)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir lead
                      </Button>
                    </>
                  )}
                </div>

                {/* Dados do lead — alinhados à esquerda abaixo dos botões */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserRound className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-foreground">{l.nome}</span>
                      <SituacaoBadge situacao={l.situacao} />
                      {l.contato_whatsapp ? (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {maskPhone(l.contato_whatsapp)}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="line-clamp-2 text-muted-foreground">
                        <span className="mr-1 font-semibold text-foreground">Interesse do lead:</span>
                        {l.interesse?.descricao ?? "Nenhum interesse registrado ainda."}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 text-muted-foreground">
                        <span className="font-semibold text-foreground">Última nota:</span>{" "}
                        {l.ultima_nota ? (
                          <>
                            <span className="text-xs text-muted-foreground">
                              {dataHora(l.ultima_nota.created_at)} · {tempoDecorrido(l.ultima_nota.created_at)}
                            </span>
                            {" — "}
                            <span className="line-clamp-2">{l.ultima_nota.descricao}</span>
                          </>
                        ) : (
                          "Nenhuma movimentação registrada ainda."
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 text-primary" />
                      <span>{duracaoDesde(l.created_at)} de vida</span>
                      <span>·</span>
                      <span>Criado em {dataHora(l.created_at)}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

        )}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar lead" : "Novo lead"}</DialogTitle>
            <DialogDescription>
              Preencha os dados básicos do contato. O interesse inicial é obrigatório para registrar
              por que essa pessoa entrou em contato com o seu estúdio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="lead-nome" className="text-xs font-semibold text-muted-foreground">
                  Nome <span className="text-destructive">*</span>
                </label>
                <HelpTip text="Nome completo ou pelo nome de como o lead se apresentou. Este campo é obrigatório." />
              </div>
              <Input
                id="lead-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value.slice(0, 100))}
                placeholder="Nome de quem entrou em contato"
                className="h-11 text-base"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {nome.trim().length}/100 caracteres
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="lead-whats" className="text-xs font-semibold text-muted-foreground">
                  WhatsApp <span className="text-destructive">*</span>
                </label>
                <HelpTip text="Número do WhatsApp com DDD. Será usado para retornar o contato. Este campo é obrigatório." />
              </div>
              <Input
                id="lead-whats"
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskPhone(e.target.value.slice(0, 15)))}
                placeholder="(11) 99999-9999"
                inputMode="numeric"
                className="h-11 text-base"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground">
                Digite o DDD + número, com até 11 dígitos.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="lead-interesse" className="text-xs font-semibold text-muted-foreground">
                  Interesse inicial do lead <span className="text-destructive">*</span>
                </label>
                <HelpTip text="Descreva o motivo do primeiro contato. Ex.: ensaio de 15 anos, orçamento de casamento, fotos de newborn. Este campo é obrigatório e fica salvo com data, hora e autor." />
              </div>
              <Textarea
                id="lead-interesse"
                value={interesse}
                onChange={(e) => setInteresse(e.target.value.slice(0, 500))}
                rows={3}
                required
                placeholder={
                  notaInicial.isLoading && editando
                    ? "Carregando…"
                    : "Ex.: quer ensaio de 15 anos em dezembro, pediu orçamento."
                }
                className="text-base"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {interesse.trim().length}/500 caracteres. {editando && notaInicial.data ? (
                  <span>
                    Registrado em {new Date(notaInicial.data.created_at).toLocaleString("pt-BR")}
                    {notaInicial.data.criado_por_nome ? ` por ${notaInicial.data.criado_por_nome}` : ""}.
                    Você pode corrigir este texto se o motivo do primeiro contato foi anotado errado.
                  </span>
                ) : (
                  <span>
                    Novas conversas devem ser registradas no botão "Notas do lead", na lista.
                  </span>
                )}
              </p>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" className="tap-target" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button className="tap-target gap-2" onClick={handleSalvar} disabled={salvar.isPending}>
              {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar lead
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* Notas do lead — tela separada da edição de dados */}
      <Dialog open={!!leadNotas} onOpenChange={(o) => !o && setLeadNotas(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notas do lead</DialogTitle>
            <DialogDescription>
              Registre aqui os retornos, combinados e o andamento da negociação com
              {leadNotas ? ` ${leadNotas.nome}` : " este lead"}. Cada nota fica salva com data, hora
              e quem escreveu. Para mudar nome, WhatsApp ou o interesse inicial, use o botão
              "Editar dados".
            </DialogDescription>
          </DialogHeader>

          {leadNotas ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <span className="mr-1 font-semibold text-foreground">Interesse inicial:</span>
                <span className="text-muted-foreground">
                  {leadNotas.interesse?.descricao ?? "Nenhum interesse registrado ainda."}
                </span>
              </div>
              <ClienteNotas
                clienteId={leadNotas.id}
                modulo="LEADS"
                titulo="Histórico de movimentações"
                placeholder="Novo retorno, combinado ou andamento da negociação."
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="tap-target" onClick={() => setLeadNotas(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <AlertDialog open={!!alvoDesistencia} onOpenChange={(o) => !o && setAlvoDesistencia(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar desistência do lead</AlertDialogTitle>
            <AlertDialogDescription>
              O lead <strong>{alvoDesistencia?.nome}</strong> passará para a situação
              &ldquo;Desistiu&rdquo; e sairá da lista de contatos aguardando retorno. Nada é
              apagado: o histórico continua salvo e você pode retomar a negociação depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarDesistencia}>
              Confirmar desistência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!alvoExclusao} onOpenChange={(o) => !o && setAlvoExclusao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead <strong>{alvoExclusao?.nome}</strong> será
              removido da lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelLayout>
  );
}
