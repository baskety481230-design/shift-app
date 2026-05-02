// 12 brand colors (HSL hue values) — minimal and tasteful
export const THEME_COLORS: { name: string; h: number; s: number; l: number }[] = [
  { name: "Indigo",   h: 230, s: 84, l: 58 },
  { name: "Blue",     h: 210, s: 92, l: 56 },
  { name: "Sky",      h: 198, s: 90, l: 52 },
  { name: "Teal",     h: 175, s: 70, l: 42 },
  { name: "Emerald",  h: 152, s: 65, l: 42 },
  { name: "Lime",     h: 90,  s: 65, l: 45 },
  { name: "Amber",    h: 38,  s: 92, l: 50 },
  { name: "Orange",   h: 22,  s: 92, l: 54 },
  { name: "Rose",     h: 350, s: 85, l: 58 },
  { name: "Pink",     h: 330, s: 80, l: 60 },
  { name: "Violet",   h: 268, s: 80, l: 60 },
  { name: "Slate",    h: 220, s: 14, l: 32 },
];

// 20 SVG-based patterns. Each returns a CSS background-image (data URI).
function svg(content: string): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(content)}")`;
}

const stroke = "rgba(15,23,42,0.06)";
const strokeStrong = "rgba(15,23,42,0.10)";

export const THEME_PATTERNS: { name: string; css: string }[] = [
  { name: "なし", css: "none" },
  { name: "ドット", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><circle cx='2' cy='2' r='1' fill='${stroke}'/></svg>`) },
  { name: "細グリッド", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><path d='M20 0H0V20' fill='none' stroke='${stroke}'/></svg>`) },
  { name: "斜めストライプ", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><path d='M-1 1l2-2M0 10l10-10M9 11l2-2' stroke='${stroke}'/></svg>`) },
  { name: "格子", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14'><path d='M0 7H14M7 0V14' stroke='${stroke}'/></svg>`) },
  { name: "六角", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'><path d='M14 0l14 8.7v17.6L14 35l-14-8.7V8.7z' fill='none' stroke='${stroke}'/></svg>`) },
  { name: "市松", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='8' height='8' fill='${stroke}'/><rect x='8' y='8' width='8' height='8' fill='${stroke}'/></svg>`) },
  { name: "波", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='12'><path d='M0 6 Q10 0 20 6 T40 6' fill='none' stroke='${stroke}'/></svg>`) },
  { name: "三角", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='18'><path d='M10 0L20 18H0z' fill='none' stroke='${stroke}'/></svg>`) },
  { name: "リング", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='6' fill='none' stroke='${stroke}'/></svg>`) },
  { name: "プラス", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><path d='M11 4v14M4 11h14' stroke='${stroke}'/></svg>`) },
  { name: "破線", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18'><path d='M0 9h18' stroke='${stroke}' stroke-dasharray='3 3'/></svg>`) },
  { name: "ストライプ縦", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><path d='M5 0v10' stroke='${stroke}'/></svg>`) },
  { name: "ストライプ横", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><path d='M0 5h10' stroke='${stroke}'/></svg>`) },
  { name: "星", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><path d='M14 4l2.5 6.5H23l-5.2 4 2 6.5L14 17l-5.8 4 2-6.5L5 10.5h6.5z' fill='none' stroke='${stroke}'/></svg>`) },
  { name: "麻の葉", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='42'><g fill='none' stroke='${stroke}'><path d='M12 0v42M0 10.5l24 21M24 10.5l-24 21'/></g></svg>`) },
  { name: "矢羽", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><path d='M0 8L8 0L16 8L8 16Z' fill='none' stroke='${stroke}'/></svg>`) },
  { name: "魚鱗", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='14'><path d='M0 14 A14 14 0 0 1 28 14' fill='none' stroke='${stroke}'/></svg>`) },
  { name: "和紙", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><g fill='${stroke}'><circle cx='5' cy='8' r='0.6'/><circle cx='25' cy='14' r='0.5'/><circle cx='14' cy='30' r='0.6'/><circle cx='34' cy='34' r='0.4'/></g></svg>`) },
  { name: "ノイズ", css: svg(`<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='80' height='80' fill='white' filter='url(#n)'/></svg>`) },
];

export function applyTheme(colorIndex: number, patternIndex: number): void {
  const c = THEME_COLORS[Math.max(0, Math.min(THEME_COLORS.length - 1, colorIndex))];
  const p = THEME_PATTERNS[Math.max(0, Math.min(THEME_PATTERNS.length - 1, patternIndex))];
  const root = document.documentElement;
  root.style.setProperty("--brand-h", String(c.h));
  root.style.setProperty("--brand-s", `${c.s}%`);
  root.style.setProperty("--brand-l", `${c.l}%`);
  root.style.setProperty("--pattern", p.css);
}

// Reference for inline use
export function brandStyle(colorIndex: number): React.CSSProperties {
  const c = THEME_COLORS[Math.max(0, Math.min(THEME_COLORS.length - 1, colorIndex))];
  return { backgroundColor: `hsl(${c.h} ${c.s}% ${c.l}%)` };
}
