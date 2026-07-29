import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardCopy, Eye, EyeOff, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { SA_MENU } from "@/pages/panels/sa/menu";
import {
  checkCnpjExists,
  checkEmailExists,
  lookupCep,
  useCreateEmpresa,
  useEmpresa,
  useUpdateEmpresa,
  type EmpresaContato,
  type EmpresaPayload,
  type EmpresaStatus,
} from "@/hooks/use-empresas";
import {
  CONTATO_TIPOS,
  generatePassword,
  isValidCep,
  isValidCpf,
  isValidCpfCnpj,
  isValidEmail,
  isValidPhone,
  maskCep,
  maskContato,
  maskCpf,
  maskCpfCnpj,
  maskPhone,
  validateContato,
} from "@/lib/br-masks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY: EmpresaPayload = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  status: "ATIVO",
  cep: "",
  endereco: "",
  complemento: "",
  numero: "",
  bairro: "",
  cidade: "",
  uf: "",
  resp_nome: "",
  resp_nascimento: "",
  resp_cpf: "",
  resp_cep: "",
  resp_endereco: "",
  resp_complemento: "",
  resp_numero: "",
  resp_bairro: "",
  resp_cidade: "",
  resp_uf: "",
  resp_whatsapp: "",
  resp_email: "",
  contato_whatsapp: "",
  contato_email: "",
  observacoes: "",
};

/** Seção de formulário: título + grade fluida de campos. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
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
  span,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  span?: boolean;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={span ? "space-y-2 md:col-span-full" : "space-y-2"}>
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

/** Bloco de leitura usado no resumo final do cadastro em etapas. */
function ResumoBloco({
  titulo,
  itens,
}: {
  titulo: string;
  itens: [string, string | null | undefined][];
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {titulo}
      </h3>
      <dl className="space-y-1.5">
        {itens.map(([label, valor]) => (
          <div key={label} className="flex flex-wrap gap-x-2 text-sm">
            <dt className="text-muted-foreground">{label}:</dt>
            <dd className="min-w-0 break-words font-medium">{valor?.trim() ? valor : "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const STEPS = [
  "Dados da empresa",
  "Responsável",
  "Contato",
  "Acesso",
  "Observações",
  "Resumo",
] as const;
const RESUMO = STEPS.length - 1;

type Errors = Record<string, string | null>;

export default function EmpresaForm() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  usePageMeta(
    `${editing ? "Editar" : "Nova"} empresa — JH7 Gestão Fotográfica`,
    "Cadastro de empresas do SaaS.",
  );

  const navigate = useNavigate();
  const { data, isLoading } = useEmpresa(id);
  const create = useCreateEmpresa();
  const update = useUpdateEmpresa();

  const [form, setForm] = useState<EmpresaPayload>(EMPTY);
  const [contatos, setContatos] = useState<EmpresaContato[]>([]);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [checkingCnpj, setCheckingCnpj] = useState(false);
  const [cnpjChecked, setCnpjChecked] = useState(false);
  const [step, setStep] = useState(0);

  /** Na edição todas as seções aparecem; na criação, uma por etapa. */
  const showStep = (index: number) => editing || step === index;

  useEffect(() => {
    if (!data) return;
    const { empresa, contatos: lista } = data;
    const filled = {
      ...EMPTY,
      ...Object.fromEntries(
        Object.keys(EMPTY).map((k) => [
          k,
          (empresa as unknown as Record<string, unknown>)[k] ?? "",
        ]),
      ),
    } as EmpresaPayload;
    setForm({
      ...filled,
      cnpj: maskCpfCnpj(filled.cnpj),
      cep: maskCep(filled.cep ?? ""),
      resp_cep: maskCep(filled.resp_cep ?? ""),
      resp_cpf: maskCpf(filled.resp_cpf ?? ""),
      resp_whatsapp: maskPhone(filled.resp_whatsapp ?? ""),
      contato_whatsapp: maskPhone(filled.contato_whatsapp ?? ""),
    });
    setContatos(
      lista.map((c) => ({
        tipo: CONTATO_TIPOS.includes(c.tipo as never) ? c.tipo : "Telefone",
        valor: maskContato(c.tipo, c.valor),
        descricao: c.descricao ?? "",
      })),
    );
    setEmail(data.adminEmail ?? empresa.resp_email ?? "");
  }, [data]);

  function set<K extends keyof EmpresaPayload>(key: K, value: EmpresaPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const setError = useCallback((key: string, msg: string | null) => {
    setErrors((prev) => ({ ...prev, [key]: msg }));
  }, []);

  async function buscarCep(prefix: "" | "resp_") {
    const cep = (prefix === "" ? form.cep : form.resp_cep) ?? "";
    if (!cep.trim()) {
      setError(`${prefix}cep`, null);
      return;
    }
    if (!isValidCep(cep)) {
      setError(`${prefix}cep`, "CEP deve ter 8 dígitos");
      return;
    }
    setError(`${prefix}cep`, null);
    const found = await lookupCep(cep);
    if (!found) {
      setError(`${prefix}cep`, "CEP não encontrado");
      return;
    }
    setForm((prev) => ({
      ...prev,
      [`${prefix}endereco`]: found.endereco,
      [`${prefix}bairro`]: found.bairro,
      [`${prefix}cidade`]: found.cidade,
      [`${prefix}uf`]: found.uf,
    }));
  }

  async function validarEmailAcesso() {
    const value = email.trim();
    setEmailChecked(false);
    if (!value) {
      setError("email", "Informe o e-mail de acesso");
      return;
    }
    if (!isValidEmail(value)) {
      setError("email", "E-mail inválido");
      return;
    }
    setError("email", null);
    if (editing) return;
    setCheckingEmail(true);
    try {
      const exists = await checkEmailExists(value);
      if (exists) {
        setError("email", "Já existe um usuário com este e-mail");
      } else {
        setError("email", null);
        setEmailChecked(true);
      }
    } catch (err) {
      setError("email", (err as Error).message);
    } finally {
      setCheckingEmail(false);
    }
  }

  async function validarCnpj(): Promise<boolean> {
    const value = form.cnpj;
    setCnpjChecked(false);
    if (!value.trim()) {
      setError("cnpj", "Informe o CPF ou CNPJ");
      return false;
    }
    if (!isValidCpfCnpj(value)) {
      setError("cnpj", "CPF/CNPJ inválido");
      return false;
    }
    setError("cnpj", null);
    setCheckingCnpj(true);
    try {
      const exists = await checkCnpjExists(value, editing ? id : undefined);
      if (exists) {
        setError("cnpj", "Já existe uma empresa cadastrada com este CPF/CNPJ");
        return false;
      }
      setError("cnpj", null);
      setCnpjChecked(true);
      return true;
    } catch (err) {
      setError("cnpj", (err as Error).message);
      return false;
    } finally {
      setCheckingCnpj(false);
    }
  }

  function gerarSenha() {
    const nova = generatePassword();
    setSenha(nova);
    setConfirmar(nova);
    setShowSenha(true);
    setError("senha", null);
    setError("confirmar", null);
    notifySuccess("Senha gerada. Copie-a antes de salvar.");
  }

  const senhaOk = senha.length >= 8;
  const confirmarOk = Boolean(confirmar) && senha === confirmar;
  const acessoOk = editing
    ? true
    : Boolean(email.trim()) && !errors.email && emailChecked && senhaOk && confirmarOk;

  /** Valida a etapa atual antes de liberar o avanço. */
  async function avancar() {
    if (step === 0) {
      if (!form.razao_social.trim() || !form.nome_fantasia.trim() || !form.cnpj.trim()) {
        notifyValidation("Razão social, nome fantasia e CPF/CNPJ são obrigatórios.");
        return;
      }
      if (!isValidCpfCnpj(form.cnpj)) {
        setError("cnpj", "CPF/CNPJ inválido");
        notifyValidation("CPF/CNPJ inválido.");
        return;
      }
      if (!cnpjChecked) {
        const ok = await validarCnpj();
        if (!ok) return;
      }
    }
    if (step === 1) {
      if (!form.resp_nome.trim()) {
        notifyValidation("Informe o nome do responsável.");
        return;
      }
      if (!form.resp_nascimento?.trim()) {
        notifyValidation("Informe a data de nascimento do responsável.");
        return;
      }
      if (!form.resp_cpf?.trim()) {
        notifyValidation("Informe o CPF do responsável.");
        return;
      }
      if (!isValidCpf(form.resp_cpf)) {
        notifyValidation("CPF do responsável inválido.");
        return;
      }
      if (!form.resp_whatsapp?.trim()) {
        notifyValidation("Informe o WhatsApp do responsável.");
        return;
      }
      if (!isValidPhone(form.resp_whatsapp)) {
        notifyValidation("WhatsApp do responsável inválido.");
        return;
      }
    }
    if (step === 2) {
      if (!form.contato_whatsapp?.trim()) {
        notifyValidation("Informe o WhatsApp de contato da empresa.");
        return;
      }
      if (!isValidPhone(form.contato_whatsapp)) {
        notifyValidation("WhatsApp de contato da empresa inválido.");
        return;
      }
      if (contatos.some((c) => validateContato(c.tipo, c.valor))) {
        notifyValidation("Verifique os contatos adicionais.");
        return;
      }
    }
    if (step === 3) {
      if (!emailChecked) await validarEmailAcesso();
      if (!email.trim() || !isValidEmail(email)) {
        notifyValidation("Informe um e-mail de acesso válido.");
        return;
      }
      if (!senhaOk) {
        notifyValidation("A senha deve ter pelo menos 8 caracteres.");
        return;
      }
      if (!confirmarOk) {
        notifyValidation("As senhas não conferem.");
        return;
      }
    }
    setStep((s) => Math.min(RESUMO, s + 1));
  }

  async function handleSubmit(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (!editing && step !== RESUMO) return;

    if (!form.razao_social.trim() || !form.nome_fantasia.trim() || !form.cnpj.trim()) {
      notifyValidation("Razão social, nome fantasia e CPF/CNPJ são obrigatórios.");
      return;
    }
    if (!isValidCpfCnpj(form.cnpj)) {
      setError("cnpj", "CPF/CNPJ inválido");
      notifyValidation("CPF/CNPJ inválido.");
      return;
    }
    if (!cnpjChecked) {
      const ok = await validarCnpj();
      if (!ok) return;
    }

    if (!form.resp_nome.trim()) {
      notifyValidation("Informe o nome do responsável.");
      return;
    }
    if (!form.resp_nascimento?.trim()) {
      notifyValidation("Informe a data de nascimento do responsável.");
      return;
    }
    if (!form.resp_cpf?.trim()) {
      notifyValidation("Informe o CPF do responsável.");
      return;
    }
    if (!isValidCpf(form.resp_cpf)) {
      notifyValidation("CPF do responsável inválido.");
      return;
    }
    if (!form.resp_whatsapp?.trim()) {
      notifyValidation("Informe o WhatsApp do responsável.");
      return;
    }
    if (!isValidPhone(form.resp_whatsapp)) {
      notifyValidation("WhatsApp do responsável inválido.");
      return;
    }
    if (!form.contato_whatsapp?.trim()) {
      notifyValidation("Informe o WhatsApp de contato da empresa.");
      return;
    }
    if (!isValidPhone(form.contato_whatsapp)) {
      notifyValidation("WhatsApp de contato da empresa inválido.");
      return;
    }
    const contatoInvalido = contatos.find((c) => validateContato(c.tipo, c.valor));
    if (contatoInvalido) {
      notifyValidation("Verifique os contatos adicionais.");
      return;
    }
    if (!editing && !acessoOk) {
      notifyValidation("Preencha e valide e-mail, senha e confirmação de senha.");
      return;
    }
    if (editing && (senha || confirmar)) {
      if (!senhaOk) {
        notifyValidation("A senha deve ter pelo menos 8 caracteres.");
        return;
      }
      if (!confirmarOk) {
        notifyValidation("As senhas não conferem.");
        return;
      }
    }

    const payload: EmpresaPayload = {
      ...form,
      // Nunca enviar status vazio (o banco usa enum e recusa "").
      status: form.status === "INATIVO" ? "INATIVO" : "ATIVO",
      resp_nascimento: form.resp_nascimento || null,
    };

    const lista = contatos.filter((c) => c.valor.trim());

    try {
      if (editing) {
        const trocarSenha = Boolean(senha) && Boolean(confirmar) && senhaOk && confirmarOk;
        await update.mutateAsync({
          id: id!,
          empresa: payload,
          contatos: lista,
          password: trocarSenha ? senha : undefined,
        });
        notifySuccess(trocarSenha ? "Empresa e senha atualizadas." : "Empresa atualizada.");
      } else {
        await create.mutateAsync({
          empresa: payload,
          contatos: lista,
          email: email.trim(),
          password: senha,
        });
        notifySuccess("Empresa criada e usuário administrador cadastrado.");
      }
      navigate("/sa/empresas");
    } catch (err) {
      notifyError(err);
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <PanelLayout accent="sa" menu={SA_MENU}>
      <div className="space-y-[clamp(1.25rem,4vw,2rem)]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="tap-target"
              aria-label="Voltar"
              onClick={() => navigate("/sa/empresas")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="truncate text-[clamp(1.375rem,5vw,2rem)] font-bold tracking-tight">
              {editing ? "Editar empresa" : "Nova empresa"}
            </h1>
          </div>
        </header>

        {!editing && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {STEPS.map((label, i) => (
                <span
                  key={label}
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
                  <span className="hidden sm:inline">{label}</span>
                </span>
              ))}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((step + 1) / STEPS.length) * 100}%`,
                  background: "var(--panel-accent)",
                }}
              />
            </div>
          </div>
        )}

        {editing && isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              // Evita salvar/avançar sem querer ao pressionar Enter nos campos.
              const target = e.target as HTMLElement;
              if (e.key === "Enter" && target.tagName !== "TEXTAREA") {
                e.preventDefault();
              }
            }}
            className="space-y-4"
          >
            {showStep(0) && (
              <Section title="Dados da empresa">
                <Field label="Razão social" required>
                  <Input
                    value={form.razao_social}
                    onChange={(e) => set("razao_social", e.target.value)}
                    className="h-11 text-base"
                    required
                  />
                </Field>
                <Field label="Nome fantasia" required>
                  <Input
                    value={form.nome_fantasia}
                    onChange={(e) => set("nome_fantasia", e.target.value)}
                    className="h-11 text-base"
                    required
                  />
                </Field>
                <Field label="CPF / CNPJ" required error={errors.cnpj}>
                  <Input
                    value={form.cnpj}
                    onChange={(e) => {
                      set("cnpj", maskCpfCnpj(e.target.value));
                      setCnpjChecked(false);
                      if (errors.cnpj) setError("cnpj", null);
                    }}
                    onBlur={() => void validarCnpj()}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    inputMode="numeric"
                    className="h-11 text-base"
                    required
                  />
                  {checkingCnpj && (
                    <p className="text-xs text-muted-foreground">Verificando CPF/CNPJ…</p>
                  )}
                </Field>
                <Field label="Status">
                  <Select
                    value={form.status}
                    onValueChange={(v) => set("status", v as EmpresaStatus)}
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
                <Field label="CEP" error={errors.cep}>
                  <Input
                    value={form.cep ?? ""}
                    onChange={(e) => set("cep", maskCep(e.target.value))}
                    onBlur={() => void buscarCep("")}
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
                <Field label="Número">
                  <Input
                    value={form.numero ?? ""}
                    onChange={(e) => set("numero", e.target.value)}
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
            )}

            {showStep(1) && (
              <Section title="Dados do responsável">
                <Field label="Nome" required>
                  <Input
                    value={form.resp_nome}
                    onChange={(e) => set("resp_nome", e.target.value)}
                    className="h-11 text-base"
                    required
                  />
                </Field>
                <Field label="Data de nascimento" required>
                  <Input
                    type="date"
                    value={form.resp_nascimento ?? ""}
                    onChange={(e) => set("resp_nascimento", e.target.value)}
                    className="h-11 text-base"
                    required
                  />
                </Field>
                <Field label="CPF" required error={errors.resp_cpf}>
                  <Input
                    value={form.resp_cpf ?? ""}
                    onChange={(e) => set("resp_cpf", maskCpf(e.target.value))}
                    onBlur={() =>
                      setError(
                        "resp_cpf",
                        !form.resp_cpf?.trim()
                          ? null
                          : isValidCpf(form.resp_cpf)
                            ? null
                            : "CPF inválido",
                      )
                    }
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="CEP" error={errors.resp_cep}>
                  <Input
                    value={form.resp_cep ?? ""}
                    onChange={(e) => set("resp_cep", maskCep(e.target.value))}
                    onBlur={() => void buscarCep("resp_")}
                    placeholder="00000-000"
                    inputMode="numeric"
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="Endereço">
                  <Input
                    value={form.resp_endereco ?? ""}
                    onChange={(e) => set("resp_endereco", e.target.value)}
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="Número">
                  <Input
                    value={form.resp_numero ?? ""}
                    onChange={(e) => set("resp_numero", e.target.value)}
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="Complemento">
                  <Input
                    value={form.resp_complemento ?? ""}
                    onChange={(e) => set("resp_complemento", e.target.value)}
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="Bairro">
                  <Input
                    value={form.resp_bairro ?? ""}
                    onChange={(e) => set("resp_bairro", e.target.value)}
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="Cidade">
                  <Input
                    value={form.resp_cidade ?? ""}
                    onChange={(e) => set("resp_cidade", e.target.value)}
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="UF">
                  <Input
                    value={form.resp_uf ?? ""}
                    onChange={(e) => set("resp_uf", e.target.value.toUpperCase().slice(0, 2))}
                    maxLength={2}
                    className="h-11 text-base uppercase"
                  />
                </Field>
                <Field label="WhatsApp" required error={errors.resp_whatsapp}>
                  <Input
                    value={form.resp_whatsapp ?? ""}
                    onChange={(e) => set("resp_whatsapp", maskPhone(e.target.value))}
                    onBlur={() =>
                      setError(
                        "resp_whatsapp",
                        !form.resp_whatsapp?.trim()
                          ? null
                          : isValidPhone(form.resp_whatsapp)
                            ? null
                            : "Telefone inválido",
                      )
                    }
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="E-mail" error={errors.resp_email}>
                  <Input
                    type="email"
                    value={form.resp_email ?? ""}
                    onChange={(e) => set("resp_email", e.target.value)}
                    onBlur={() =>
                      setError(
                        "resp_email",
                        !form.resp_email?.trim()
                          ? null
                          : isValidEmail(form.resp_email)
                            ? null
                            : "E-mail inválido",
                      )
                    }
                    className="h-11 text-base"
                  />
                </Field>
              </Section>
            )}

            {showStep(2) && (
              <Section title="Contato da empresa">
                <Field label="WhatsApp" required error={errors.contato_whatsapp}>
                  <Input
                    value={form.contato_whatsapp ?? ""}
                    onChange={(e) => set("contato_whatsapp", maskPhone(e.target.value))}
                    onBlur={() =>
                      setError(
                        "contato_whatsapp",
                        !form.contato_whatsapp?.trim()
                          ? null
                          : isValidPhone(form.contato_whatsapp)
                            ? null
                            : "Telefone inválido",
                      )
                    }
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
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

                <div className="space-y-3 md:col-span-full">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-sm">Outros contatos</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="tap-target"
                      onClick={() =>
                        setContatos((prev) => [
                          ...prev,
                          { tipo: "WhatsApp", valor: "", descricao: "" },
                        ])
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" /> Adicionar
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
            )}

            {showStep(3) && (
              <Section title="Acesso ao sistema (usuário administrador)">
                <Field
                  label="E-mail"
                  required={!editing}
                  error={errors.email}
                  hint={
                    editing
                      ? "E-mail do usuário administrador (não editável)."
                      : checkingEmail
                        ? "Verificando disponibilidade…"
                        : emailChecked
                          ? "E-mail disponível."
                          : undefined
                  }
                >
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailChecked(false);
                      setError("email", null);
                    }}
                    onBlur={() => void validarEmailAcesso()}
                    disabled={editing}
                    readOnly={editing}
                    autoComplete="off"
                    className="h-11 text-base disabled:opacity-100"
                    required={!editing}
                  />
                </Field>
                <Field
                  label={editing ? "Nova senha (opcional)" : "Senha"}
                  required={!editing}
                  error={senha && !senhaOk ? "Mínimo de 8 caracteres" : null}
                >
                  <div className="flex gap-2">
                    <Input
                      type={showSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      autoComplete="new-password"
                      className="h-11 text-base"
                      required={!editing}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="tap-target h-11 w-11 shrink-0"
                      aria-label={showSenha ? "Ocultar senha" : "Revelar senha"}
                      onClick={() => setShowSenha((v) => !v)}
                    >
                      {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="tap-target h-11 w-11 shrink-0"
                      aria-label="Gerar senha"
                      onClick={gerarSenha}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </Field>
                <Field
                  label="Confirmar senha"
                  required={!editing}
                  error={confirmar && !confirmarOk ? "As senhas não conferem" : null}
                >
                  <Input
                    type={showSenha ? "text" : "password"}
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    autoComplete="new-password"
                    className="h-11 text-base"
                    required={!editing}
                  />
                </Field>
              </Section>
            )}

            {showStep(4) && (
              <Section title="Observações">
                <Field label="Observações" span>
                  <Textarea
                    value={form.observacoes ?? ""}
                    onChange={(e) => set("observacoes", e.target.value)}
                    rows={4}
                    className="text-base"
                  />
                </Field>
              </Section>
            )}

            {!editing && step === RESUMO && (
              <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Resumo
                </h2>
                <div className="grid gap-[clamp(1rem,3vw,1.5rem)] [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
                  <ResumoBloco
                    titulo="Dados da empresa"
                    itens={[
                      ["Razão social", form.razao_social],
                      ["Nome fantasia", form.nome_fantasia],
                      ["CPF/CNPJ", form.cnpj],
                      ["Status", form.status === "ATIVO" ? "Ativo" : "Inativo"],
                      [
                        "Endereço",
                        [form.endereco, form.numero, form.bairro, form.cidade, form.uf]
                          .filter(Boolean)
                          .join(", "),
                      ],
                      ["CEP", form.cep],
                    ]}
                  />
                  <ResumoBloco
                    titulo="Responsável"
                    itens={[
                      ["Nome", form.resp_nome],
                      ["CPF", form.resp_cpf],
                      ["Nascimento", form.resp_nascimento],
                      ["WhatsApp", form.resp_whatsapp],
                      ["E-mail", form.resp_email],
                    ]}
                  />
                  <ResumoBloco
                    titulo="Contato da empresa"
                    itens={[
                      ["WhatsApp", form.contato_whatsapp],
                      ["E-mail", form.contato_email],
                      [
                        "Outros contatos",
                        contatos
                          .filter((c) => c.valor.trim())
                          .map((c) => `${c.tipo}: ${c.valor}`)
                          .join(" · "),
                      ],
                    ]}
                  />
                  <ResumoBloco
                    titulo="Acesso ao sistema"
                    itens={[
                      ["E-mail", email],
                      ["Senha", senha ? "••••••••" : ""],
                    ]}
                  />
                  <ResumoBloco titulo="Observações" itens={[["Observações", form.observacoes]]} />
                </div>
              </section>
            )}

            {editing || step === RESUMO ? (
              <div className="flex flex-wrap gap-3">
                {!editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="tap-target"
                    onClick={() => setStep((s) => s - 1)}
                  >
                    Voltar
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  className="tap-target"
                  disabled={saving || checkingEmail || (!editing && !acessoOk)}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editing ? "Salvar alterações" : "Criar empresa"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="tap-target"
                  onClick={() => navigate("/sa/empresas")}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="tap-target"
                  disabled={step === 0}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  Voltar
                </Button>
                <Button type="button" className="tap-target" onClick={() => void avancar()}>
                  {checkingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Próximo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="tap-target"
                  onClick={() => navigate("/sa/empresas")}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </form>
        )}
      </div>
    </PanelLayout>
  );
}
