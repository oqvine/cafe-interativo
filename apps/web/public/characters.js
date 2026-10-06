// Personagens cartoon em SVG. Rosto muda por emoção; boca anima ao falar (.talking).
const INK = "#2b2140";

const LOOKS = {
  "dona-marta": { skin: "#f6cfae", shirt: "#9b6bff", extra: marta },
  "rafa-startup": { skin: "#d99a6c", shirt: "#5ec8f2", extra: rafa },
  "chef-lucien": { skin: "#f2d3b8", shirt: "#ffffff", extra: lucien },
};

function fallbackLook(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const shirts = ["#5bd17a", "#ff8a3d", "#5ec8f2", "#ffc83d", "#ff5a5f"];
  const skins = ["#f6cfae", "#e8b48a", "#c98b5e", "#8d5a3b"];
  return { skin: skins[h % skins.length], shirt: shirts[(h >> 3) % shirts.length], extra: () => ({ back: "", front: hairShort("#4a3426") }) };
}

// ---------- partes do rosto ----------
function eyes(e) {
  const L = 78, R = 122, Y = 108;
  switch (e) {
    case "feliz":
      return `<path d="M${L - 7} ${Y + 2} q7 -9 14 0 M${R - 7} ${Y + 2} q7 -9 14 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case "encantado":
      return [L, R].map((x) => `<path transform="translate(${x} ${Y}) scale(.55)" d="M0 8 C -14 -4 -8 -16 0 -8 C 8 -16 14 -4 0 8 Z" fill="#ff5a5f" stroke="${INK}" stroke-width="3"/>`).join("");
    case "impaciente":
      return [L, R].map((x) => `<circle cx="${x}" cy="${Y + 1}" r="6" fill="${INK}"/><path d="M${x - 9} ${Y - 3} H${x + 9}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`).join("");
    case "irritado":
      return `<circle cx="${L}" cy="${Y + 2}" r="5" fill="${INK}"/><circle cx="${R}" cy="${Y + 2}" r="5" fill="${INK}"/>`;
    case "confuso":
      return `<circle cx="${L}" cy="${Y}" r="6.5" fill="${INK}"/><circle cx="${R}" cy="${Y + 1}" r="4" fill="${INK}"/>`;
    default:
      return `<circle cx="${L}" cy="${Y}" r="6" fill="${INK}"/><circle cx="${R}" cy="${Y}" r="6" fill="${INK}"/>`;
  }
}

function brows(e) {
  const s = `stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"`;
  switch (e) {
    case "irritado": return `<path d="M66 90 L90 99 M134 90 L110 99" ${s}/>`;
    case "impaciente": return `<path d="M68 94 L89 96 M132 94 L111 96" ${s}/>`;
    case "confuso": return `<path d="M68 88 q10 -10 20 0 M112 97 L132 95" ${s}/>`;
    case "encantado": case "feliz": return `<path d="M68 90 q10 -7 20 0 M112 90 q10 -7 20 0" ${s}/>`;
    default: return `<path d="M68 93 q10 -5 20 0 M112 93 q10 -5 20 0" ${s}/>`;
  }
}

function mouth(e) {
  const s = `stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"`;
  let still;
  switch (e) {
    case "feliz": still = `<path d="M84 134 Q100 150 116 134" ${s}/>`; break;
    case "encantado": still = `<path d="M82 131 Q100 160 118 131 Z" fill="#7a2e3a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M90 147 Q100 153 110 147" fill="#ff8fa3"/>`; break;
    case "impaciente": still = `<path d="M88 141 L113 137" ${s}/>`; break;
    case "irritado": still = `<path d="M85 145 Q100 131 115 145" ${s}/>`; break;
    case "confuso": still = `<path d="M85 141 q7 -6 15 0 t15 0" ${s}/>`; break;
    default: still = `<path d="M88 139 H112" ${s}/>`;
  }
  return `<g class="mouth-still">${still}</g>
    <ellipse class="mouth-talk" cx="100" cy="140" rx="10" ry="8" fill="#7a2e3a" stroke="${INK}" stroke-width="3"/>`;
}

function cheeks(e) {
  if (e === "irritado") return `<circle cx="70" cy="126" r="9" fill="#ff5a5f" opacity=".45"/><circle cx="130" cy="126" r="9" fill="#ff5a5f" opacity=".45"/>`;
  if (e === "feliz" || e === "encantado") return `<circle cx="68" cy="125" r="8" fill="#ff8fa3" opacity=".55"/><circle cx="132" cy="125" r="8" fill="#ff8fa3" opacity=".55"/>`;
  return "";
}

function overlay(e) {
  if (e === "confuso") return `<text x="152" y="52" font-size="34" font-weight="700" fill="${INK}" font-family="Fredoka, sans-serif">?</text>`;
  if (e === "irritado") return `<path d="M148 50 l10 -10 M154 58 l12 -4 M146 40 l2 -12" stroke="#ff5a5f" stroke-width="4" stroke-linecap="round"/>`;
  if (e === "impaciente") return `<text x="146" y="56" font-size="26">⏱</text>`;
  return "";
}

function hairShort(color) {
  return `<path d="M42 100 C40 50 80 36 104 40 C140 42 162 66 158 104 C150 82 130 70 100 70 C72 70 52 82 42 100 Z" fill="${color}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
}

// ---------- extras por personagem ----------
function marta() {
  return {
    back: `<circle cx="100" cy="38" r="24" fill="#cfcad9" stroke="${INK}" stroke-width="4"/>`,
    front: `<path d="M40 104 C36 56 74 44 100 44 C130 44 166 58 160 104 C154 84 140 70 118 74 C108 64 92 64 82 74 C62 70 46 84 40 104 Z" fill="#cfcad9" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <g fill="none" stroke="${INK}" stroke-width="3.5"><circle cx="78" cy="108" r="15" fill="rgba(255,255,255,.35)"/><circle cx="122" cy="108" r="15" fill="rgba(255,255,255,.35)"/><path d="M93 106 Q100 101 107 106"/></g>`,
    body: `<path d="M84 176 L100 196 L116 176" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${82 + i * 9}" cy="${186 + Math.abs(2 - i) * -3 + 4}" r="4" fill="#fffaf0" stroke="${INK}" stroke-width="2"/>`).join("")}
      <path d="M100 196 V260" stroke="${INK}" stroke-width="3"/><circle cx="92" cy="220" r="3" fill="${INK}"/><circle cx="92" cy="240" r="3" fill="${INK}"/>`,
  };
}

function rafa() {
  return {
    back: `<path d="M38 190 C30 150 60 140 100 140 C140 140 170 150 162 190 Z" fill="#3fa9d6" stroke="${INK}" stroke-width="4"/>`,
    front: `<path d="M42 96 C40 52 74 30 108 34 C126 22 156 30 150 48 C166 62 162 86 158 100 C150 78 128 66 100 68 C74 68 52 80 42 96 Z" fill="#3b2a20" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="41" cy="118" r="5" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="159" cy="118" r="5" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`,
    body: `<path d="M88 176 V206 M112 176 V206" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <circle cx="88" cy="208" r="4" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="112" cy="208" r="4" fill="#fff" stroke="${INK}" stroke-width="2"/>
      <path d="M70 232 H130 V258 H70 Z" fill="#3fa9d6" stroke="${INK}" stroke-width="3"/>
      <g transform="translate(140 196) rotate(-12)"><rect x="0" y="0" width="22" height="38" rx="5" fill="#2b2140"/><rect x="3" y="4" width="16" height="28" rx="2" fill="#c9eefc"/></g>`,
  };
}

function lucien() {
  return {
    back: `<g stroke="${INK}" stroke-width="4" fill="#fff"><circle cx="72" cy="30" r="22"/><circle cx="128" cy="30" r="22"/><circle cx="100" cy="18" r="26"/><rect x="66" y="34" width="68" height="34" rx="6"/></g>`,
    front: `<path d="M48 84 C56 70 80 64 100 64 C120 64 144 70 152 84" fill="none" stroke="#7a4b2a" stroke-width="8" stroke-linecap="round"/>
      <path d="M100 128 C90 120 74 122 70 132 C78 128 86 132 92 132 C96 132 100 130 100 128 C100 130 104 132 108 132 C114 132 122 128 130 132 C126 122 110 120 100 128 Z" fill="${INK}"/>`,
    body: `<path d="M80 172 L100 200 L120 172 Z" fill="#ff5a5f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      ${[204, 224, 244].map((y) => `<circle cx="88" cy="${y}" r="4" fill="${INK}"/><circle cx="112" cy="${y}" r="4" fill="${INK}"/>`).join("")}`,
  };
}

/** SVG completo do cliente. */
export function renderCustomer(id, emotion = "neutro") {
  const look = LOOKS[id] ?? fallbackLook(id);
  const x = look.extra();
  return `<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="cliente ${id} ${emotion}">
    ${x.back ?? ""}
    <path d="M26 260 C26 196 56 168 100 168 C144 168 174 196 174 260 Z" fill="${look.shirt}" stroke="${INK}" stroke-width="4"/>
    ${x.body ?? ""}
    <rect x="88" y="150" width="24" height="24" fill="${look.skin}" stroke="${INK}" stroke-width="4"/>
    <circle cx="40" cy="112" r="11" fill="${look.skin}" stroke="${INK}" stroke-width="4"/>
    <circle cx="160" cy="112" r="11" fill="${look.skin}" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="100" cy="108" rx="60" ry="58" fill="${look.skin}" stroke="${INK}" stroke-width="4"/>
    ${cheeks(emotion)}
    ${brows(emotion)}
    ${eyes(emotion)}
    <path d="M97 112 q-6 12 4 13" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    ${mouth(emotion)}
    ${x.front ?? ""}
    ${overlay(emotion)}
    <g class="think"><circle cx="160" cy="40" r="5" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="172" cy="24" r="8" fill="#fff" stroke="${INK}" stroke-width="2.5"/><text x="164" y="29" font-size="12" font-weight="700" fill="${INK}">…</text></g>
  </svg>`;
}
