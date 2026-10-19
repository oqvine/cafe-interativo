// Bebidas ilustradas (SVG). Usadas nos botões de preparo e no balcão ao servir.
const O = "#4a2f22"; // contorno marrom quente (menos "duro" que preto)
let uid = 0;

const defs = (id) => `
  <linearGradient id="cer${id}" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f4efe8"/><stop offset="1" stop-color="#d9cfc2"/></linearGradient>
  <linearGradient id="glass${id}" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".75"/><stop offset=".4" stop-color="#e8f6ff" stop-opacity=".35"/><stop offset="1" stop-color="#bfe3f5" stop-opacity=".6"/></linearGradient>
  <radialGradient id="coffee${id}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#a9683c"/><stop offset="1" stop-color="#5a2f17"/></radialGradient>
  <radialGradient id="foam${id}" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fff8ec"/><stop offset="1" stop-color="#e7cba4"/></radialGradient>`;

const saucer = (id) => `<ellipse cx="50" cy="84" rx="40" ry="9" fill="url(#cer${id})" stroke="${O}" stroke-width="2.5"/>
  <ellipse cx="50" cy="82" rx="24" ry="4.5" fill="#e3d8cb"/>`;

function cupBody(id, { top = 40, w = 52, h = 40, fill, art = "" }) {
  const l = 50 - w / 2, r = 50 + w / 2;
  return `
  <path d="M${r - 2} ${top + 8} q18 2 16 14 q-2 12 -20 10" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/>
  <path d="M${r - 2} ${top + 8} q18 2 16 14 q-2 12 -20 10" fill="none" stroke="#f4efe8" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M${l} ${top} H${r} L${r - 6} ${top + h - 6} Q50 ${top + h + 4} ${l + 6} ${top + h - 6} Z" fill="url(#cer${id})" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
  <ellipse cx="50" cy="${top}" rx="${w / 2}" ry="7" fill="${fill}" stroke="${O}" stroke-width="2.5"/>
  ${art}
  <path d="M${l + 6} ${top + 8} q2 14 6 22" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8" fill="none"/>`;
}

function steam() {
  return `<g class="steam" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".75">
    <path d="M42 30 q-6 -8 0 -14 q6 -6 0 -14"/><path d="M56 28 q-6 -8 0 -14 q6 -6 0 -14"/></g>`;
}

const DRINKS = {
  espresso: (id) =>
    saucer(id) +
    cupBody(id, { top: 56, w: 34, h: 26, fill: `url(#coffee${id})`, art: `<ellipse cx="50" cy="56" rx="12" ry="3" fill="#c98a52" opacity=".7"/>` }) +
    steam(),
  latte: (id) =>
    saucer(id) +
    cupBody(id, {
      top: 44, w: 54, h: 38, fill: `url(#coffee${id})`,
      art: `<path d="M50 49 c-9 -6 -9 -12 -3 -12 c2 0 3 2 3 3 c0 -1 1 -3 3 -3 c6 0 6 6 -3 12z" fill="#fff4e3"/><path d="M50 49 v-10" stroke="#fff4e3" stroke-width="1.5"/>`,
    }) +
    steam(),
  cappuccino: (id) =>
    saucer(id) +
    cupBody(id, {
      top: 46, w: 50, h: 36, fill: `url(#foam${id})`,
      art: `<circle cx="44" cy="45" r="2" fill="#8a5330" opacity=".6"/><circle cx="54" cy="47" r="1.6" fill="#8a5330" opacity=".6"/><circle cx="50" cy="43" r="1.3" fill="#8a5330" opacity=".6"/>`,
    }) +
    steam(),
  mocha: (id) => `
    <path d="M30 26 h40 l-5 62 q-15 6 -30 0 z" fill="url(#glass${id})" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M33 60 h34 l-2.5 27 q-14.5 5 -29 0 z" fill="#5a2f17"/>
    <path d="M32 44 h36 l-1 16 h-34 z" fill="#a9683c"/>
    <path d="M30 28 q4 -16 20 -16 q16 0 20 16 q-6 6 -20 4 q-14 2 -20 -4z" fill="#fffaf2" stroke="${O}" stroke-width="2.5"/>
    <path d="M38 22 q6 -4 12 0 q6 -4 12 0" stroke="#7a3f1d" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M35 34 q2 22 3 48" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>`,
  "cold-brew": (id) => `
    <path d="M58 6 l-6 40" stroke="#ff5a5f" stroke-width="5" stroke-linecap="round"/><path d="M58 6 l-6 40" stroke="#fff" stroke-width="1.5" stroke-dasharray="4 4" stroke-linecap="round"/>
    <path d="M28 30 h44 l-5 58 q-17 5 -34 0 z" fill="url(#glass${id})" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M30 42 h40 l-4 45 q-16 4 -32 0 z" fill="#3e1f0e" opacity=".92"/>
    <rect x="36" y="44" width="12" height="11" rx="2" fill="#dff4ff" opacity=".75" transform="rotate(-12 42 49)"/>
    <rect x="52" y="52" width="11" height="10" rx="2" fill="#dff4ff" opacity=".7" transform="rotate(14 57 57)"/>
    <rect x="40" y="62" width="10" height="9" rx="2" fill="#dff4ff" opacity=".6"/>
    <ellipse cx="50" cy="30" rx="22" ry="5" fill="none" stroke="${O}" stroke-width="2.5"/>
    <path d="M33 36 q2 22 3 48" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>`,
  "cha-mate": (id) => `
    <path d="M28 30 h44 l-5 58 q-17 5 -34 0 z" fill="url(#glass${id})" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M30 40 h40 l-4 47 q-16 4 -32 0 z" fill="#d98a2b" opacity=".85"/>
    <rect x="38" y="46" width="11" height="10" rx="2" fill="#fff6dc" opacity=".7" transform="rotate(-10 43 51)"/>
    <circle cx="66" cy="32" r="12" fill="#f7e463" stroke="${O}" stroke-width="2.5"/><circle cx="66" cy="32" r="8" fill="#fbf2a6"/>
    <path d="M66 24 v16 M58 32 h16 M60 26 l12 12 M72 26 l-12 12" stroke="#e8cf3a" stroke-width="1.4"/>
    <path d="M33 36 q2 22 3 48" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>`,
  "pao-de-queijo": (id) => `
    <ellipse cx="50" cy="78" rx="42" ry="12" fill="url(#cer${id})" stroke="${O}" stroke-width="2.5"/>
    ${[[34, 64], [62, 64], [48, 52]].map(([x, y]) => `
      <circle cx="${x}" cy="${y}" r="15" fill="#f2c063" stroke="${O}" stroke-width="2.5"/>
      <circle cx="${x - 4}" cy="${y - 5}" r="6" fill="#ffe3a0" opacity=".8"/>
      <circle cx="${x + 5}" cy="${y + 3}" r="1.6" fill="#c98a2e"/><circle cx="${x - 2}" cy="${y + 6}" r="1.3" fill="#c98a2e"/>`).join("")}`,
};

/** SVG de uma bebida. Ids de gradiente únicos por instância. */
export function drinkSVG(itemId, size = 64) {
  const id = ++uid;
  const draw = DRINKS[itemId] ?? DRINKS.latte;
  return `<svg class="drink" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><defs>${defs(id)}</defs>${draw(id)}</svg>`;
}
