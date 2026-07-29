import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Building2, Loader2, Plus, Save, StickyNote, Trash2, UserRound } from "lucide-react";

import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { useImpersonacao } from "@/hooks/use-impersonacao";
import {
  lookupCep,
  useMinhaEmpresa,
  useUpdateMinhaEmpresa,
  type EmpresaContato,
  type EmpresaPayload,
} from "@/hooks/use-empresas";
import {
  CONTATO_TIPOS,
  isValidCep,
  isValidCpf,
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

/** Campos editáveis pelo administrador da empresa (CNPJ e status são do SA). */
type Dados = Omit<EmpresaPayload, "cnpj" | "status">;

const EMPTY: Dados = {
  razao_social: "",
  nome_fantasia: "",
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

/** Aba "Dados da empresa" — mesmo cadastro do painel SA, sem campos de controle. */
export function DadosEmpresaTab() {
  const { empresa: impersonada } = useImpersonacao();
  const { data, isLoading, error } = useMinhaEmpresa(impersonada?.id ?? null);
  const update = useUpdateMinhaEmpresa();

  const [form, setForm] = useState<Dados>(EMPTY);
  const [contatos, setContatos] = useState<EmpresaContato[]>([]);
  const [cnpj, setCnpj] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!data) return;
    const { empresa, contatos: lista } = data;
    const filled = {
      ...EMPTY,
      ...Object.fromEntries(
        Object.keys(EMPTY).map((k) => [k, (empresa as unknown as Record<string, unknown>)[k] ?? ""]),
      ),
    } as Dados;
    setForm({
      ...filled,
      cep: maskCep(filled.cep ?? ""),
      resp_cep: maskCep(filled.resp_cep ?? ""),
      resp_cpf: maskCpf(filled.resp_cpf ?? ""),
      resp_whatsapp: maskPhone(filled.resp_whatsapp ?? ""),
      contato_whatsapp: maskPhone(filled.contato_whatsapp ?? ""),
    });
    setCnpj(maskCpfCnpj(empresa.cnpj ?? ""));
    setContatos(
      (lista ?? []).map((c) => ({
        tipo: CONTATO_TIPOS.includes(c.tipo as never) ? c.tipo : "Telefone",
        valor: maskContato(c.tipo, c.valor),
        descricao: c.descricao ?? "",
      })),
    );
  }, [data]);

  function set<K extends keyof Dados>(key: K, value: Dados[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setError(key: string, msg: string | null) {
    setErrors((prev) => ({ ...prev, [key]: msg }));
  }

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

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();

    if (!form.razao_social.trim() || !form.nome_fantasia.trim()) {
      notifyValidation("Razão social e nome fantasia são obrigatórios.");
      return;
    }
    if (!form.resp_nome.trim()) {
      notifyValidation("Informe o nome do responsável.");
      return;
    }
    if (form.resp_cpf?.trim() && !isValidCpf(form.resp_cpf)) {
      notifyValidation("CPF do responsável inválido.");
      return;
    }
    if (!form.resp_whatsapp?.trim() || !isValidPhone(form.resp_whatsapp)) {
      notifyValidation("Informe um WhatsApp válido para o responsável.");
      return;
    }
    if (form.resp_email?.trim() && !isValidEmail(form.resp_email)) {
      notifyValidation("E-mail do responsável inválido.");
      return;
    }
    if (!form.contato_whatsapp?.trim() || !isValidPhone(form.contato_whatsapp)) {
      notifyValidation("Informe um WhatsApp de contato válido para a empresa.");
      return;
    }
    if (form.contato_email?.trim() && !isValidEmail(form.contato_email)) {
      notifyValidation("E-mail de contato da empresa inválido.");
      return;
    }
    if (contatos.some((c) => validateContato(c.tipo, c.valor))) {
      notifyValidation("Verifique os contatos adicionais.");
      return;
    }

    try {
      await update.mutateAsync({
        empresa: {
          ...form,
          resp_nascimento: form.resp_nascimento?.trim() ? form.resp_nascimento : null,
        },
        contatos: contatos.filter((c) => c.valor.trim()),
        empresaId: impersonada?.id ?? null,
      });
      notifySuccess("Dados da empresa atualizados com sucesso.");
    } catch (err) {
      notifyError("Não foi possível salvar", (err as Error).message);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando dados da empresa…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
        Não foi possível carregar os dados da empresa: {(error as Error).message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[clamp(1rem,3vw,1.5rem)]">
      <Section title="Dados da empresa" icon={Building2}>
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
        <Field label="CPF / CNPJ" hint="Alteração somente pelo suporte do sistema.">
          <Input value={cnpj} disabled readOnly className="h-11 text-base disabled:opacity-100" />
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

      <Section title="Dados do responsável" icon={UserRound}>
        <Field label="Nome" required>
          <Input
            value={form.resp_nome}
            onChange={(e) => set("resp_nome", e.target.value)}
            className="h-11 text-base"
            required
          />
        </Field>
        <Field label="Data de nascimento">
          <Input
            type="date"
            value={form.resp_nascimento ?? ""}
            onChange={(e) => set("resp_nascimento", e.target.value)}
            className="h-11 text-base"
          />
        </Field>
        <Field label="CPF" error={errors.resp_cpf}>
          <Input
            value={form.resp_cpf ?? ""}
            onChange={(e) => set("resp_cpf", maskCpf(e.target.value))}
            onBlur={() =>
              setError(
                "resp_cpf",
                !form.resp_cpf?.trim() ? null : isValidCpf(form.resp_cpf) ? null : "CPF inválido",
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

      <Section title="Contato da empresa" icon={Building2}>
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

        <div className="col-span-full space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Contatos adicionais</h3>
            <Button
              type="button"
              variant="outline"
              className="tap-target"
              onClick={() =>
                setContatos((prev) => [...prev, { tipo: "WhatsApp", valor: "", descricao: "" }])
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
                              j === i ? { ...x, tipo: v, valor: maskContato(v, x.valor) } : x,
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
                              j === i ? { ...x, valor: maskContato(x.tipo, e.target.value) } : x,
                            ),
                          )
                        }
                        onBlur={() => setError(`contato_${i}`, validateContato(c.tipo, c.valor))}
                        placeholder={c.tipo === "E-mail" ? "nome@email.com" : "(00) 00000-0000"}
                        className="h-11 text-base"
                      />
                      {erro ? <p className="text-xs font-medium text-destructive">{erro}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={c.descricao ?? ""}
                        onChange={(e) =>
                          setContatos((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)),
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

      <Section title="Observações" icon={StickyNote}>
        <div className="col-span-full space-y-2">
          <Label className="text-sm">Anotações internas</Label>
          <Textarea
            value={form.observacoes ?? ""}
            onChange={(e) => set("observacoes", e.target.value)}
            rows={4}
            className="text-base"
          />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={update.isPending} className="tap-target gap-2">
          {update.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar alterações
        </Button>
        <p className="text-xs text-muted-foreground">
          CPF/CNPJ e situação da empresa são gerenciados pela administração do sistema.
        </p>
      </div>
    </form>
  );
}

export default DadosEmpresaTab;
