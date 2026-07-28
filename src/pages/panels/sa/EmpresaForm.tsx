import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { SA_MENU } from "@/pages/panels/sa/menu";
import {
  lookupCep,
  useCreateEmpresa,
  useEmpresa,
  useUpdateEmpresa,
  type EmpresaContato,
  type EmpresaPayload,
  type EmpresaStatus,
} from "@/hooks/use-empresas";
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
  span,
  children,
}: {
  label: string;
  span?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={span ? "space-y-2 md:col-span-full" : "space-y-2"}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

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

  useEffect(() => {
    if (!data) return;
    const { empresa, contatos: lista } = data;
    setForm({
      ...EMPTY,
      ...Object.fromEntries(
        Object.keys(EMPTY).map((k) => [
          k,
          (empresa as unknown as Record<string, unknown>)[k] ?? "",
        ]),
      ),
    } as EmpresaPayload);
    setContatos(lista.map((c) => ({ tipo: c.tipo, valor: c.valor, descricao: c.descricao ?? "" })));
  }, [data]);

  function set<K extends keyof EmpresaPayload>(key: K, value: EmpresaPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function buscarCep(prefix: "" | "resp_") {
    const cep = (prefix === "" ? form.cep : form.resp_cep) ?? "";
    const found = await lookupCep(cep);
    if (!found) return;
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

    if (!form.razao_social.trim() || !form.nome_fantasia.trim() || !form.cnpj.trim()) {
      toast.error("Razão social, nome fantasia e CNPJ são obrigatórios.");
      return;
    }
    if (!form.resp_nome.trim()) {
      toast.error("Informe o nome do responsável.");
      return;
    }
    if (senha || confirmar || !editing) {
      if (!editing && !email.trim()) {
        toast.error("Informe o e-mail de acesso ao sistema.");
        return;
      }
      if (senha.length < 8) {
        toast.error("A senha deve ter pelo menos 8 caracteres.");
        return;
      }
      if (senha !== confirmar) {
        toast.error("As senhas não conferem.");
        return;
      }
    }

    const payload: EmpresaPayload = {
      ...form,
      resp_nascimento: form.resp_nascimento || null,
    };
    const lista = contatos.filter((c) => c.valor.trim());

    try {
      if (editing) {
        await update.mutateAsync({ id: id!, empresa: payload, contatos: lista, password: senha });
        toast.success("Empresa atualizada.");
      } else {
        await create.mutateAsync({
          empresa: payload,
          contatos: lista,
          email: email.trim(),
          password: senha,
        });
        toast.success("Empresa criada e usuário administrador cadastrado.");
      }
      navigate("/sa/empresas");
    } catch (err) {
      toast.error((err as Error).message);
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

        {editing && isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Section title="Dados da empresa">
              <Field label="Razão social">
                <Input
                  value={form.razao_social}
                  onChange={(e) => set("razao_social", e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </Field>
              <Field label="Nome fantasia">
                <Input
                  value={form.nome_fantasia}
                  onChange={(e) => set("nome_fantasia", e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </Field>
              <Field label="CNPJ">
                <Input
                  value={form.cnpj}
                  onChange={(e) => set("cnpj", e.target.value)}
                  inputMode="numeric"
                  className="h-11 text-base"
                  required
                />
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
              <Field label="CEP">
                <Input
                  value={form.cep ?? ""}
                  onChange={(e) => set("cep", e.target.value)}
                  onBlur={() => void buscarCep("")}
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

            <Section title="Dados do responsável">
              <Field label="Nome">
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
              <Field label="CPF">
                <Input
                  value={form.resp_cpf ?? ""}
                  onChange={(e) => set("resp_cpf", e.target.value)}
                  inputMode="numeric"
                  className="h-11 text-base"
                />
              </Field>
              <Field label="CEP">
                <Input
                  value={form.resp_cep ?? ""}
                  onChange={(e) => set("resp_cep", e.target.value)}
                  onBlur={() => void buscarCep("resp_")}
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
              <Field label="WhatsApp">
                <Input
                  value={form.resp_whatsapp ?? ""}
                  onChange={(e) => set("resp_whatsapp", e.target.value)}
                  inputMode="tel"
                  className="h-11 text-base"
                />
              </Field>
              <Field label="E-mail">
                <Input
                  type="email"
                  value={form.resp_email ?? ""}
                  onChange={(e) => set("resp_email", e.target.value)}
                  className="h-11 text-base"
                />
              </Field>
            </Section>

            <Section title="Contatos">
              <Field label="WhatsApp">
                <Input
                  value={form.contato_whatsapp ?? ""}
                  onChange={(e) => set("contato_whatsapp", e.target.value)}
                  inputMode="tel"
                  className="h-11 text-base"
                />
              </Field>
              <Field label="E-mail">
                <Input
                  type="email"
                  value={form.contato_email ?? ""}
                  onChange={(e) => set("contato_email", e.target.value)}
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
                      setContatos((prev) => [...prev, { tipo: "", valor: "", descricao: "" }])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> Adicionar
                  </Button>
                </div>

                {contatos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum contato adicional.</p>
                ) : (
                  <ul className="space-y-3">
                    {contatos.map((c, i) => (
                      <li
                        key={i}
                        className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-end"
                      >
                        <div className="space-y-2">
                          <Label className="text-xs">Tipo</Label>
                          <Input
                            value={c.tipo}
                            placeholder="Telefone, Instagram…"
                            onChange={(e) =>
                              setContatos((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)),
                              )
                            }
                            className="h-11 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Valor</Label>
                          <Input
                            value={c.valor}
                            onChange={(e) =>
                              setContatos((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)),
                              )
                            }
                            className="h-11 text-base"
                          />
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
                          className="tap-target justify-self-end"
                          aria-label="Remover contato"
                          onClick={() => setContatos((prev) => prev.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>

            <Section title="Acesso ao sistema (usuário administrador)">
              <Field label="E-mail">
                <Input
                  type="email"
                  value={editing ? (data?.empresa.resp_email ?? email) : email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={editing}
                  autoComplete="off"
                  className="h-11 text-base"
                  required={!editing}
                />
              </Field>
              <Field label={editing ? "Nova senha (opcional)" : "Senha"}>
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  className="h-11 text-base"
                  required={!editing}
                />
              </Field>
              <Field label="Confirmar senha">
                <Input
                  type="password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  autoComplete="new-password"
                  className="h-11 text-base"
                  required={!editing}
                />
              </Field>
            </Section>

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

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="tap-target" disabled={saving}>
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
          </form>
        )}
      </div>
    </PanelLayout>
  );
}
