import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { AlertTriangle, Camera, Check, CheckCircle2, Copy, Info, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  dismissSystemMessage,
  subscribeSystemMessage,
  type SystemMessage,
  type SystemMessageVariant,
} from "@/lib/system-message";

const VARIANT_UI: Record<
  SystemMessageVariant,
  { icon: typeof Info; ring: string; text: string }
> = {
  success: { icon: CheckCircle2, ring: "border-brand-green/40 bg-brand-green/10", text: "text-brand-green" },
  error: { icon: XCircle, ring: "border-destructive/40 bg-destructive/10", text: "text-destructive" },
  warning: { icon: AlertTriangle, ring: "border-warning/40 bg-warning/10", text: "text-warning" },
  info: { icon: Info, ring: "border-border bg-surface", text: "text-foreground" },
};

/** Botão de copiar reutilizável, com feedback de "copiado". */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback para navegadores/contextos sem Clipboard API
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={copy}
      aria-label={`Copiar ${label}`}
      className="h-7 shrink-0 gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

/** Bloco de campo da mensagem: rótulo + conteúdo + botão de copiar. */
function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span data-screenshot-hide>
          <CopyButton value={value} label={label} />
        </span>
      </div>
      <p
        className={cn(
          "whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85",
          mono && "font-mono text-[12px] text-foreground/70",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function SystemMessageDialog() {
  const [message, setMessage] = useState<SystemMessage | null>(null);
  const [shotState, setShotState] = useState<"idle" | "working" | "done" | "saved">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeSystemMessage(setMessage), []);
  useEffect(() => setShotState("idle"), [message?.id]);

  const ui = VARIANT_UI[message?.variant ?? "info"];
  const Icon = ui.icon;

  const fullText = message
    ? [
        message.title,
        "",
        message.description,
        message.original ? `\nErro original:\n${message.original}` : "",
        message.context
          ? Object.entries(message.context)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")
          : "",
      ]
        .filter(Boolean)
        .join("\n")
        .trim()
    : "";

  /** Gera um PNG do modal e copia para a área de transferência (com fallback de download). */
  async function copyScreenshot() {
    const node = cardRef.current;
    if (!node) return;
    setShotState("working");
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#000000",
        filter: (el) =>
          !(el instanceof HTMLElement && el.hasAttribute("data-screenshot-hide")),
      });
      const blob = await (await fetch(dataUrl)).blob();
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setShotState("done");
      } catch {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `mensagem-${Date.now()}.png`;
        a.click();
        setShotState("saved");
      }
    } catch {
      setShotState("idle");
    } finally {
      window.setTimeout(() => setShotState("idle"), 2200);
    }
  }

  return (
    <Dialog open={message !== null} onOpenChange={(open) => !open && dismissSystemMessage()}>
      <DialogContent className="max-w-[min(34rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl p-0 [&>button]:hidden">
        {message && (
          <div ref={cardRef} className="bg-background p-[clamp(1.125rem,4vw,1.75rem)]">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl border",
                  ui.ring,
                )}
              >
                <Icon className={cn("h-5 w-5", ui.text)} />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[1.0625rem] font-semibold leading-tight">
                  {message.title}
                </DialogTitle>
                <DialogDescription className="sr-only">{message.description}</DialogDescription>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date().toLocaleString("pt-BR")}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Field label="O que aconteceu" value={message.description} />
              {message.original && (
                <Field label="Erro original" value={message.original} mono />
              )}
              {message.context &&
                Object.entries(message.context)
                  .filter(([, v]) => v)
                  .map(([k, v]) => <Field key={k} label={k} value={String(v)} mono />)}
            </div>

            <div
              data-screenshot-hide
              className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={copyScreenshot}>
                  <Camera className="h-4 w-4" />
                  {shotState === "working"
                    ? "Capturando..."
                    : shotState === "done"
                      ? "Print copiado"
                      : shotState === "saved"
                        ? "Print baixado"
                        : "Copiar print"}
                </Button>
                <span className="hidden sm:inline-flex">
                  <CopyButton value={fullText} label="mensagem completa" />
                </span>
              </div>
              <Button type="button" onClick={dismissSystemMessage} className="sm:min-w-[7rem]">
                Entendi
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
