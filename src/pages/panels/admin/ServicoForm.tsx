import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Package, Plus, Trash2 } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { HelpTip } from "@/components/page-help";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { formatMoney, maskMoney, parseMoney } from "@/lib/br-masks";
import { useProdutos } from "@/hooks/use-produtos";
import {
  useSalvarServico,
  useServico,
  useServicoProdutos,
  type ServicoStatus,
} from "@/hooks/use-servicos";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LIMITE_VALOR = 999999.99;

interface ItemComposicao {
  produto_id: string;
  quantidade: number;
}

/**
 * Tela (janela) completa de cadastro e edição de serviço.
 * Além dos dados básicos, permite montar a composição do serviço com os
 * produtos utilizados — o custo dos produtos entra no custo total do serviço.
 */
export default function ServicoForm() {
  const { id } = useParams<{ id: string }>();
  const editando = Boolean(id);
  const navigate = useNavigate();

  usePageMeta(
    editando ? "Editar serviço — JH7 Gestão Fotográfica" : "Novo serviço — JH7 Gestão Fotográfica",
    "Cadastro do serviço e dos produtos que o compõem.",
  );

  const { data: servico, isLoading: carregandoServico } = useServico(id);
  const { data: itensSalvos, isLoading: carregandoItens } = useServicoProdutos(id);
  const { data: produtos } = useProdutos();
  const salvar = useSalvarServico();

  const [nome, setNome] = useState("");
  const [status, setStatus] = useState<ServicoStatus>("ATIVO");
  const [custoAdicional, setCustoAdicional] = useState("");
  const [venda, setVenda] = useState("");
  const [itens, setItens] = useState<ItemComposicao[]>([]);
  const [produtoEscolhido, setProdutoEscolhido] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [erros, setErros] = useState<{ nome?: string; custo?: string; venda?: string }>({});
  const [carregado, setCarregado] = useState(false);

  // Preenche o formulário quando os dados da edição chegam.
  useEffect(() => {
    if (!editando || carregado) return;
    if (!servico || carregandoItens) return;
    setNome(servico.nome);
    setStatus(servico.status);
    setCustoAdicional(servico.custo_adicional == null ? "" : formatMoney(servico.custo_adicional));
    setVenda(servico.valor_venda == null ? "" : formatMoney(servico.valor_venda));
    setItens((itensSalvos ?? []).map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade })));
    setCarregado(true);
  }, [editando, carregado, servico, itensSalvos, carregandoItens]);

  const produtosAtivos = useMemo(
    () => (produtos ?? []).filter((p) => p.status === "ATIVO" || itens.some((i) => i.produto_id === p.id)),
    [produtos, itens],
  );

  const produtoPorId = useMemo(() => {
    const mapa = new Map<string, { nome: string; valor_custo: number }>();
    (produtos ?? []).forEach((p) => mapa.set(p.id, { nome: p.nome, valor_custo: p.valor_custo ?? 0 }));
    return mapa;
  }, [produtos]);


  const disponiveis = produtosAtivos.filter((p) => !itens.some((i) => i.produto_id === p.id));

  const custoProdutos = itens.reduce(
    (soma, item) => soma + (produtoPorId.get(item.produto_id)?.valor_custo ?? 0) * item.quantidade,
    0,
  );
  const custoAdicionalNum = parseMoney(custoAdicional);
  const vendaNum = parseMoney(venda);
  // Sem custo adicional e sem produtos, o custo total fica "não informado".
  const custoTotal: number | null =
    custoAdicionalNum === null && itens.length === 0 ? null : (custoAdicionalNum ?? 0) + custoProdutos;
  const margem: number | null =
    vendaNum === null || custoTotal === null ? null : vendaNum - custoTotal;

  function adicionarProduto() {
    if (!produtoEscolhido) {
      notifyValidation("Escolha um produto para incluir na composição do serviço.");
      return;
    }
    const qtd = Number(String(quantidade).replace(",", "."));
    if (!Number.isFinite(qtd) || qtd <= 0) {
      notifyValidation("Informe uma quantidade maior que zero.");
      return;
    }
    setItens((atuais) => [...atuais, { produto_id: produtoEscolhido, quantidade: qtd }]);
    setProdutoEscolhido("");
    setQuantidade("1");
  }

  function alterarQuantidade(produtoId: string, valor: string) {
    const qtd = Number(valor.replace(",", "."));
    setItens((atuais) =>
      atuais.map((i) =>
        i.produto_id === produtoId
          ? { ...i, quantidade: Number.isFinite(qtd) && qtd > 0 ? qtd : i.quantidade }
          : i,
      ),
    );
  }

  function removerItem(produtoId: string) {
    setItens((atuais) => atuais.filter((i) => i.produto_id !== produtoId));
  }

  function validar() {
    const novos: typeof erros = {};
    if (nome.trim().length < 2) novos.nome = "Informe o nome do serviço (mínimo 2 caracteres).";

    // Custo adicional e valor de venda são opcionais: só validamos o limite.
    if (custoAdicionalNum !== null && custoAdicionalNum > LIMITE_VALOR)
      novos.custo = "O custo adicional deve ser no máximo R$ 999.999,99.";
    if (vendaNum !== null && vendaNum > LIMITE_VALOR)
      novos.venda = "O valor de venda deve ser no máximo R$ 999.999,99.";
    if (custoTotal !== null && custoTotal > LIMITE_VALOR)
      novos.custo = "O custo total do serviço passou de R$ 999.999,99.";

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
        id,
        dados: {
          nome: nome.trim(),
          status,
          custo_adicional: custoAdicionalNum,
          valor_custo: custoTotal === null ? null : Number(custoTotal.toFixed(2)),
          valor_venda: vendaNum,
          produtos: itens,
        },
      });
      notifySuccess(editando ? "Serviço atualizado." : "Serviço cadastrado com sucesso.");
      navigate("/admin/servicos");
    } catch (err) {
      notifyError(err, { title: "Não foi possível salvar o serviço" });
    }
  }

  const carregando = editando && (carregandoServico || carregandoItens);

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 px-2"
            onClick={() => navigate("/admin/servicos")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a lista de serviços
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">
                {editando ? "Editar serviço" : "Novo serviço"}
              </h1>
              <HelpTip text="Cadastre o serviço prestado pelo estúdio e, se quiser, monte a composição dele com os produtos utilizados (ex.: álbum, caixa, pen drive). O custo dos produtos é somado automaticamente ao custo total do serviço. Os campos marcados com * são obrigatórios — o custo adicional e o valor de venda podem ficar em branco." />
            </div>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Preencha os dados do serviço e escolha os produtos que fazem parte dele.
            </p>
          </div>
        </header>

        {carregando ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando serviço…
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dados básicos */}
            <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Dados do serviço
              </h2>

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
                      onClick={() => setStatus(valor)}
                    >
                      {rotulo}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="servico-custo" className="flex items-center gap-1.5">
                    Custo adicional <span className="text-xs text-muted-foreground">(opcional)</span>
                    <HelpTip text="Custos que NÃO vêm de produtos: equipe, deslocamento, fornecedor, edição. O custo dos produtos da composição é somado automaticamente. Pode ficar em branco e ser preenchido depois." />
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <Input
                      id="servico-custo"
                      inputMode="numeric"
                      value={custoAdicional}
                      onChange={(e) => setCustoAdicional(maskMoney(e.target.value))}
                      placeholder="Deixe em branco se não houver"
                    />
                  </div>
                  {erros.custo ? <p className="text-xs text-destructive">{erros.custo}</p> : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="servico-venda" className="flex items-center gap-1.5">
                    Valor de venda <span className="text-xs text-muted-foreground">(opcional)</span>
                    <HelpTip text="Preço cobrado do cliente por este serviço. Pode ficar em branco enquanto você ainda não definiu o preço." />
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <Input
                      id="servico-venda"
                      inputMode="numeric"
                      value={venda}
                      onChange={(e) => setVenda(maskMoney(e.target.value))}
                      placeholder="Deixe em branco se ainda não definiu"
                    />
                  </div>
                  {erros.venda ? <p className="text-xs text-destructive">{erros.venda}</p> : null}
                </div>
              </div>
            </section>

            {/* Composição */}
            <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Produtos que compõem o serviço
                </h2>
                <HelpTip text="Inclua aqui os produtos entregues junto com o serviço (álbum, caixa, pen drive, quadro). Informe quantas unidades de cada produto são usadas. O custo de cada produto vem do cadastro de Produtos e entra no custo total do serviço." />
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label className="text-sm">Produto</Label>
                  <Select value={produtoEscolhido} onValueChange={setProdutoEscolhido}>
                    <SelectTrigger aria-label="Escolher produto">
                      <SelectValue placeholder="Escolha um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {disponiveis.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Nenhum produto disponível para incluir.
                        </div>
                      ) : (
                        disponiveis.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome} {p.valor_custo != null ? `— R$ ${formatMoney(p.valor_custo)}` : "— custo não informado"}
                          </SelectItem>
                        ))

                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm" htmlFor="servico-qtd">
                    Quantidade
                  </Label>
                  <Input
                    id="servico-qtd"
                    inputMode="decimal"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <Button type="button" variant="outline" className="gap-2" onClick={adicionarProduto}>
                  <Plus className="h-4 w-4" />
                  Incluir
                </Button>
              </div>

              {itens.length === 0 ? (
                <div className="space-y-2 rounded-lg border border-dashed border-border p-6 text-center">
                  <Package className="mx-auto h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium">Nenhum produto na composição.</p>
                  <p className="text-sm text-muted-foreground">
                    Se este serviço não entrega nenhum produto, pode salvar assim mesmo.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {itens.map((item) => {
                    const p = produtoPorId.get(item.produto_id);
                    const subtotal = (p?.valor_custo ?? 0) * item.quantidade;
                    return (
                      <li
                        key={item.produto_id}
                        className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-[10rem] flex-1">
                          <p className="text-sm font-semibold">{p?.nome ?? "Produto removido"}</p>
                          <p className="text-xs text-muted-foreground">
                            Custo unitário: R$ {formatMoney(p?.valor_custo ?? 0)} · Subtotal: R${" "}
                            {formatMoney(subtotal)}
                          </p>
                        </div>
                        <Input
                          className="w-24"
                          inputMode="decimal"
                          aria-label={`Quantidade de ${p?.nome ?? "produto"}`}
                          value={String(item.quantidade)}
                          onChange={(e) => alterarQuantidade(item.produto_id, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Remover ${p?.nome ?? "produto"} da composição`}
                          onClick={() => removerItem(item.produto_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Resumo financeiro */}
            <section className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  rotulo: "Custo dos produtos",
                  valor: custoProdutos as number | null,
                  ajuda: "Soma do custo de todos os produtos incluídos na composição.",
                },
                {
                  rotulo: "Custo total do serviço",
                  valor: custoTotal,
                  ajuda: "Custo adicional + custo dos produtos. É este valor que aparece na lista de serviços. Fica em branco enquanto nenhum custo for informado.",
                },
                {
                  rotulo: "Margem estimada",
                  valor: margem,
                  ajuda: "Valor de venda menos o custo total. Só aparece quando os dois estão preenchidos. Se ficar negativo, você está vendendo abaixo do custo.",
                  negativo: margem !== null && margem < 0,
                },
              ].map((card) => (
                <div key={card.rotulo} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {card.rotulo}
                    <HelpTip text={card.ajuda} />
                  </div>
                  <p
                    className={`mt-1 text-xl font-bold ${card.negativo ? "text-destructive" : ""}`}
                  >
                    {card.valor === null ? (
                      <span className="text-base font-medium text-muted-foreground">
                        não informado
                      </span>
                    ) : (
                      <>R$ {formatMoney(card.valor)}</>
                    )}
                  </p>
                </div>
              ))}
            </section>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/servicos")}
                disabled={salvar.isPending}
              >
                Cancelar
              </Button>
              <Button type="button" className="gap-2" onClick={submeter} disabled={salvar.isPending}>
                {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editando ? "Salvar alterações" : "Cadastrar serviço"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
