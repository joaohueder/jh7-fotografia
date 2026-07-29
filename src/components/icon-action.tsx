import { forwardRef, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface IconActionProps extends Omit<ButtonProps, "aria-label"> {
  /** Texto exibido no tooltip e usado como rótulo acessível. */
  label: string;
  /** Rótulo acessível alternativo (inclui o nome do registro, por exemplo). */
  ariaLabel?: string;
  children: ReactNode;
}

/**
 * Botão de ação apenas com ícone acompanhado de tooltip.
 * Evita ambiguidade em ações destrutivas/sensíveis (editar, ativar, excluir):
 * o rótulo aparece no hover/foco e continua disponível para leitores de tela.
 */
export const IconAction = forwardRef<HTMLButtonElement, IconActionProps>(
  ({ label, ariaLabel, className, children, variant = "ghost", size = "icon", ...props }, ref) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            variant={variant}
            size={size}
            aria-label={ariaLabel ?? label}
            className={cn(className)}
            {...props}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-surface-elevated text-foreground border border-border shadow-lg"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
);

IconAction.displayName = "IconAction";

export default IconAction;
