import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, CircleDollarSign, Layers, Loader2 } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { SA_MENU } from "@/pages/panels/sa/menu";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { formatMoney, maskMoney, parseMoney } from "@/lib/br-masks";
import {
  usePlano,
  usePlanoGratuitoAtivo,
  useCreatePlano,
  useUpdatePlano,
  type PlanoInput,
} from "@/hooks/use-planos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Seção de formulário: título + grade fluida de campos. */
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

/** Linha de switch com descrição, no padrão do cadastro de empresa. */
function SwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 md:col-span-full">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

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

const STEPS = ["Identificação", "Cobrança", "Status", "Resumo"] as const;
const RESUMO = STEPS.length - 1;

/** Remonta o formulário sempre que o plano em edição muda. */
export default function PlanoForm() {
  const { id } = useParams<{ id: string }>();
  return <PlanoFormInner key={id ?? "novo"} />;
}

function PlanoFormInner() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  usePageMeta(
    `${editing ? "Editar" : "Novo"} plano — JH7 Gestão Fotográfica`,
    "Cadastro de planos comerciais do SaaS.",
  );

  const navigate = useNavigate();
  const { data, isLoading } = usePlano(id);
  const create = useCreatePlano();
  const update = useUpdatePlano();
  const { data: gratuitoAtivo } = usePlanoGratuitoAtivo(id);

  const MSG_GRATUITO = gratuitoAtivo
    ? `Já existe um plano gratuito ativo (${gratuitoAtivo.nome}). Inative ou altere esse plano antes de continuar.`
    : "Já existe um plano gratuito ativo. Inative ou altere esse plano antes de continuar.";

  /** Só permite marcar gratuito se não houver outro gratuito ativo. */
  function alternarGratuito(v: boolean) {
    if (v && gratuitoAtivo && ativo) {
      notifyValidation(MSG_GRATUITO);
      return;
    }
    setGratuito(v);
    if (v) {
      setValor("");
      setErroValor(null);
    }
  }

  /** Só permite ativar o plano se ele não conflitar com o gratuito ativo. */
  function alternarAtivo(v: boolean) {
    if (v && gratuito && gratuitoAtivo) {
      notifyValidation(MSG_GRATUITO);
      return;
    }
    setAtivo(v);
  }

  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [gratuito, setGratuito] = useState(false);
  const [valor, setValor] = useState("");
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [aba, setAba] = useState("dados");

  const saving = create.isPending || update.isPending;

  useEffect(() => {
    if (!data) return;
    setNome(data.nome);
    setAtivo(data.ativo);
    setGratuito(data.gratuito);
    setValor(data.valor === null ? "" : formatMoney(data.valor));
  }, [data]);

  function validarNome() {
    const v = nome.trim();
    if (v.length < 2) {
      setErroNome("Informe um nome com pelo menos 2 caracteres.");
      return false;
    }
    if (v.length > 60) {
      setErroNome("O nome deve ter no máximo 60 caracteres.");
      return false;
    }
    setErroNome(null);
    return true;
  }

  function validarValor() {
    if (gratuito) {
      setErroValor(null);
      return true;
    }
    const n = parseMoney(valor);
    if (n === null) {
      setErroValor("Informe o valor do plano.");
      return false;
    }
    if (n > 999999.99) {
      setErroValor("O valor deve ser no máximo R$ 999.999,99.");
      return false;
    }
    setErroValor(null);
    return true;
  }

  function avancar() {
    if (step === 0 && !validarNome()) {
      notifyValidation("Corrija o nome do plano para continuar.");
      return;
    }
    if (step === 1 && !validarValor()) {
      notifyValidation("Corrija o valor do plano para continuar.");
      return;
    }
    setStep((s) => Math.min(RESUMO, s + 1));
  }

  async function handleSubmit() {
    if (!validarNome()) {
      notifyValidation("Corrija o nome do plano.");
      return;
    }
    if (!validarValor()) {
      notifyValidation("Corrija o valor do plano.");
      return;
    }
    if (gratuito && ativo && gratuitoAtivo) {
      notifyValidation(MSG_GRATUITO);
      return;
    }
    const payload: PlanoInput = {
      nome: nome.trim(),
      ativo,
      gratuito,
      valor: gratuito ? null : parseMoney(valor),
    };
    try {
      if (editing && id) {
        await update.mutateAsync({ id, ...payload });
        notifySuccess("Plano atualizado.");
      } else {
        await create.mutateAsync(payload);
        notifySuccess("Plano criado.");
      }
      navigate("/sa/planos");
    } catch (err) {
      notifyError(err);
    }
  }

  const showStep = (index: number) => editing || step === index;

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
              onClick={() => navigate("/sa/planos")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="truncate text-[clamp(1.375rem,5vw,2rem)] font-bold tracking-tight">
              {editing ? "Editar plano" : "Novo plano"}
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
            className="space-y-[clamp(1rem,3vw,1.5rem)]"
            onSubmit={(e) => {
              e.preventDefault();
              if (editing || step === RESUMO) void handleSubmit();
            }}
          >
            {editing ? (
              <Tabs value={aba} onValueChange={setAba} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="dados">Dados básicos</TabsTrigger>
                  <TabsTrigger value="cobranca">Cobrança</TabsTrigger>
                </TabsList>

                <TabsContent value="dados" className="space-y-[clamp(1rem,3vw,1.5rem)]">
                  <Section title="Identificação" icon={Layers}>
                    <Field label="Nome do plano" required error={erroNome}>
                      <Input
                        value={nome}
                        maxLength={60}
                        onChange={(e) => setNome(e.target.value)}
                        onBlur={validarNome}
                        placeholder="Ex.: Essencial"
                      />
                    </Field>
                    <SwitchRow
                      id="plano-ativo"
                      label="Plano ativo"
                      description={
                        ativo ? "Ativo — disponível para contratação." : "Inativo — não é oferecido."
                      }
                      checked={ativo}
                      onChange={alternarAtivo}
                    />
                  </Section>
                </TabsContent>

                <TabsContent value="cobranca" className="space-y-[clamp(1rem,3vw,1.5rem)]">
                  <Section title="Cobrança" icon={CircleDollarSign}>
                    <SwitchRow
                      id="plano-gratuito"
                      label="Plano gratuito"
                      description={gratuito ? "Sim — sem cobrança." : "Não — informe o valor mensal."}
                      checked={gratuito}
                      onChange={alternarGratuito}
                    />
                    {!gratuito && (
                      <Field
                        label="Valor do plano"
                        required
                        error={erroValor}
                        hint="Valor mensal em reais."
                      >
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            R$
                          </span>
                          <Input
                            inputMode="numeric"
                            className="pl-9"
                            value={valor}
                            onChange={(e) => setValor(maskMoney(e.target.value))}
                            onBlur={validarValor}
                            placeholder="0,00"
                          />
                        </div>
                      </Field>
                    )}
                  </Section>
                </TabsContent>
              </Tabs>
            ) : (
              <>
                {showStep(0) && (
                  <Section title="Identificação" icon={Layers}>
                    <Field label="Nome do plano" required error={erroNome}>
                      <Input
                        value={nome}
                        maxLength={60}
                        autoFocus={!editing}
                        onChange={(e) => setNome(e.target.value)}
                        onBlur={validarNome}
                        placeholder="Ex.: Essencial"
                      />
                    </Field>
                  </Section>
                )}

                {showStep(1) && (
                  <Section title="Cobrança" icon={CircleDollarSign}>
                    <SwitchRow
                      id="plano-gratuito"
                      label="Plano gratuito"
                      description={gratuito ? "Sim — sem cobrança." : "Não — informe o valor mensal."}
                      checked={gratuito}
                      onChange={alternarGratuito}
                    />
                    {!gratuito && (
                      <Field
                        label="Valor do plano"
                        required
                        error={erroValor}
                        hint="Valor mensal em reais."
                      >
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            R$
                          </span>
                          <Input
                            inputMode="numeric"
                            className="pl-9"
                            value={valor}
                            onChange={(e) => setValor(maskMoney(e.target.value))}
                            onBlur={validarValor}
                            placeholder="0,00"
                          />
                        </div>
                      </Field>
                    )}
                  </Section>
                )}

                {showStep(2) && (
                  <Section title="Status" icon={BadgeCheck}>
                    <SwitchRow
                      id="plano-ativo"
                      label="Plano ativo"
                      description={
                        ativo ? "Ativo — disponível para contratação." : "Inativo — não é oferecido."
                      }
                      checked={ativo}
                      onChange={alternarAtivo}
                    />
                  </Section>
                )}
              </>
            )}

            {!editing && step === RESUMO && (
              <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Resumo
                </h2>
                <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(16rem,100%),1fr))]">
                  <ResumoBloco titulo="Identificação" itens={[["Nome", nome]]} />
                  <ResumoBloco
                    titulo="Cobrança"
                    itens={[
                      ["Plano gratuito", gratuito ? "Sim" : "Não"],
                      ["Valor", gratuito ? "—" : valor ? `R$ ${valor}` : ""],
                    ]}
                  />
                  <ResumoBloco titulo="Status" itens={[["Situação", ativo ? "Ativo" : "Inativo"]]} />
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
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                  >
                    Voltar
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="tap-target"
                  disabled={saving}
                  onClick={() => void handleSubmit()}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editing ? "Salvar alterações" : "Criar plano"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="tap-target"
                  onClick={() => navigate("/sa/planos")}
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
                <Button type="button" className="tap-target" onClick={avancar}>
                  Próximo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="tap-target"
                  onClick={() => navigate("/sa/planos")}
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
