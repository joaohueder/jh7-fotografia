/**
 * Regra única de conversão de cadastro (lead x cliente).
 *
 * Um contato só é considerado CLIENTE de verdade quando o cadastro completo foi
 * preenchido — o marco dessa conclusão é o documento (CPF/CNPJ), que é
 * obrigatório no cadastro de clientes e opcional no de leads.
 *
 * Quem nasceu direto no módulo de Clientes (origem "CLIENTE") já entra como
 * convertido. Quem veio do funil mantém a origem "LEAD" para preservar a
 * rastreabilidade, por isso a origem sozinha nunca deve ser usada como critério.
 *
 * Use SEMPRE estas funções (leads, clientes, contratos, orçamentos) para que os
 * módulos não divirjam entre si.
 */

export interface CadastroConversivel {
  status?: string | null;
  origem?: string | null;
  documento?: string | null;
}

/** Documento (CPF/CNPJ) preenchido = cadastro completo. */
export function temDocumento(cadastro: CadastroConversivel | null | undefined): boolean {
  return Boolean(cadastro?.documento && String(cadastro.documento).trim().length > 0);
}

/** O contato já é cliente (nasceu como cliente ou o lead completou o cadastro). */
export function ehClienteConvertido(cadastro: CadastroConversivel | null | undefined): boolean {
  if (!cadastro) return false;
  return cadastro.origem === "CLIENTE" || temDocumento(cadastro);
}

/** Ainda é lead em aberto: veio do funil e não completou o cadastro. */
export function ehLeadEmAberto(cadastro: CadastroConversivel | null | undefined): boolean {
  return Boolean(cadastro) && !ehClienteConvertido(cadastro);
}

/** Cliente convertido E ativo — regra usada por contratos e orçamentos. */
export function ehClienteAtivoConvertido(
  cadastro: CadastroConversivel | null | undefined,
): boolean {
  return ehClienteConvertido(cadastro) && cadastro?.status === "ATIVO";
}
