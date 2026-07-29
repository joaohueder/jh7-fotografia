import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Power,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { IconAction } from "@/components/icon-action";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess } from "@/lib/system-message";
import {
  isMenorDeIdade,
  useClientes,
  useDeleteCliente,
  useSetClienteStatus,
  type Cliente,
} from "@/hooks/use-clientes";
import { maskCpfCnpj } from "@/lib/br-masks";

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

type Filtro = "todos" | "ativos" | "inativos";

function StatusBadge({ status }: { status: Cliente["status"] }) {
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

/** Listagem de clientes da empresa do administrador logado. */
export default function ClientesList() {
  usePageMeta("Clientes — JH7 Gestão Fotográfica", "Gestão dos clientes do estúdio.");

  const navigate = useNavigate();
  const { data: clientes, isLoading, error } = useClientes();
  const setStatus = useSetClienteStatus();
  const remover = useDeleteCliente();

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [alvoStatus, setAlvoStatus] = useState<Cliente | null>(null);
  const [alvoExclusao, setAlvoExclusao] = useState<Cliente | null>(null);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (clientes ?? []).filter((c) => {
      if (filtro === "ativos" && c.status !== "ATIVO") return false;
      if (filtro === "inativos" && c.status !== "INATIVO") return false;
      if (!termo) return true;
      return [c.nome, c.documento, c.contato_email, c.contato_whatsapp, c.cidade]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo));
    });
  }, [clientes, busca, filtro]);

  const totais = useMemo(() => {
    const todos = clientes ?? [];
    return {
      total: todos.length,
      ativos: todos.filter((c) => c.status === "ATIVO").length,
      menores: todos.filter((c) => isMenorDeIdade(c.nascimento)).length,
    };
  }, [clientes]);

  async function confirmarStatus() {
    if (!alvoStatus) return;
    try {
      await setStatus.mutateAsync({
        id: alvoStatus.id,
        status: alvoStatus.status === "ATIVO" ? "INATIVO" : "ATIVO",
      });
      notifySuccess(
        alvoStatus.status === "ATIVO" ? "Cliente inativado." : "Cliente ativado com sucesso.",
      );
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
      notifySuccess("Cliente excluído.");
    } catch (err) {
      notifyError(err, { title: "Não foi possível excluir o cliente" });
    } finally {
      setAlvoExclusao(null);
    }
  }

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">Clientes</h1>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Cadastro dos clientes atendidos pelo estúdio.
            </p>
          </div>
          <Button className="tap-target gap-2" onClick={() => navigate("/admin/clientes/novo")}>
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </header>

        <PageHelp
          title="Como usar a tela de Clientes"
          steps={[
            "Para cadastrar alguém novo, clique em “Novo cliente” e siga as etapas na ordem — nada é salvo até você confirmar no resumo final.",
            "Use a caixa de busca para achar um cliente pelo nome, CPF/CNPJ, telefone, e-mail ou cidade.",
            "Nos botões de cada cliente: o lápis abre para editar, o botão de liga/desliga ativa ou inativa, e a lixeira exclui de vez (sempre pedimos confirmação antes).",
          ]}
        >
          Aqui ficam guardadas as pessoas e empresas que você atende. Inativar um cliente apenas o
          esconde do dia a dia; excluir apaga o cadastro para sempre.
        </PageHelp>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(13rem,100%),1fr))]">
          {[
            {
              title: "Total de clientes",
              value: totais.total,
              hint: "Todos os clientes cadastrados, somando ativos e inativos.",
            },
            {
              title: "Clientes ativos",
              value: totais.ativos,
              hint: "Clientes que você atende normalmente hoje. Inativos continuam salvos, mas fora do dia a dia.",
            },
            {
              title: "Menores de idade",
              value: totais.menores,
              hint: "Clientes com menos de 18 anos. Nesses casos é necessária autorização do responsável.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground">{card.title}</h3>
                <HelpTip text={card.hint} />
              </div>
              <p
                className="mt-2 text-[clamp(1.5rem,5vw,2rem)] font-bold leading-tight"
                style={{ color: "var(--panel-accent)" }}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[16rem] max-w-md flex-1 space-y-1">
            <label htmlFor="busca-clientes" className="text-xs font-semibold text-muted-foreground">
              Buscar cliente
            </label>
            <Input
              id="busca-clientes"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome, CPF/CNPJ, telefone, e-mail ou cidade…"
              className="h-11 w-full text-base"
            />
          </div>
          <div className="flex flex-wrap gap-2 self-end">

            {(
              [
                ["todos", "Todos"],
                ["ativos", "Ativos"],
                ["inativos", "Inativos"],
              ] as [Filtro, string][]
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={filtro === value ? "default" : "outline"}
                className="tap-target"
                onClick={() => setFiltro(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando clientes…
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
            Não foi possível carregar os clientes: {(error as Error).message}
          </p>
        ) : totais.total === 0 ? (
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
                Nenhum cliente cadastrado ainda
              </h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Comece cadastrando o primeiro cliente do seu estúdio para organizar contatos,
                endereços e histórico de atendimentos.
              </p>
            </div>
            <Button className="tap-target gap-2" onClick={() => navigate("/admin/clientes/novo")}>
              <Plus className="h-4 w-4" />
              Cadastrar primeiro cliente
            </Button>
          </div>
        ) : lista.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum cliente encontrado para esta busca ou filtro.
            </p>
            <Button
              variant="ghost"
              className="tap-target mt-3"
              onClick={() => {
                setBusca("");
                setFiltro("todos");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {lista.map((c) => {
              const menor = isMenorDeIdade(c.nascimento);
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold leading-tight">{c.nome}</span>
                      <StatusBadge status={c.status} />
                      {menor ? (
                        <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-destructive px-2 py-0.5 text-[11px] font-bold uppercase text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          Menor de idade
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {c.documento ? <span>{maskCpfCnpj(c.documento)}</span> : null}
                      {c.contato_whatsapp ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {c.contato_whatsapp}
                        </span>
                      ) : null}
                      {c.contato_email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {c.contato_email}
                        </span>
                      ) : null}
                      {c.cidade ? (
                        <span>
                          {c.cidade}
                          {c.uf ? `/${c.uf}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <IconAction
                      label="Editar cliente"
                      ariaLabel={`Editar ${c.nome}`}
                      onClick={() => navigate(`/admin/clientes/${c.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconAction>
                    <IconAction
                      label={c.status === "ATIVO" ? "Inativar cliente" : "Ativar cliente"}
                      ariaLabel={`Alterar status de ${c.nome}`}
                      onClick={() => setAlvoStatus(c)}
                    >
                      <Power className="h-4 w-4" />
                    </IconAction>
                    <IconAction
                      label="Excluir cliente"
                      ariaLabel={`Excluir ${c.nome}`}
                      onClick={() => setAlvoExclusao(c)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </IconAction>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlertDialog open={!!alvoStatus} onOpenChange={(o) => !o && setAlvoStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alvoStatus?.status === "ATIVO" ? "Inativar cliente" : "Ativar cliente"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirma alterar o status de <strong>{alvoStatus?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarStatus}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!alvoExclusao} onOpenChange={(o) => !o && setAlvoExclusao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente <strong>{alvoExclusao?.nome}</strong> e seus
              contatos serão removidos.
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
