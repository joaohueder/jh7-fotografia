import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { HelpTip, InlineNote } from "@/components/page-help";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { useClientes } from "@/hooks/use-clientes";
import { useLeads } from "@/hooks/use-leads";
import {
  ORCAMENTO_STATUS,
  useOrcamento,
  useSalvarOrcamento,
  type OrcamentoStatus,
} from "@/hooks/use-orcamentos";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/searchable-select";

function hojeISO() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function emDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Tela completa de cadastro e edição de um orçamento. */
export default function OrcamentoForm() {
  const { id } = useParams<{ id: string }>();
  const editando = Boolean(id);
  const navigate = useNavigate();

  usePageMeta(
    editando ? "Editar orçamento — JH7 Gestão Fotográfica" : "Novo orçamento — JH7 Gestão Fotográfica",
    "Monte a proposta para um cliente ou lead da sua empresa.",
  );

  const { data: orcamento, isLoading: carregando } = useOrcamento(id);
  const { data: clientes } = useClientes();
  const { data: leads } = useLeads();
  const salvar = useSalvarOrcamento();

  const [clienteId, setClienteId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<OrcamentoStatus>("RASCUNHO");
  const [dataOrcamento, setDataOrcamento] = useState(hojeISO());
  const [validade, setValidade] = useState(emDias(15));

  useEffect(() => {
    if (!orcamento) return;
    setClienteId(orcamento.cliente_id);
    setDescricao(orcamento.descricao);
    setStatus(orcamento.status);
    setDataOrcamento(orcamento.data_orcamento);
    setValidade(orcamento.validade ?? "");
  }, [orcamento]);

  const opcoesContato = useMemo(() => {
    const doCliente = (clientes ?? []).map((c) => ({
      value: c.id,
      label: c.nome,
      descricao: c.contato_whatsapp ? `Cliente · ${c.contato_whatsapp}` : "Cliente",
    }));
    const dosLeads = (leads ?? [])
      .filter((l) => !doCliente.some((c) => c.value === l.id))
      .map((l) => ({
        value: l.id,
        label: l.nome,
        descricao: l.contato_whatsapp ? `Lead · ${l.contato_whatsapp}` : "Lead",
      }));
    return [...doCliente, ...dosLeads].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [clientes, leads]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();

    if (!clienteId) {
      notifyValidation("Escolha o cliente ou lead deste orçamento.");
      return;
    }
    if (descricao.trim().length < 2) {
      notifyValidation("Informe uma descrição com pelo menos 2 letras.");
      return;
    }
    if (!dataOrcamento) {
      notifyValidation("Informe a data do orçamento.");
      return;
    }
    if (validade && validade < dataOrcamento) {
      notifyValidation("A validade não pode ser anterior à data do orçamento.");
      return;
    }

    try {
      await salvar.mutateAsync({
        id,
        dados: {
          cliente_id: clienteId,
          descricao,
          status,
          data_orcamento: dataOrcamento,
          validade: validade || null,
        },
      });
      notifySuccess(editando ? "Orçamento atualizado." : "Orçamento criado.");
      navigate("/admin/orcamentos");
    } catch (err) {
      notifyError(err, { title: "Não foi possível salvar o orçamento" });
    }
  }

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 px-2"
            onClick={() => navigate("/admin/orcamentos")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a lista
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">
                {editando ? "Editar orçamento" : "Novo orçamento"}
              </h1>
              <HelpTip text="Preencha para quem é a proposta, o que ela contempla, em que situação está e até quando ela vale. Campos com * são obrigatórios." />
            </div>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Registre a proposta enviada para um cliente ou lead da sua empresa.
            </p>
          </div>
        </header>

        {carregando && editando ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando orçamento…
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-6">
            <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  Cliente ou lead *
                  <HelpTip text="Escolha para quem é a proposta. Aparecem os clientes cadastrados e também os leads (contatos que ainda não viraram clientes)." />
                </Label>
                <SearchableSelect
                  value={clienteId}
                  onChange={setClienteId}
                  opcoes={opcoesContato}
                  placeholder="Escolha o cliente ou lead"
                  placeholderBusca="Pesquisar pelo nome…"
                  vazio="Nenhum cliente ou lead encontrado."
                  ariaLabel="Cliente ou lead do orçamento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="flex items-center gap-1.5">
                  Descrição *
                  <HelpTip text="Um nome curto para identificar a proposta, por exemplo: “Ensaio gestante — pacote completo”." />
                </Label>
                <Input
                  id="descricao"
                  value={descricao}
                  maxLength={200}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex.: Cobertura de casamento — pacote prata"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  Situação *
                  <HelpTip text="Indica em que ponto a proposta está: rascunho (ainda montando), enviado (aguardando resposta), aprovado, recusado ou cancelado." />
                </Label>
                <div className="flex flex-wrap gap-2">
                  {ORCAMENTO_STATUS.map((s) => (
                    <Button
                      key={s.valor}
                      type="button"
                      size="sm"
                      variant={status === s.valor ? "default" : "outline"}
                      title={s.ajuda}
                      onClick={() => setStatus(s.valor)}
                    >
                      {s.rotulo}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="data" className="flex items-center gap-1.5">
                    Data do orçamento *
                    <HelpTip text="Dia em que a proposta foi montada ou apresentada ao cliente." />
                  </Label>
                  <Input
                    id="data"
                    type="date"
                    value={dataOrcamento}
                    onChange={(e) => setDataOrcamento(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validade" className="flex items-center gap-1.5">
                    Validade
                    <HelpTip text="Até quando o valor combinado vale. Pode ficar em branco se a proposta não tiver prazo." />
                  </Label>
                  <Input
                    id="validade"
                    type="date"
                    value={validade}
                    min={dataOrcamento || undefined}
                    onChange={(e) => setValidade(e.target.value)}
                  />
                </div>
              </div>

              <InlineNote>
                Depois que a data de validade passar, o orçamento aparece na lista marcado como
                “Validade vencida” — assim você sabe quem precisa de um novo contato.
              </InlineNote>
            </section>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/admin/orcamentos")}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2" disabled={salvar.isPending}>
                {salvar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editando ? "Salvar alterações" : "Criar orçamento"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </PanelLayout>
  );
}
