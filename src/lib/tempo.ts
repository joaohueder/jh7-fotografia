/** Formatação de tempo em português do Brasil. */

/** "agora", "há 10 minutos", "há 3 dias"… tempo decorrido desde a data. */
export function tempoDecorrido(iso: string) {
  const seg = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 45) return "agora";
  const unidades: [number, string, string][] = [
    [60, "minuto", "minutos"],
    [24, "hora", "horas"],
    [7, "dia", "dias"],
    [4.345, "semana", "semanas"],
    [12, "mês", "meses"],
  ];
  let valor = seg / 60;
  let singular = "minuto";
  let plural = "minutos";
  for (let i = 0; i < unidades.length; i += 1) {
    const [limite, s, p] = unidades[i];
    if (i > 0) {
      singular = s;
      plural = p;
    }
    if (valor < limite || i === unidades.length - 1) {
      if (i === unidades.length - 1 && valor >= limite) {
        valor = valor / limite;
        singular = "ano";
        plural = "anos";
      }
      break;
    }
    valor = valor / limite;
  }
  const n = Math.floor(valor);
  return `há ${n} ${n === 1 ? singular : plural}`;
}

/** Mesmo cálculo do tempo decorrido, porém sem o prefixo "há". */
export function duracaoDesde(iso: string) {
  const texto = tempoDecorrido(iso);
  return texto === "agora" ? "agora" : texto.replace(/^há\s/, "");
}

/** dd/mm/aaaa hh:mm */
export function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
