import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface OpcaoBusca {
  /** Valor único da opção (id). */
  value: string;
  /** Texto principal mostrado na lista e no botão. */
  label: string;
  /** Texto auxiliar (ex.: valor em R$). */
  descricao?: string;
}

/**
 * Combo com caixa de pesquisa dentro.
 * Mesma aparência do Select padrão, mas permite filtrar digitando.
 */
export function SearchableSelect({
  value,
  onChange,
  opcoes,
  placeholder = "Escolha uma opção",
  placeholderBusca = "Pesquisar…",
  vazio = "Nenhum resultado encontrado.",
  ariaLabel,
  disabled,
  className,
}: {
  value: string;
  onChange: (valor: string) => void;
  opcoes: OpcaoBusca[];
  placeholder?: string;
  placeholderBusca?: string;
  vazio?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const selecionada = opcoes.find((o) => o.value === value);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selecionada && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selecionada
              ? `${selecionada.label}${selecionada.descricao ? ` ${selecionada.descricao}` : ""}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={placeholderBusca} />
          <CommandList>
            <CommandEmpty>{vazio}</CommandEmpty>
            <CommandGroup>
              {opcoes.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.descricao ?? ""}`}
                  onSelect={() => {
                    onChange(o.value);
                    setAberto(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === o.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">
                    {o.label}
                    {o.descricao ? (
                      <span className="text-muted-foreground"> {o.descricao}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
