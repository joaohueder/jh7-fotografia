import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { IconAction } from "@/components/icon-action";
import { HelpTip } from "@/components/page-help";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import {
  notifyError,
  notifySuccess,
  notifyValidation,
  rawErrorMessage,
} from "@/lib/system-message";
import { formatMoney, maskMoney, parseMoney } from "@/lib/br-masks";
import {
  useDeleteServico,
  useSalvarServico,
  useServicos,
  useSetServicoStatus,
  type Servico,
  type ServicoStatus,
} from "@/hooks/use-servicos";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Filtro = "todos" | "ativos" | "inativos";

const LIMITE_VALOR = 999999.99;

function StatusBadge({ status }: { status: ServicoStatus }) {
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

/** Módulo Serviços do painel do administrador da empresa. */
export default function Servicos() {
  usePageMeta(
    "Serviços — JH7 Gestão Fotográfica",
    "Cadastro dos serviços prestados pelo estúdio.",
  );

  const { data: servicos, isLoading, error } = useServicos();
  // Diagnóstico amigável: se a tabela ainda não existe no banco, explicamos o
  // que precisa ser feito em vez de mostrar um erro genérico de conexão.
  const detalheErro = error ? rawErrorMessage(error) : "";
  const tabelaAusente = /servicos|serviços/i.test(detalheErro)
    ? /does not exist|schema cache|relation|not find the table|404/i.test(detalheErro)
    : /schema cache|does not exist/i.test(detalheErro);
  const permissaoDesatualizada =
    /não está vinculado a uma empresa|P0001|permission denied/i.test(detalheErro);

  const salvar = useSalvarServico();
  const setStatus = useSetServicoStatus();
  const remover = useDeleteServico();

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  // Formulário (modal)
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);
  const [nome, setNome] = useState("");
  const [status, setStatusForm] = useState<ServicoStatus>("ATIVO");
  const [custo, setCusto] = useState("");
  const [venda, setVenda] = useState("");
  const [erros, setErros] = useState<{ nome?: string; custo?: string; venda?: string }>({});

  const [alvoStatus, setAlvoStatus] = useState<Servico | null>(null);
  const [alvoExclusao, setAlvoExclusao] = useState<Servico | null>(null);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (servicos ?? []).filter((s) => {
      if (filtro === "ativos" && s.status !== "ATIVO") return false;
      if (filtro === "inativos" && s.status !== "INATIVO") return false;
      if (!termo) return true;
      return s.nome.toLowerCase().includes(termo);
    });
  }, [servicos, busca, filtro]);

  const totais = useMemo(() => {
    const todos = servicos ?? [];
    return {
      total: todos.length,
      ativos: todos.filter((s) => s.status === "ATIVO").length,
      inativos: todos.filter((s) => s.status === "INATIVO").length,
    };
  }, [servicos]);

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setStatusForm("ATIVO");
    setCusto("");
    setVenda("");
    setErros({});
    setAberto(true);
  }

  function abrirEdicao(s: Servico) {
    setEditando(s);
    setNome(s.nome);
    setStatusForm(s.status);
    setCusto(formatMoney(s.valor_custo));
    setVenda(formatMoney(s.valor_venda));
    setErros({});
    setAberto(true);
  }

  function validar() {
    const novos: typeof erros = {};
    const nomeLimpo = nome.trim();
    if (nomeLimpo.length < 2) novos.nome = "Informe o nome do serviço (mínimo 2 caracteres).";

    const c = parseMoney(custo);
    const v = parseMoney(venda);
    if (c === null) novos.custo = "Informe o valor de custo (use 0,00 se não houver).";
    else if (c > LIMITE_VALOR) novos.custo = "O valor de custo deve ser no máximo R$ 999.999,99.";
    if (v === null) novos.venda = "Informe o valor de venda.";
    else if (v > LIMITE_VALOR) novos.venda = "O valor de venda deve ser no máximo R$ 999.999,99.";

    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function submeter() {
    if (!validar()) {
      notifyValidation("Revise os campos destacados para continuar.");
      return;
    }
    try {
      await salvar.mutateAsync({
        id: editando?.id,
        dados: {
          nome: nome.trim(),
          status,
          valor_custo: parseMoney(custo) ?? 0,
          valor_venda: parseMoney(venda) ?? 0,
        },
      });
      notifySuccess(editando ? "Serviço atualizado." : "Serviço cadastrado com sucesso.");
      setAberto(false);
    } catch (err) {
      notifyError(err, { title: "Não foi possível salvar o serviço" });
    }
  }

  async function confirmarStatus() {
    if (!alvoStatus) return;
    try {
      await setStatus.mutateAsync({
        id: alvoStatus.id,
        status: alvoStatus.status === "ATIVO" ? "INATIVO" : "ATIVO",
      });
      notifySuccess(alvoStatus.status === "ATIVO" ? "Serviço inativado." : "Serviço ativado.");
    } catch (err) {
      notifyError(err, { title: "Não foi possível alterar o status" });
    } finally {
      setAlvoStatus(null);
    }
  }

  async function confirmarExclusao() {
    if (!alvoExclusao) return;
    try {
      await remover.mutateAsync(alvoExclusao.id);
      notifySuccess("Serviço excluído.");
    } catch (err) {
      notifyError(err, { title: "Não foi possível excluir o serviço" });
    } finally {
      setAlvoExclusao(null);
    }
  }

  const margem = (s: Servico) => s.valor_venda - s.valor_custo;

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">Serviços</h1>
              <HelpTip text="Aqui ficam os serviços prestados pelo seu estúdio (ensaios, cobertura de eventos, edição, hora extra etc.). Clique em “Novo serviço” para cadastrar informando o nome, se ele está disponível para venda (status), quanto ele custa para você (valor de custo) e por quanto você vende (valor de venda). A diferença entre os dois é a sua margem, calculada automaticamente. Use os botões de cada linha para editar, ativar/inativar ou excluir. Esta tela se atualiza sozinha quando alguém da sua equipe altera algo." />
            </div>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Cadastro dos serviços prestados pelo estúdio.
            </p>
          </div>
          <Button className="tap-target gap-2" onClick={abrirNovo}>
            <Plus className="h-4 w-4" />
            Novo serviço
          </Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { rotulo: "Total de serviços", valor: totais.total, ajuda: "Todos os serviços cadastrados na sua empresa." },
            { rotulo: "Ativos", valor: totais.ativos, ajuda: "Serviços disponíveis para venda." },
            { rotulo: "Inativos", valor: totais.inativos, ajuda: "Serviços que não estão mais sendo oferecidos, mas continuam no histórico." },
          ].map((card) => (
            <div key={card.rotulo} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {card.rotulo}
                <HelpTip text={card.ajuda} />
              </div>
              <p className="mt-1 text-2xl font-bold">{card.valor}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar serviço pelo nome"
              className="pl-9"
              aria-label="Buscar serviço pelo nome"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["todos", "Todos"],
              ["ativos", "Ativos"],
              ["inativos", "Inativos"],
            ] as [Filtro, string][]).map(([valor, rotulo]) => (
              <Button
                key={valor}
                type="button"
                size="sm"
                variant={filtro === valor ? "default" : "outline"}
                onClick={() => setFiltro(valor)}
              >
                {rotulo}
              </Button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-destructive">
                {tabelaAusente
                  ? "O módulo de Serviços ainda não foi instalado no banco de dados"
                  : permissaoDesatualizada
                    ? "As permissões do módulo de Serviços precisam ser atualizadas"
                    : "Não conseguimos carregar os serviços agora"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tabelaAusente || permissaoDesatualizada
                  ? "Peça ao responsável técnico para executar o script sql/38_servicos.sql no banco de dados do sistema. Ele cria a tabela de serviços com as permissões corretas. Depois disso, recarregue esta página."
                  : "Verifique sua conexão e tente novamente em alguns instantes. Se o erro continuar, avise o administrador do sistema."}
              </p>
              <p className="text-xs text-muted-foreground/80">Detalhe técnico: {detalheErro}</p>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando serviços…
            </div>
          ) : lista.length === 0 ? (
            <div className="space-y-3 p-10 text-center">
              <Wrench className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {(servicos ?? []).length === 0
                  ? "Nenhum serviço cadastrado ainda."
                  : "Nenhum serviço encontrado com esses filtros."}
              </p>
              <p className="text-sm text-muted-foreground">
                {(servicos ?? []).length === 0
                  ? "Clique em “Novo serviço” para cadastrar o primeiro serviço prestado pelo estúdio."
                  : "Limpe a busca ou escolha o filtro “Todos” para ver a lista completa."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-[12rem] flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{s.nome}</span>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Custo: R$ {formatMoney(s.valor_custo)} · Venda: R$ {formatMoney(s.valor_venda)} ·{" "}
                      <span className={margem(s) < 0 ? "font-semibold text-destructive" : "font-semibold"}>
                        Margem: R$ {formatMoney(margem(s))}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconAction
                      label="Editar serviço"
                      ariaLabel={`Editar ${s.nome}`}
                      onClick={() => abrirEdicao(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconAction>
                    <IconAction
                      label={s.status === "ATIVO" ? "Inativar serviço" : "Ativar serviço"}
                      ariaLabel={`${s.status === "ATIVO" ? "Inativar" : "Ativar"} ${s.nome}`}
                      onClick={() => setAlvoStatus(s)}
                    >
                      <Power className="h-4 w-4" />
                    </IconAction>
                    <IconAction
                      label="Excluir serviço"
                      ariaLabel={`Excluir ${s.nome}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setAlvoExclusao(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconAction>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Cadastro / edição */}
      <Dialog open={aberto} onOpenChange={(v) => (salvar.isPending ? null : setAberto(v))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar serviço" : "Novo serviço"}</DialogTitle>
            <DialogDescription>
              Os campos marcados com <span className="text-destructive">*</span> são obrigatórios.
              Informe quanto o serviço custa para o estúdio e por quanto ele é vendido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="servico-nome" className="flex items-center gap-1.5">
                Nome do serviço <span className="text-destructive">*</span>
                <HelpTip text="Como o serviço aparece nas listas e propostas. Ex.: Cobertura de Casamento, Hora Extra, Edição Avançada." />
              </Label>
              <Input
                id="servico-nome"
                value={nome}
                maxLength={120}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Cobertura de Casamento"
              />
              {erros.nome ? <p className="text-xs text-destructive">{erros.nome}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Status <span className="text-destructive">*</span>
                <HelpTip text="Ativo: o serviço está disponível para venda. Inativo: continua no histórico, mas não deve mais ser oferecido." />
              </Label>
              <div className="flex gap-2">
                {([
                  ["ATIVO", "Ativo"],
                  ["INATIVO", "Inativo"],
                ] as [ServicoStatus, string][]).map(([valor, rotulo]) => (
                  <Button
                    key={valor}
                    type="button"
                    variant={status === valor ? "default" : "outline"}
                    onClick={() => setStatusForm(valor)}
                  >
                    {rotulo}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="servico-custo" className="flex items-center gap-1.5">
                  Valor de custo <span className="text-destructive">*</span>
                  <HelpTip text="Quanto este serviço custa para o seu estúdio (equipe, deslocamento, fornecedor). Se não houver custo, deixe 0,00." />
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <Input
                    id="servico-custo"
                    inputMode="numeric"
                    value={custo}
                    onChange={(e) => setCusto(maskMoney(e.target.value))}
                    placeholder="0,00"
                  />
                </div>
                {erros.custo ? <p className="text-xs text-destructive">{erros.custo}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="servico-venda" className="flex items-center gap-1.5">
                  Valor de venda <span className="text-destructive">*</span>
                  <HelpTip text="Preço cobrado do cliente por este serviço." />
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <Input
                    id="servico-venda"
                    inputMode="numeric"
                    value={venda}
                    onChange={(e) => setVenda(maskMoney(e.target.value))}
                    placeholder="0,00"
                  />
                </div>
                {erros.venda ? <p className="text-xs text-destructive">{erros.venda}</p> : null}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Margem estimada: R${" "}
              {formatMoney(Math.max((parseMoney(venda) ?? 0) - (parseMoney(custo) ?? 0), -LIMITE_VALOR))}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={salvar.isPending}>
              Cancelar
            </Button>
            <Button onClick={submeter} disabled={salvar.isPending} className="gap-2">
              {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editando ? "Salvar alterações" : "Cadastrar serviço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de status */}
      <AlertDialog open={Boolean(alvoStatus)} onOpenChange={(v) => (v ? null : setAlvoStatus(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alvoStatus?.status === "ATIVO" ? "Inativar serviço?" : "Ativar serviço?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alvoStatus?.status === "ATIVO"
                ? `“${alvoStatus?.nome}” deixará de aparecer como disponível para venda, mas continua no histórico.`
                : `“${alvoStatus?.nome}” voltará a ficar disponível para venda.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarStatus}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={Boolean(alvoExclusao)}
        onOpenChange={(v) => (v ? null : setAlvoExclusao(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              O serviço “{alvoExclusao?.nome}” será removido definitivamente. Se preferir manter o
              histórico, use a opção de inativar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmarExclusao}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelLayout>
  );
}
