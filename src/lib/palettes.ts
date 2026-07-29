/**
 * Templates de cores (paletas) do sistema.
 *
 * Cada paleta muda apenas três cores:
 *  - primary   → cor principal (botões, links, foco)
 *  - secondary → cor de ação/positiva (salvar, confirmar)
 *  - accent    → cor de destaque (gráficos, realces, gradientes)
 *
 * Os tokens de superfície (fundo, cartão, borda) NÃO mudam — o tema
 * claro/escuro continua responsável por eles.
 *
 * Direção estética: paletas delicadas, de baixa saturação, cada uma com
 * personalidade própria (sem seguir a identidade laranja/verde original).
 */

export interface Palette {
  id: string;
  name: string;
  /** Cor principal (hex). */
  primary: string;
  /** Cor de ação/positiva (hex). */
  secondary: string;
  /** Cor de destaque (hex). */
  accent: string;
}

export const PALETTES: Palette[] = [
  { id: "sakura", name: "Sakura", primary: "#E7A6B8", secondary: "#9CC5A1", accent: "#F3D3C0" },
  { id: "lavanda", name: "Lavanda", primary: "#B0A3D4", secondary: "#8FB8D8", accent: "#E3C6D9" },
  { id: "menta", name: "Menta", primary: "#8CCFC0", secondary: "#7FB7CE", accent: "#EBDFA6" },
  { id: "brisa", name: "Brisa", primary: "#8FBCE0", secondary: "#87CFC9", accent: "#E5D2B0" },
  { id: "pessego", name: "Pêssego", primary: "#F0B49A", secondary: "#B9C99A", accent: "#F2D8A7" },
  { id: "salvia", name: "Sálvia", primary: "#A3BFA4", secondary: "#B7C48A", accent: "#DCD3BC" },
  { id: "nevoa", name: "Névoa", primary: "#A9B6C4", secondary: "#93C0BC", accent: "#CFD6DE" },
  { id: "glicinia", name: "Glicínia", primary: "#C4AEDD", secondary: "#A8C2D9", accent: "#EFC9DA" },
  { id: "marfim", name: "Marfim", primary: "#D9C39B", secondary: "#AFC2A6", accent: "#EDE2CB" },
  { id: "camelia", name: "Camélia", primary: "#DFA3A8", secondary: "#B6BFD8", accent: "#F1CFC4" },
  { id: "musgo", name: "Musgo", primary: "#9BB08A", secondary: "#8FBBA6", accent: "#D3CDA2" },
  { id: "porcelana", name: "Porcelana", primary: "#9FC2CC", secondary: "#AEC9B6", accent: "#E2DCD2" },
  { id: "aquarela", name: "Aquarela", primary: "#9DB8DE", secondary: "#C3AED6", accent: "#F0C7B1" },
  { id: "linho", name: "Linho", primary: "#C9AE9B", secondary: "#A8BBA4", accent: "#E6D6C4" },
  { id: "iris", name: "Íris", primary: "#A6AEE0", secondary: "#8FC6C0", accent: "#D8BEE4" },
];

export const DEFAULT_PALETTE_ID = "sakura";
export const CUSTOM_PALETTE_ID = "custom";

export interface CustomColors {
  primary: string;
  secondary: string;
  accent: string;
}

export const DEFAULT_CUSTOM_COLORS: CustomColors = {
  primary: "#C9A9E9",
  secondary: "#9CC9B4",
  accent: "#F1C9B8",
};

export function getPalette(id: string | null | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

export function isCustom(id: string | null | undefined) {
  return id === CUSTOM_PALETTE_ID;
}

/** Nome amigável de qualquer paleta, inclusive a personalizada. */
export function paletteName(id: string | null | undefined) {
  return isCustom(id) ? "Personalizada" : getPalette(id).name;
}

/** Cores base (hex) de uma paleta ou das cores personalizadas. */
export function paletteColors(
  id: string | null | undefined,
  custom: CustomColors = DEFAULT_CUSTOM_COLORS,
): CustomColors {
  if (isCustom(id)) return { ...DEFAULT_CUSTOM_COLORS, ...custom };
  const p = getPalette(id);
  return { primary: p.primary, secondary: p.secondary, accent: p.accent };
}

export function normalizeHex(value: string, fallback: string) {
  const v = value.trim();
  const short = /^#?([0-9a-f]{3})$/i.exec(v);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const full = /^#?([0-9a-f]{6})$/i.exec(v);
  return full ? `#${full[1].toLowerCase()}` : fallback;
}

function luminance(hex: string) {
  const h = normalizeHex(hex, "#888888").slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Texto legível sobre a cor informada. */
function onColor(hex: string) {
  return luminance(hex) > 0.45 ? "oklch(0.18 0.01 260)" : "oklch(0.99 0 0)";
}

/** No tema claro as cores delicadas ganham profundidade para manter contraste. */
function tone(hex: string, mode: "light" | "dark", strength = 26) {
  return mode === "light" ? `color-mix(in oklab, ${hex} ${100 - strength}%, #101014)` : hex;
}

/** Cor efetiva (aproximada) usada para calcular o texto de contraste. */
function effectiveLuminanceHex(hex: string, mode: "light" | "dark") {
  if (mode === "dark") return hex;
  const h = normalizeHex(hex, "#888888").slice(1);
  const mixed = [0, 2, 4]
    .map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * 0.74 + 16 * 0.26))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  return `#${mixed}`;
}

/** Amostras exibidas nos cartões de seleção. */
export function paletteSwatches(colors: CustomColors) {
  return [colors.primary, colors.secondary, colors.accent];
}

/** Variáveis CSS geradas para a paleta, respeitando o modo claro/escuro. */
export function paletteVars(colors: CustomColors, mode: "light" | "dark"): Record<string, string> {
  const primary = tone(colors.primary, mode);
  const secondary = tone(colors.secondary, mode);
  const accent = tone(colors.accent, mode, 20);
  const secondarySoft = `color-mix(in oklab, ${secondary} 72%, white)`;

  const onPrimary = onColor(effectiveLuminanceHex(colors.primary, mode));
  const onSecondary = onColor(effectiveLuminanceHex(colors.secondary, mode));
  const ring = `color-mix(in oklab, ${primary} ${mode === "dark" ? 55 : 45}%, transparent)`;

  return {
    "--primary": primary,
    "--primary-foreground": onPrimary,
    "--gold": primary,
    "--gold-soft": accent,
    "--brand-green": secondary,
    "--brand-green-soft": secondarySoft,
    "--action-foreground": onSecondary,
    "--warning-foreground": onPrimary,
    "--ring": ring,
    "--chart-1": primary,
    "--chart-2": secondary,
    "--chart-3": accent,
    "--chart-4": secondarySoft,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": onPrimary,
    "--sidebar-ring": ring,
  };
}
