import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,

  Loader2,
  MapPin,
  Phone,
  Plus,
  Save,
  StickyNote,
  Trash2,
  UserRound,
} from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { lookupCep } from "@/hooks/use-empresas";
import {
  isMenorDeIdade,
  useCliente,
  useEmpresaAtual,
  useSalvarCliente,
  type ClienteContato,
  type ClientePayload,
  type ClienteStatus,
} from "@/hooks/use-clientes";
import {
  CONTATO_TIPOS,
  isValidCep,
  isValidCpfCnpj,
  isValidEmail,
  isValidPhone,
  maskCep,
  maskContato,
  maskCpfCnpj,
  maskPhone,
  validateContato,
} from "@/lib/br-masks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY: ClientePayload = {
  nome: "",
  nascimento: "",
  status: "ATIVO",
  documento: "",
  cep: "",
  endereco: "",
  complemento: "",
  numero: "",
  bairro: "",
  cidade: "",
  uf: "",
  contato_whatsapp: "",
  contato_email: "",
  observacoes: "",
};

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {Icon ? (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
              color: "var(--panel-accent)",
            }}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        {title}
      </h2>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(16rem,100%),1fr))]">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Formata "1990-05-20" em "20/05/1990". */
function formataData(v?: string | null) {
  if (!v?.trim()) return "";
  const [a, m, d] = v.split("-");
  return a && m && d ? `${d}/${m}/${a}` : v;
}

function ResumoBloco({
  titulo,
  itens,
}: {
  titulo: string;
  itens: Array<[string, string | null | undefined]>;
}) {
  const preenchidos = itens.filter(([, v]) => v?.toString().trim());
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {titulo}
      </h3>
      {preenchidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Não informado.</p>
      ) : (
        <dl className="space-y-2">
          {preenchidos.map(([k, v], i) => (
            <div key={`${k}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-sm font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}



/** Cadastro de clientes da empresa (novo e edição na mesma tela em abas). */
export default function ClienteForm() {
  const { id } = useParams<{ id: string }>();
  const editando = Boolean(id);
  const navigate = useNavigate();

  usePageMeta(
    `${editando ? "Editar" : "Novo"} cliente — JH7 Gestão Fotográfica`,
    "Cadastro de clientes do estúdio.",
  );

  const { data: empresaId } = useEmpresaAtual();
  const { data, isLoading } = useCliente(id);
  const salvar = useSalvarCliente();

  const [form, setForm] = useState<ClientePayload>(EMPTY);
  const [contatos, setContatos] = useState<ClienteContato[]>([]);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!data) return;
    const { cliente, contatos: lista } = data;
    setForm({
      nome: cliente.nome ?? "",
      nascimento: cliente.nascimento ?? "",
      status: cliente.status,
      documento: maskCpfCnpj(cliente.documento ?? ""),
      cep: maskCep(cliente.cep ?? ""),
      endereco: cliente.endereco ?? "",
      complemento: cliente.complemento ?? "",
      numero: cliente.numero ?? "",
      bairro: cliente.bairro ?? "",
      cidade: cliente.cidade ?? "",
      uf: cliente.uf ?? "",
      contato_whatsapp: maskPhone(cliente.contato_whatsapp ?? ""),
      contato_email: cliente.contato_email ?? "",
      observacoes: cliente.observacoes ?? "",
    });
    setContatos(
      (lista ?? []).map((c) => ({
        tipo: CONTATO_TIPOS.includes(c.tipo as never) ? c.tipo : "Telefone",
        valor: maskContato(c.tipo, c.valor),
        descricao: c.descricao ?? "",
      })),
    );
  }, [data]);

  const menor = useMemo(() => isMenorDeIdade(form.nascimento), [form.nascimento]);

  function set<K extends keyof ClientePayload>(key: K, value: ClientePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setError(key: string, msg: string | null) {
    setErrors((prev) => ({ ...prev, [key]: msg }));
  }

  async function buscarCep() {
    const cep = form.cep ?? "";
    if (!cep.trim()) return setError("cep", null);
    if (!isValidCep(cep)) return setError("cep", "CEP deve ter 8 dígitos");
    setError("cep", null);
    const found = await lookupCep(cep);
    if (!found) return setError("cep", "CEP não encontrado");
    setForm((prev) => ({
      ...prev,
      endereco: found.endereco,
      bairro: found.bairro,
      cidade: found.cidade,
      uf: found.uf,
    }));
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();

    if (!form.nome.trim()) {
      notifyValidation("Informe o nome do cliente.");
      return;
    }
    if (!form.nascimento?.trim()) {
      notifyValidation("Informe a data de nascimento.");
      return;
    }
    if (!form.documento?.trim() || !isValidCpfCnpj(form.documento)) {
      notifyValidation("Informe um CPF/CNPJ válido.");
      return;
    }
    if (!form.contato_whatsapp?.trim() || !isValidPhone(form.contato_whatsapp)) {
      notifyValidation("Informe um WhatsApp válido.");
      return;
    }

    if (form.contato_email?.trim() && !isValidEmail(form.contato_email)) {
      notifyValidation("E-mail inválido.");
      return;
    }
    if (contatos.some((c) => validateContato(c.tipo, c.valor))) {
      notifyValidation("Verifique os contatos adicionais.");
      return;
    }
    if (!empresaId) {
      notifyValidation("Empresa não identificada para vincular o cliente.");
      return;
    }

    try {
      await salvar.mutateAsync({
        id,
        empresaId,
        cliente: {
          ...form,
          nascimento: form.nascimento?.trim() ? form.nascimento : null,
        },
        contatos,
      });
      notifySuccess(editando ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.");
      navigate("/admin/clientes");
    } catch (err) {
      notifyError(err, { title: "Não foi possível salvar o cliente" });
    }
  }
  const secoes = [
    { value: "dados", label: "Dados básicos", node: (
              <Section title="Dados básicos" icon={UserRound}>
                <Field label="Nome" required>
                  <Input
                    value={form.nome}
                    onChange={(e) => set("nome", e.target.value)}
                    className="h-11 text-base"
                    required
                  />
                </Field>

                <div className="space-y-2">
                  <Label className="text-sm">
                    Data de nascimento<span className="ml-0.5 text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={form.nascimento ?? ""}
                    onChange={(e) => set("nascimento", e.target.value)}
                    required
                    className={
                      menor
                        ? "h-11 animate-pulse border-2 border-destructive text-base ring-2 ring-destructive/40"
                        : "h-11 text-base"
                    }
                  />
                  {menor ? (
                    <p className="flex animate-pulse items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Cliente menor de idade — exige autorização do responsável
                    </p>
                  ) : null}
                </div>

                <Field label="Status">
                  <Select
                    value={form.status}
                    onValueChange={(v) => set("status", v as ClienteStatus)}
                  >
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ATIVO">Ativo</SelectItem>
                      <SelectItem value="INATIVO">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="CPF / CNPJ" required error={errors.documento}>
                  <Input
                    value={form.documento ?? ""}
                    onChange={(e) => set("documento", maskCpfCnpj(e.target.value))}
                    onBlur={() =>
                      setError(
                        "documento",
                        !form.documento?.trim()
                          ? "Informe o CPF/CNPJ"
                          : isValidCpfCnpj(form.documento)
                            ? null
                            : "CPF/CNPJ inválido",
                      )
                    }
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    required
                    className="h-11 text-base"
                  />
                </Field>

              </Section>
    ) },
    { value: "endereco", label: "Endereço", node: (
              <Section title="Endereço" icon={MapPin}>
                <Field label="CEP" error={errors.cep}>
                  <Input
                    value={form.cep ?? ""}
                    onChange={(e) => set("cep", maskCep(e.target.value))}
                    onBlur={() => void buscarCep()}
                    placeholder="00000-000"
                    inputMode="numeric"
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="Endereço">
                  <Input
                    value={form.endereco ?? ""}
                    onChange={(e) => set("endereco", e.target.value)}
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="Complemento">
                  <Input
                    value={form.complemento ?? ""}
                    onChange={(e) => set("complemento", e.target.value)}
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="Número">
                  <Input
                    value={form.numero ?? ""}
                    onChange={(e) => set("numero", e.target.value)}
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="Bairro">
                  <Input
                    value={form.bairro ?? ""}
                    onChange={(e) => set("bairro", e.target.value)}
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="Cidade">
                  <Input
                    value={form.cidade ?? ""}
                    onChange={(e) => set("cidade", e.target.value)}
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="UF">
                  <Input
                    value={form.uf ?? ""}
                    onChange={(e) => set("uf", e.target.value.toUpperCase().slice(0, 2))}
                    maxLength={2}
                    className="h-11 text-base uppercase"
                  />
                </Field>
              </Section>
    ) },
    { value: "contatos", label: "Contatos", node: (
              <Section title="Contatos" icon={Phone}>
                <Field label="WhatsApp" required error={errors.contato_whatsapp}>
                  <Input
                    value={form.contato_whatsapp ?? ""}
                    onChange={(e) => set("contato_whatsapp", maskPhone(e.target.value))}
                    onBlur={() =>
                      setError(
                        "contato_whatsapp",
                        !form.contato_whatsapp?.trim()
                          ? "Informe o WhatsApp"
                          : isValidPhone(form.contato_whatsapp)
                            ? null
                            : "Telefone inválido",
                      )
                    }
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    required
                    className="h-11 text-base"
                  />
                </Field>

                <Field label="E-mail" error={errors.contato_email}>
                  <Input
                    type="email"
                    value={form.contato_email ?? ""}
                    onChange={(e) => set("contato_email", e.target.value)}
                    onBlur={() =>
                      setError(
                        "contato_email",
                        !form.contato_email?.trim()
                          ? null
                          : isValidEmail(form.contato_email)
                            ? null
                            : "E-mail inválido",
                      )
                    }
                    className="h-11 text-base"
                  />
                </Field>

                <div className="col-span-full space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Contatos adicionais</h3>
                    <Button
                      type="button"
                      variant="outline"
                      className="tap-target"
                      onClick={() =>
                        setContatos((prev) => [
                          ...prev,
                          { tipo: "WhatsApp", valor: "", descricao: "" },
                        ])
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar contato
                    </Button>
                  </div>

                  {contatos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum contato adicional.</p>
                  ) : (
                    <ul className="space-y-3">
                      {contatos.map((c, i) => {
                        const erro = errors[`contato_${i}`];
                        return (
                          <li
                            key={i}
                            className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-start"
                          >
                            <div className="space-y-2">
                              <Label className="text-xs">Tipo</Label>
                              <Select
                                value={c.tipo || "WhatsApp"}
                                onValueChange={(v) => {
                                  setContatos((prev) =>
                                    prev.map((x, j) =>
                                      j === i
                                        ? { ...x, tipo: v, valor: maskContato(v, x.valor) }
                                        : x,
                                    ),
                                  );
                                  setError(`contato_${i}`, null);
                                }}
                              >
                                <SelectTrigger className="h-11 text-base">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONTATO_TIPOS.map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Valor</Label>
                              <Input
                                value={c.valor}
                                inputMode={c.tipo === "E-mail" ? "email" : "tel"}
                                onChange={(e) =>
                                  setContatos((prev) =>
                                    prev.map((x, j) =>
                                      j === i
                                        ? { ...x, valor: maskContato(x.tipo, e.target.value) }
                                        : x,
                                    ),
                                  )
                                }
                                onBlur={() =>
                                  setError(`contato_${i}`, validateContato(c.tipo, c.valor))
                                }
                                placeholder={
                                  c.tipo === "E-mail" ? "nome@email.com" : "(00) 00000-0000"
                                }
                                className="h-11 text-base"
                              />
                              {erro ? (
                                <p className="text-xs font-medium text-destructive">{erro}</p>
                              ) : null}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Descrição</Label>
                              <Input
                                value={c.descricao ?? ""}
                                onChange={(e) =>
                                  setContatos((prev) =>
                                    prev.map((x, j) =>
                                      j === i ? { ...x, descricao: e.target.value } : x,
                                    ),
                                  )
                                }
                                className="h-11 text-base"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="tap-target justify-self-end md:mt-6"
                              aria-label="Remover contato"
                              onClick={() => setContatos((prev) => prev.filter((_, j) => j !== i))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </Section>
    ) },
    { value: "observacoes", label: "Observações", node: (
              <Section title="Observações" icon={StickyNote}>
                <div className="col-span-full space-y-2">
                  <Label className="text-sm">Anotações internas</Label>
                  <Textarea
                    value={form.observacoes ?? ""}
                    onChange={(e) => set("observacoes", e.target.value)}
                    rows={5}
                    className="text-base"
                  />
                </div>
              </Section>
    ) },
  ];

  if (!editando) {
    secoes.push({
      value: "resumo",
      label: "Resumo",
      node: (
        <Section title="Resumo do cadastro" icon={ClipboardCheck}>
          <div className="col-span-full space-y-4">
            <p className="text-sm text-muted-foreground">
              Confira os dados abaixo. O cliente só será salvo ao clicar em “Salvar cliente”.
            </p>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(16rem,100%),1fr))]">
              <ResumoBloco
                titulo="Dados básicos"
                itens={[
                  ["Nome", form.nome],
                  ["Nascimento", formataData(form.nascimento)],
                  ["Status", form.status === "ATIVO" ? "Ativo" : "Inativo"],
                  ["CPF/CNPJ", form.documento],
                  ["Menor de idade", menor ? "Sim" : "Não"],
                ]}
              />
              <ResumoBloco
                titulo="Endereço"
                itens={[
                  ["CEP", form.cep],
                  ["Endereço", form.endereco],
                  ["Número", form.numero],
                  ["Complemento", form.complemento],
                  ["Bairro", form.bairro],
                  ["Cidade/UF", [form.cidade, form.uf].filter(Boolean).join(" / ")],
                ]}
              />
              <ResumoBloco
                titulo="Contatos"
                itens={[
                  ["WhatsApp", form.contato_whatsapp],
                  ["E-mail", form.contato_email],
                  ...contatos
                    .filter((c) => c.valor.trim())
                    .map(
                      (c) =>
                        [
                          c.descricao?.trim() ? `${c.tipo} (${c.descricao})` : c.tipo,
                          c.valor,
                        ] as [string, string],
                    ),
                ]}
              />
              <ResumoBloco titulo="Observações" itens={[["Anotações", form.observacoes]]} />
            </div>
          </div>
        </Section>
      ),
    });
  }

  const ultimo = secoes.length - 1;

  function validarEtapa(indice: number) {
    if (indice === 0) {
      if (!form.nome.trim()) {
        notifyValidation("Informe o nome do cliente.");
        return false;
      }
      if (!form.nascimento?.trim()) {
        notifyValidation("Informe a data de nascimento.");
        return false;
      }
      if (!form.documento?.trim()) {
        notifyValidation("Informe o CPF/CNPJ do cliente.");
        return false;
      }
      if (!isValidCpfCnpj(form.documento)) {
        notifyValidation("CPF/CNPJ inválido.");
        return false;
      }
    }
    if (indice === 1 && form.cep?.trim() && !isValidCep(form.cep)) {
      notifyValidation("CEP inválido.");
      return false;
    }
    if (indice === 2) {
      if (!form.contato_whatsapp?.trim()) {
        notifyValidation("Informe o WhatsApp do cliente.");
        return false;
      }
      if (!isValidPhone(form.contato_whatsapp)) {
        notifyValidation("WhatsApp inválido.");
        return false;
      }
      if (form.contato_email?.trim() && !isValidEmail(form.contato_email)) {
        notifyValidation("E-mail inválido.");
        return false;
      }
      if (contatos.some((c) => validateContato(c.tipo, c.valor))) {
        notifyValidation("Verifique os contatos adicionais.");
        return false;
      }
    }
    return true;
  }


  function avancar() {
    if (!validarEtapa(step)) return;
    setStep((s) => Math.min(ultimo, s + 1));
  }

  if (editando && isLoading) {
    return (
      <PanelLayout accent="admin" menu={ADMIN_MENU}>
        <div className="flex items-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando cliente…
        </div>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            className="tap-target -ml-2 gap-2"
            onClick={() => navigate("/admin/clientes")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para clientes
          </Button>
          <div className="space-y-1">
            <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">
              {editando ? "Editar cliente" : "Novo cliente"}
            </h1>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              {editando
                ? "Dados cadastrais, endereço e contatos do cliente do estúdio."
                : `Etapa ${step + 1} de ${secoes.length} — ${secoes[step].label}`}
            </p>
          </div>
        </header>

        {!editando && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {secoes.map((s, i) => (
                <span
                  key={s.value}
                  className="inline-flex items-center gap-2 font-semibold"
                  style={{
                    color:
                      i === step
                        ? "var(--panel-accent)"
                        : i < step
                          ? "hsl(var(--foreground))"
                          : "hsl(var(--muted-foreground))",
                  }}
                >
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px]"
                    style={{
                      borderColor: i <= step ? "var(--panel-accent)" : "hsl(var(--border))",
                      background:
                        i === step
                          ? "color-mix(in oklab, var(--panel-accent) 16%, transparent)"
                          : undefined,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
              ))}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((step + 1) / secoes.length) * 100}%`,
                  background: "var(--panel-accent)",
                }}
              />
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editando || step === ultimo) void handleSubmit(e);
          }}
          className="space-y-[clamp(1rem,3vw,1.5rem)]"
        >
          {editando ? (
            <Tabs defaultValue="dados" className="space-y-5">
              <TabsList className="flex-wrap">
                {secoes.map((s) => (
                  <TabsTrigger key={s.value} value={s.value}>
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {secoes.map((s) => (
                <TabsContent key={s.value} value={s.value} className="mt-0">
                  {s.node}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            secoes[step].node
          )}

          {editando ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={salvar.isPending} className="tap-target gap-2">
                {salvar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar alterações
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="tap-target"
                onClick={() => navigate("/admin/clientes")}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="tap-target gap-2"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>

              {step === ultimo ? (
                <Button type="submit" disabled={salvar.isPending} className="tap-target gap-2">
                  {salvar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar cliente
                </Button>
              ) : (
                <Button type="button" className="tap-target gap-2" onClick={avancar}>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </form>
      </div>
    </PanelLayout>
  );
}
