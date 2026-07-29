import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Pencil,
  Phone,
  Plus,
  Clock,
  Heart,
  StickyNote,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserRound,
} from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { IconAction } from "@/components/icon-action";
import { HelpTip } from "@/components/page-help";

import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { useEmpresaAtual } from "@/hooks/use-clientes";
import { useDeleteLead, useLeads, useSalvarLead, type Lead } from "@/hooks/use-leads";
import { isValidPhone, maskPhone } from "@/lib/br-masks";
import { salvarNotaInicial, useNotaInicial } from "@/hooks/use-cliente-notas";
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

/** Leads: contatos interessados, com nome e WhatsApp apenas. */
export default function LeadsList() {
  usePageMeta("Leads — JH7 Gestão Fotográfica", "Contatos interessados no seu estúdio.");

  const navigate = useNavigate();
  const { data: empresaId } = useEmpresaAtual();
  const { data: leads, isLoading, error, refetch: recarregarLeads } = useLeads();
  const salvar = useSalvarLead();
  const remover = useDeleteLead();


  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Lead | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [interesse, setInteresse] = useState("");
  const [alvoExclusao, setAlvoExclusao] = useState<Lead | null>(null);

  const notaInicial = useNotaInicial(editando?.id);

  // Ao abrir a edição, preenche o campo com o interesse inicial já registrado.
  useEffect(() => {
    if (editando && notaInicial.data) setInteresse(notaInicial.data.descricao);
  }, [editando, notaInicial.data]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return leads ?? [];
    return (leads ?? []).filter((l) =>
      [l.nome, l.contato_whatsapp].filter(Boolean).some((v) => String(v).toLowerCase().includes(termo)),
    );
  }, [leads, busca]);

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setWhatsapp("");
    setInteresse("");
    setAberto(true);
  }

  function abrirEdicao(lead: Lead) {
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
    if (!empresaId) return;

    try {
      const leadId = await salvar.mutateAsync({ id: editando?.id, empresaId, nome, whatsapp });
      const interesseMudou = interesse.trim() !== (notaInicial.data?.descricao ?? "").trim();
      if (interesse.trim() && interesseMudou) {
        await salvarNotaInicial(leadId, interesse, "LEADS", editando ? notaInicial.data?.id : null);
        await notaInicial.refetch();
      }
      // Recarrega a lista direto do banco para exibir nome, WhatsApp e nota atualizados.
      await recarregarLeads();
      notifySuccess(editando ? "Lead atualizado." : "Lead cadastrado com sucesso.");
      setAberto(false);
    } catch (err) {
      notifyError(err, { title: "Não foi possível salvar o lead" });
    }
  }

  async function confirmarExclusao() {
    if (!alvoExclusao) return;
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
              <HelpTip text="Leads são pessoas interessadas que ainda não viraram clientes. Aqui você guarda apenas o nome e o WhatsApp para retornar o contato depois. Esta tela se atualiza sozinha: se alguém da sua equipe cadastrar ou alterar um lead, a lista muda automaticamente, sem precisar recarregar a página." />
            </div>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Contatos captados por formulários ou cadastrados manualmente.
            </p>
          </div>
          <Button className="tap-target gap-2" onClick={abrirNovo}>
            <Plus className="h-4 w-4" />
            Novo lead
          </Button>
        </header>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(13rem,100%),1fr))]">
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
            <Button className="tap-target gap-2" onClick={abrirNovo}>
              <Plus className="h-4 w-4" />
              Cadastrar primeiro lead
            </Button>
          </div>
        ) : lista.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum lead encontrado para esta busca.</p>
            <Button variant="ghost" className="tap-target mt-3" onClick={() => setBusca("")}>
              Limpar busca
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {lista.map((l) => (
              <li
                key={l.id}
                className="group flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/30 sm:flex-nowrap"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <UserRound className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-foreground">{l.nome}</span>
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

                  {l.ultima_nota && l.ultima_nota.descricao !== l.interesse?.descricao ? (
                    <div className="flex items-start gap-2 text-sm">
                      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 text-muted-foreground">
                        <span className="font-semibold text-foreground">Última nota:</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {dataHora(l.ultima_nota.created_at)} · {tempoDecorrido(l.ultima_nota.created_at)}
                        </span>
                        {" — "}
                        <span className="line-clamp-2">{l.ultima_nota.descricao}</span>
                      </span>
                    </div>
                  ) : null}


                </div>

                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-semibold text-foreground">
                    <Clock className="h-3 w-3 text-primary" />
                    {duracaoDesde(l.created_at)} de vida
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Criado em {dataHora(l.created_at)}
                  </span>
                </div>

                <div className="flex shrink-0 items-start gap-1">
                  <IconAction
                    label="Editar lead"
                    ariaLabel={`Editar ${l.nome}`}
                    onClick={() => abrirEdicao(l)}
                  >
                    <Pencil className="h-4 w-4" />
                  </IconAction>
                  <IconAction
                    label="Transformar em cliente (abre o cadastro completo)"
                    ariaLabel={`Converter ${l.nome} em cliente`}
                    onClick={() => navigate(`/admin/clientes/novo?lead=${l.id}`)}
                  >
                    <UserCheck className="h-4 w-4" />
                  </IconAction>
                  <IconAction
                    label="Excluir lead"
                    ariaLabel={`Excluir ${l.nome}`}
                    onClick={() => setAlvoExclusao(l)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </IconAction>
                </div>
              </li>
            ))}
          </ul>

        )}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar lead" : "Novo lead"}</DialogTitle>
            <DialogDescription>
              Informe apenas o nome e o WhatsApp. Depois você pode transformar este lead em cliente e
              completar os demais dados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="lead-nome" className="text-xs font-semibold text-muted-foreground">
                Nome
              </label>
              <Input
                id="lead-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome de quem entrou em contato"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lead-whats" className="text-xs font-semibold text-muted-foreground">
                WhatsApp
              </label>
              <Input
                id="lead-whats"
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                inputMode="numeric"
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="lead-interesse" className="text-xs font-semibold text-muted-foreground">
                Interesse inicial do lead
              </label>
              <Textarea
                id="lead-interesse"
                value={interesse}
                onChange={(e) => setInteresse(e.target.value)}
                rows={3}
                placeholder={
                  notaInicial.isLoading && editando
                    ? "Carregando…"
                    : "Ex.: quer ensaio de 15 anos em dezembro, pediu orçamento."
                }
                className="text-base"
              />
              {editando && notaInicial.data ? (
                <p className="text-xs text-muted-foreground">
                  Registrado em {new Date(notaInicial.data.created_at).toLocaleString("pt-BR")}
                  {notaInicial.data.criado_por_nome ? ` por ${notaInicial.data.criado_por_nome}` : ""}.
                  Você pode corrigir este texto se o motivo do primeiro contato foi anotado errado.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  É o motivo pelo qual o lead entrou em contato pela primeira vez. Fica salvo com data,
                  hora e autor. Novas conversas devem ir para o histórico.
                </p>
              )}
            </div>


            {/* Na edição, as ações ficam acima do histórico para não precisar
                rolar até o fim da tela depois de mudar nome/WhatsApp/interesse. */}
            {editando ? (
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" className="tap-target" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button className="tap-target gap-2" onClick={handleSalvar} disabled={salvar.isPending}>
                  {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar lead
                </Button>
              </div>
            ) : null}

            {editando ? (
              <div className="border-t border-border pt-4">
                <ClienteNotas
                  clienteId={editando.id}
                  modulo="LEADS"
                  titulo="Histórico de movimentações"
                  placeholder="Novo retorno, combinado ou andamento da negociação."
                />
              </div>
            ) : null}
          </div>

          {!editando ? (
            <DialogFooter>
              <Button variant="outline" className="tap-target" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button className="tap-target gap-2" onClick={handleSalvar} disabled={salvar.isPending}>
                {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar lead
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

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
