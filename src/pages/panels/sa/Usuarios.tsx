import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Loader2, Power, ShieldCheck, UserCog, Users, Search } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { SA_MENU } from "@/pages/panels/sa/menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { notifyError, notifySuccess } from "@/lib/system-message";
import {
  useUsuarios,
  useToggleUsuarioAtivo,
  useLogoffUsuario,
  type UsuarioSistema,
  type UsuarioRole,
} from "@/hooks/use-usuarios";

type Filtro = "TODOS" | "LOGADOS" | UsuarioRole;

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "LOGADOS", label: "Logados agora" },
  { key: "sa_admin", label: "Admin do SaaS" },
  { key: "admin", label: "Admin da empresa" },
  { key: "usuario", label: "Usuários" },
  { key: "sem_papel", label: "Sem papel" },
];

const ROLE_LABEL: Record<UsuarioRole, string> = {
  sa_admin: "Admin do SaaS",
  admin: "Admin da empresa",
  usuario: "Usuário",
  sem_papel: "Sem papel",
};

const ROLE_STYLES: Record<UsuarioRole, { border: string; text: string; bg: string; gradient: string }> = {
  sa_admin: {
    border: "var(--gold)",
    text: "var(--gold)",
    bg: "color-mix(in oklab, var(--gold) 10%, transparent)",
    gradient: "linear-gradient(135deg, var(--gold) 0%, var(--gold-soft) 100%)",
  },
  admin: {
    border: "var(--primary)",
    text: "var(--primary)",
    bg: "color-mix(in oklab, var(--primary) 10%, transparent)",
    gradient: "linear-gradient(135deg, var(--primary) 0%, var(--gold-soft) 100%)",
  },
  usuario: {
    border: "var(--muted-foreground)",
    text: "var(--muted-foreground)",
    bg: "color-mix(in oklab, var(--muted-foreground) 10%, transparent)",
    gradient: "linear-gradient(135deg, var(--muted-foreground) 0%, var(--border) 100%)",
  },
  sem_papel: {
    border: "var(--muted-foreground)",
    text: "var(--muted-foreground)",
    bg: "color-mix(in oklab, var(--muted-foreground) 10%, transparent)",
    gradient: "linear-gradient(135deg, var(--muted-foreground) 0%, var(--border) 100%)",
  },
};

/** Tempo decorrido em linguagem natural: agora, 30 segundos, 10 minutos, 1 hora, 3 dias… */
function tempoDecorrido(inicio: string | null | undefined, agora: number): string | null {
  if (!inicio) return null;
  const ms = agora - new Date(inicio).getTime();
  if (!Number.isFinite(ms)) return null;
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 10) return "agora";
  const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;
  if (s < 60) return plural(s, "segundo", "segundos");
  const min = Math.floor(s / 60);
  if (min < 60) return plural(min, "minuto", "minutos");
  const h = Math.floor(min / 60);
  if (h < 24) return plural(h, "hora", "horas");
  const d = Math.floor(h / 24);
  if (d < 7) return plural(d, "dia", "dias");
  const sem = Math.floor(d / 7);
  if (d < 30) return plural(sem, "semana", "semanas");
  const meses = Math.floor(d / 30);
  if (meses < 12) return plural(meses, "mês", "meses");
  const anos = Math.floor(d / 365);
  return plural(anos, "ano", "anos");
}

function formataData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formataDataHora(iso: string | null) {
  if (!iso) return "Nunca acessou";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function InfoRow({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground uppercase font-bold tracking-widest">{label}</span>
      <span className="text-foreground font-medium" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  );
}

function UsuarioCard({
  u,
  agora,
  onLogoff,
  onToggle,
  index,
}: {
  u: UsuarioSistema;
  agora: number;
  onLogoff: (u: UsuarioSistema) => void;
  onToggle: (u: UsuarioSistema) => void;
  index: number;
}) {
  const styles = ROLE_STYLES[u.role];
  const logado = Boolean(u.logado);
  const tempoLogado = logado ? tempoDecorrido(u.sessao_desde, agora) : null;
  const tempoUltimoAcesso = u.ultimo_login ? tempoDecorrido(u.ultimo_login, agora) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] hover:border-[var(--gold)]/40"
      style={{ borderColor: `color-mix(in oklab, ${styles.border} 35%, var(--border))` }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${styles.border} 8%, transparent) 0%, transparent 60%)`,
        }}
      />

      <div className="p-5 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center font-display text-primary-foreground font-bold text-lg shadow-lg"
            style={{ background: styles.gradient }}
          >
            {iniciais(u.nome)}
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
            style={{
              background: styles.bg,
              color: styles.text,
              borderColor: `color-mix(in oklab, ${styles.border} 30%, transparent)`,
            }}
          >
            {ROLE_LABEL[u.role]}
          </span>
        </div>

        <h3 className="font-display text-foreground font-semibold text-lg leading-tight">{u.nome}</h3>
        <p className="text-muted-foreground text-sm mb-4 truncate">{u.email ?? "—"}</p>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <InfoRow
            label="Status"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: logado ? "var(--brand-green)" : "var(--muted-foreground)",
                    boxShadow: logado ? "0 0 8px var(--brand-green)" : undefined,
                  }}
                />
                <span style={{ color: logado ? "var(--brand-green)" : "var(--muted-foreground)" }}>
                  {logado ? "Logado" : "Deslogado"}
                </span>
                {tempoLogado ? (
                  <span className="text-muted-foreground font-normal" title="Tempo total logado">
                    há {tempoLogado}
                  </span>
                ) : null}
              </span>
            }
          />
          <InfoRow
            label="Empresa"
            value={
              u.empresa_id ? (
                <Link to={`/sa/empresas/${u.empresa_id}`} className="hover:underline">
                  {u.empresa_nome ?? "—"}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <InfoRow
            label="Último acesso"
            value={
              <span title={formataDataHora(u.ultimo_login)}>
                {formataDataHora(u.ultimo_login)}
                {tempoUltimoAcesso ? (
                  <span className="text-muted-foreground font-normal ml-1">(há {tempoUltimoAcesso})</span>
                ) : null}
              </span>
            }
          />
          <InfoRow
            label="Situação"
            value={u.ativo ? "Ativo" : "Inativo"}
            valueColor={u.ativo ? "var(--brand-green)" : "var(--destructive)"}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs font-semibold bg-muted/40 border-border text-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onLogoff(u)}
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Logoff
          </Button>
          <Button
            size="sm"
            className="h-9 text-xs font-bold"
            style={{
              background: u.ativo ? "var(--destructive)" : "var(--primary)",
              color: u.ativo ? "var(--destructive-foreground)" : "var(--primary-foreground)",
            }}
            onClick={() => onToggle(u)}
          >
            <Power className="mr-1.5 h-3.5 w-3.5" />
            {u.ativo ? "Inativar" : "Ativar"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function UsuariosList() {
  usePageMeta("Usuários — JH7 Gestão Fotográfica", "Usuários do SaaS, administradores e equipes.");

  const { data, isLoading, error } = useUsuarios();
  const toggle = useToggleUsuarioAtivo();
  const logoff = useLogoffUsuario();
  const [busca, setBusca] = useState("");
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [alvo, setAlvo] = useState<UsuarioSistema | null>(null);
  const [alvoLogoff, setAlvoLogoff] = useState<UsuarioSistema | null>(null);

  const lista = useMemo(() => {
    let list = data ?? [];
    const term = busca.trim().toLowerCase();
    if (term) {
      list = list.filter((u) =>
        [u.nome, u.email ?? "", u.empresa_nome ?? ""].join(" ").toLowerCase().includes(term),
      );
    }
    if (filtro === "LOGADOS") list = list.filter((u) => Boolean(u.logado));
    else if (filtro !== "TODOS") list = list.filter((u) => u.role === filtro);
    return list;
  }, [data, busca, filtro]);

  const resumo = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      sa: list.filter((u) => u.role === "sa_admin").length,
      admin: list.filter((u) => u.role === "admin").length,
      usuario: list.filter((u) => u.role === "usuario").length,
    };
  }, [data]);

  function confirmar() {
    if (!alvo) return;
    const proximo = !alvo.ativo;
    toggle.mutate(
      { id: alvo.id, ativo: proximo },
      {
        onSuccess: () =>
          notifySuccess(
            proximo ? "Usuário ativado" : "Usuário inativado",
            `${alvo.nome} foi ${proximo ? "ativado" : "inativado"} com sucesso.`,
          ),
        onError: (err) =>
          notifyError(err, { description: "Não foi possível alterar o acesso do usuário." }),
      },
    );
    setAlvo(null);
  }

  function confirmarLogoff() {
    if (!alvoLogoff) return;
    const usuario = alvoLogoff;
    logoff.mutate(usuario.id, {
      onSuccess: (sessoes) =>
        notifySuccess(
          "Logoff realizado",
          sessoes > 0
            ? `${usuario.nome} teve ${sessoes} sessão(ões) encerrada(s).`
            : `${usuario.nome} não possuía sessões ativas.`,
        ),
      onError: (err) =>
        notifyError(err, { description: "Não foi possível encerrar as sessões do usuário." }),
    });
    setAlvoLogoff(null);
  }

  return (
    <PanelLayout accent="sa" menu={SA_MENU}>
      <div className="space-y-8">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight font-display">Gestão de Usuários</h1>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
            Controle de acessos e permissões do JH7 Gestão Fotográfica.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(11rem,100%),1fr))]"
        >
          {[
            { label: "Total", valor: resumo.total, cor: "var(--gold)", Icon: Users },
            { label: "Admin do SaaS", valor: resumo.sa, cor: "var(--gold)", Icon: ShieldCheck },
            { label: "Admin da empresa", valor: resumo.admin, cor: "var(--primary)", Icon: UserCog },
            { label: "Usuários", valor: resumo.usuario, cor: "var(--foreground)", Icon: Users },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-border/60 bg-card/50 p-[clamp(0.875rem,3vw,1.25rem)] backdrop-blur-sm transition-all duration-300 hover:border-[var(--gold)]/30 hover:bg-card/70"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <c.Icon className="h-4 w-4" aria-hidden />
                {c.label}
              </h3>
              <p
                className="mt-2 text-[clamp(1.5rem,6vw,2rem)] font-bold leading-tight font-display"
                style={{ color: c.cor }}
              >
                {c.valor}
              </p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou empresa"
              className="h-12 pl-10 text-base bg-muted/40 border-border text-foreground focus-visible:ring-[var(--gold)]/50"
              aria-label="Buscar usuários"
            />
          </div>
          <div
            role="group"
            aria-label="Filtrar por tipo de usuário"
            className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-surface/50 p-1.5"
          >
            {FILTROS.map((op) => {
              const ativo = filtro === op.key;
              return (
                <button
                  key={op.key}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setFiltro(op.key)}
                  className="min-h-[var(--tap)] flex-1 whitespace-nowrap rounded-lg px-3 text-[0.8125rem] font-semibold transition-all duration-300"
                  style={{
                    background: ativo ? "color-mix(in oklab, var(--gold) 15%, transparent)" : undefined,
                    color: ativo ? "var(--gold)" : "var(--muted-foreground)",
                    border: ativo ? "1px solid color-mix(in oklab, var(--gold) 30%, transparent)" : "1px solid transparent",
                  }}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando usuários…
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
            Não foi possível carregar os usuários: {(error as Error).message}
          </p>
        ) : lista.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-dashed border-border p-10 text-center"
          >
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum usuário encontrado para este filtro.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {lista.map((u, i) => (
              <UsuarioCard
                key={u.id}
                u={u}
                agora={agora}
                onLogoff={setAlvoLogoff}
                onToggle={setAlvo}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(alvo)} onOpenChange={(open) => !open && setAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alvo?.ativo ? "Inativar usuário?" : "Ativar usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alvo?.ativo
                ? `${alvo?.nome} perderá o acesso ao sistema até ser reativado.`
                : `${alvo?.nome} voltará a ter acesso ao sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmar}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(alvoLogoff)} onOpenChange={(open) => !open && setAlvoLogoff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar sessões do usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Todas as sessões ativas de ${alvoLogoff?.nome ?? ""} serão encerradas e será necessário fazer login novamente. O acesso do usuário continua ativo.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarLogoff}>Fazer logoff</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelLayout>
  );
}
