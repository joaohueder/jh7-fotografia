/**
 * Templates de cores (paletas) do sistema.
 *
 * Cada paleta define apenas três matizes:
 *  - primary   → cor principal (botões, links, foco)
 *  - secondary → cor de ação/positiva (salvar, confirmar)
 *  - accent    → cor de destaque (gráficos, realces, gradientes)
 *
 * Os tokens de superfície (fundo, cartão, borda) NÃO mudam — o tema
 * claro/escuro continua responsável por eles.
 */

export interface PaletteHue {
  /** Matiz OKLCH (0-360). */
  h: number;
  /** Croma OKLCH. */
  c: number;
}

export interface Palette {
  id: string;
  name: string;
  primary: PaletteHue;
  secondary: PaletteHue;
  accent: PaletteHue;
}

export const PALETTES: Palette[] = [
  {
    id: "noir-gold",
    name: "Noir & Gold",
    primary: { h: 45, c: 0.192 },
    secondary: { h: 148, c: 0.19 },
    accent: { h: 62, c: 0.15 },
  },
  {
    id: "obsidiana",
    name: "Obsidiana",
    primary: { h: 264, c: 0.17 },
    secondary: { h: 190, c: 0.14 },
    accent: { h: 300, c: 0.15 },
  },
  {
    id: "safira",
    name: "Safira",
    primary: { h: 250, c: 0.18 },
    secondary: { h: 155, c: 0.16 },
    accent: { h: 220, c: 0.16 },
  },
  {
    id: "oceano",
    name: "Oceano",
    primary: { h: 220, c: 0.16 },
    secondary: { h: 185, c: 0.14 },
    accent: { h: 200, c: 0.15 },
  },
  {
    id: "esmeralda",
    name: "Esmeralda",
    primary: { h: 155, c: 0.17 },
    secondary: { h: 140, c: 0.17 },
    accent: { h: 175, c: 0.14 },
  },
  {
    id: "floresta",
    name: "Floresta",
    primary: { h: 140, c: 0.15 },
    secondary: { h: 120, c: 0.16 },
    accent: { h: 95, c: 0.16 },
  },
  {
    id: "citrico",
    name: "Cítrico",
    primary: { h: 95, c: 0.18 },
    secondary: { h: 145, c: 0.17 },
    accent: { h: 80, c: 0.17 },
  },
  {
    id: "ambar",
    name: "Âmbar",
    primary: { h: 75, c: 0.17 },
    secondary: { h: 150, c: 0.17 },
    accent: { h: 60, c: 0.16 },
  },
  {
    id: "terracota",
    name: "Terracota",
    primary: { h: 40, c: 0.16 },
    secondary: { h: 145, c: 0.14 },
    accent: { h: 25, c: 0.16 },
  },
  {
    id: "coral",
    name: "Coral",
    primary: { h: 25, c: 0.19 },
    secondary: { h: 165, c: 0.15 },
    accent: { h: 12, c: 0.17 },
  },
  {
    id: "rubi",
    name: "Rubi",
    primary: { h: 15, c: 0.2 },
    secondary: { h: 150, c: 0.16 },
    accent: { h: 350, c: 0.17 },
  },
  {
    id: "orquidea",
    name: "Orquídea",
    primary: { h: 330, c: 0.18 },
    secondary: { h: 165, c: 0.15 },
    accent: { h: 310, c: 0.17 },
  },
  {
    id: "ametista",
    name: "Ametista",
    primary: { h: 300, c: 0.17 },
    secondary: { h: 175, c: 0.14 },
    accent: { h: 275, c: 0.17 },
  },
  {
    id: "indigo",
    name: "Índigo",
    primary: { h: 275, c: 0.18 },
    secondary: { h: 200, c: 0.15 },
    accent: { h: 245, c: 0.16 },
  },
  {
    id: "grafite",
    name: "Grafite",
    primary: { h: 240, c: 0.05 },
    secondary: { h: 150, c: 0.14 },
    accent: { h: 210, c: 0.09 },
  },
];

export const DEFAULT_PALETTE_ID = "noir-gold";

export function getPalette(id: string | null | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

const ok = (l: number, { c, h }: PaletteHue, alpha?: number) =>
  alpha == null ? `oklch(${l} ${c} ${h})` : `oklch(${l} ${c} ${h} / ${alpha}%)`;

/** Amostras usadas nos cartões de seleção (sempre no tom escuro, para contraste). */
export function paletteSwatches(palette: Palette) {
  return [ok(0.705, palette.primary), ok(0.72, palette.secondary), ok(0.8, palette.accent)];
}

/** Variáveis CSS geradas para a paleta, respeitando o modo claro/escuro. */
export function paletteVars(palette: Palette, mode: "light" | "dark"): Record<string, string> {
  const dark = mode === "dark";

  const pL = dark ? 0.705 : 0.6;
  const sL = dark ? 0.72 : 0.55;
  const aL = dark ? 0.8 : 0.68;

  const primary = ok(pL, palette.primary);
  const secondary = ok(sL, palette.secondary);
  const accent = ok(aL, palette.accent);
  const secondarySoft = ok(dark ? 0.82 : 0.62, palette.secondary);

  const onPrimary = dark
    ? `oklch(0.16 0.01 ${palette.primary.h})`
    : `oklch(0.99 0.002 ${palette.primary.h})`;
  const onSecondary = dark
    ? `oklch(0.16 0.01 ${palette.secondary.h})`
    : `oklch(0.99 0.002 ${palette.secondary.h})`;

  return {
    "--primary": primary,
    "--primary-foreground": onPrimary,
    "--gold": primary,
    "--gold-soft": accent,
    "--brand-green": secondary,
    "--brand-green-soft": secondarySoft,
    "--action-foreground": onSecondary,
    "--warning-foreground": onPrimary,
    "--ring": ok(pL, palette.primary, dark ? 55 : 45),
    "--chart-1": primary,
    "--chart-2": secondary,
    "--chart-3": accent,
    "--chart-4": secondarySoft,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": onPrimary,
    "--sidebar-ring": ok(pL, palette.primary, dark ? 55 : 45),
  };
}
