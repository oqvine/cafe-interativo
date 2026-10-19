// Personagens ilustrados (SVG): pele/roupa com volume, olhos vivos (íris + brilho),
// piscada e respiração (CSS), e bocas "visema" para sincronizar com a fala.
const O = "#3e2618"; // contorno
let uid = 0;

const LOOKS = {
  "dona-marta": {
    skin: ["#ffe1c7", "#f2b994"], iris: "#6b8fb5", outfit: ["#a983ff", "#7a55d6"], extra: marta,
  },
  "rafa-startup": {
    skin: ["#e9b086", "#c88158"], iris: "#5a3a22", outfit: ["#62c6f2", "#2f93c4"], extra: rafa,
  },
  "chef-lucien": {
    skin: ["#ffe6d2", "#efbfa0"], iris: "#3f7a5a", outfit: ["#ffffff", "#dfe3ea"], extra: lucien,
  },
};

function fallbackLook(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const outfits = [["#7fe0a0", "#3fb06b"], ["#ffb27a", "#e8743a"], ["#ffd36e", "#e0a52c"], ["#ff8e9a", "#d8505f"]];
  const skins = [["#ffe1c7", "#f2b994"], ["#e9b086", "#c88158"], ["#b9805a", "#8d5a3b"]];
  return { skin: skins[h % skins.length], iris: "#5a3a22", outfit: outfits[(h >> 3) % outfits.length], extra: () => ({ front: hair("#4a3020", "#6e4a33") }) };
}

// ---------- rosto ----------
const EYE_L = 92, EYE_R = 148, EYE_Y = 128;

function eye(x, look, e, id) {
  // olhos fechados/felizes
  if (e === "feliz") return `<path d="M${x - 13} ${EYE_Y + 3} q13 -14 26 0" stroke="${O}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
  const dx = e === "impaciente" ? 5 : e === "confuso" ? -3 : 0;
  const r = e === "encantado" ? 12 : 11;
  const lid =
    e === "impaciente" ? `<path d="M${x - 15} ${EYE_Y - 16} h30 v12 q-15 4 -30 0z" fill="url(#skin${id})"/><path d="M${x - 14} ${EYE_Y - 4} q14 4 28 0" stroke="${O}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : e === "irritado" ? `<path d="M${x - 15} ${EYE_Y - 16} h30 v8 l-30 6z" fill="url(#skin${id})" transform="${x < 120 ? "" : `scale(-1 1) translate(${-2 * x} 0)`}"/>`
    : "";
  const shine = e === "encantado"
    ? `<path transform="translate(${x + dx - 3} ${EYE_Y - 3}) scale(.55)" d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3Z" fill="#fff"/>`
    : `<circle cx="${x + dx - 4}" cy="${EYE_Y - 5}" r="3.6" fill="#fff"/><circle cx="${x + dx + 4}" cy="${EYE_Y + 4}" r="1.6" fill="#fff" opacity=".9"/>`;
  return `<g class="eye">
    <ellipse cx="${x}" cy="${EYE_Y}" rx="14" ry="${r + 3}" fill="#fff" stroke="${O}" stroke-width="3"/>
    <circle cx="${x + dx}" cy="${EYE_Y + 1}" r="${r - 2}" fill="url(#iris${id})"/>
    <circle cx="${x + dx}" cy="${EYE_Y + 1}" r="${r - 6.5}" fill="#1d120c"/>
    ${shine}
    ${lid}
  </g>`;
}

function brows(e, color) {
  const s = `stroke="${color}" stroke-width="6" fill="none" stroke-linecap="round"`;
  switch (e) {
    case "irritado": return `<path d="M76 104 L106 114 M164 104 L134 114" ${s}/>`;
    case "impaciente": return `<path d="M78 108 q14 -2 28 2 M162 108 q-14 -2 -28 2" ${s}/>`;
    case "confuso": return `<path d="M78 100 q14 -12 28 -2 M134 110 q14 0 28 -2" ${s}/>`;
    case "encantado": return `<path d="M78 102 q14 -10 28 0 M134 102 q14 -10 28 0" ${s}/>`;
    case "feliz": return `<path d="M78 106 q14 -8 28 0 M134 106 q14 -8 28 0" ${s}/>`;
    default: return `<path d="M78 107 q14 -6 28 0 M134 107 q14 -6 28 0" ${s}/>`;
  }
}

// Bocas: a "parada" depende da emoção; ao falar, o JS alterna os visemas (fechada/ê/á/ô).
function mouth(e) {
  const lip = `stroke="${O}" stroke-width="3.5" stroke-linejoin="round"`;
  let rest;
  switch (e) {
    case "feliz": rest = `<path d="M100 164 q20 22 40 0 q-20 8 -40 0z" fill="#8a2f3a" ${lip}/><path d="M108 170 q12 7 24 0" fill="#ff8a95"/>`; break;
    case "encantado": rest = `<path d="M98 160 q22 34 44 0 z" fill="#8a2f3a" ${lip}/><path d="M104 162 h32 v4 h-32z" fill="#fff"/><path d="M108 176 q12 8 24 0" fill="#ff8a95"/>`; break;
    case "irritado": rest = `<path d="M102 176 q18 -14 36 0" fill="none" ${lip} stroke-linecap="round"/>`; break;
    case "impaciente": rest = `<path d="M104 170 l32 -4" fill="none" ${lip} stroke-linecap="round"/>`; break;
    case "confuso": rest = `<path d="M102 170 q9 -7 18 0 t18 0" fill="none" ${lip} stroke-linecap="round"/>`; break;
    default: rest = `<path d="M104 167 q16 7 32 0" fill="none" ${lip} stroke-linecap="round"/>`;
  }
  return `<g class="mouth">
    <g class="v v-rest">${rest}</g>
    <g class="v v-m"><path d="M106 168 q14 4 28 0" fill="none" ${lip} stroke-linecap="round"/></g>
    <g class="v v-e"><path d="M102 164 q18 12 36 0 q-18 4 -36 0z" fill="#8a2f3a" ${lip}/><path d="M106 165 h28 v3 h-28z" fill="#fff"/></g>
    <g class="v v-a"><path d="M104 162 q16 30 32 0 q-16 -4 -32 0z" fill="#8a2f3a" ${lip}/><path d="M110 176 q10 6 20 0" fill="#ff8a95"/><path d="M106 163 h28 v3 h-28z" fill="#fff"/></g>
    <g class="v v-o"><ellipse cx="120" cy="170" rx="10" ry="12" fill="#8a2f3a" ${lip}/><path d="M113 177 q7 4 14 0" fill="#ff8a95"/></g>
  </g>`;
}

function cheeks(e) {
  const c = e === "irritado" ? "#ff4d5a" : "#ff8fa3";
  const op = e === "irritado" ? 0.5 : e === "feliz" || e === "encantado" ? 0.6 : 0.3;
  return `<ellipse cx="80" cy="154" rx="14" ry="9" fill="${c}" opacity="${op}" filter="url(#blur${uid})"/>
          <ellipse cx="160" cy="154" rx="14" ry="9" fill="${c}" opacity="${op}" filter="url(#blur${uid})"/>`;
}

function fx(e) {
  if (e === "confuso") return `<text x="196" y="58" font-size="46" font-weight="700" fill="#5b4bd6" font-family="Fredoka, sans-serif" class="fx-bob">?</text>`;
  if (e === "irritado") return `<g class="fx-bob" stroke="#ff4d5a" stroke-width="6" stroke-linecap="round"><path d="M190 44 l12 -12 M198 56 l16 -4 M186 30 l2 -16"/></g>`;
  if (e === "impaciente") return `<g class="fx-bob"><circle cx="200" cy="44" r="16" fill="#fff" stroke="${O}" stroke-width="3"/><path d="M200 34 v10 l7 5" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  if (e === "encantado") return `<g class="fx-bob" fill="#ff5a7a"><path transform="translate(196 44) scale(1.1)" d="M0 8 C-14 -4 -8 -16 0 -8 C8 -16 14 -4 0 8Z"/><path transform="translate(40 40) scale(.8)" d="M0 8 C-14 -4 -8 -16 0 -8 C8 -16 14 -4 0 8Z"/></g>`;
  return "";
}

function hair(c1, c2) {
  return `<path d="M50 120 C44 56 92 34 124 38 C170 40 196 70 190 122 C180 96 160 80 122 80 C88 80 62 94 50 120Z" fill="${c1}" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>
          <path d="M84 60 q30 -14 64 -2" stroke="${c2}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
}

// ---------- extras por personagem ----------
function marta(id) {
  return {
    back: `<circle cx="120" cy="40" r="30" fill="url(#hair${id})" stroke="${O}" stroke-width="3.5"/>
           <path d="M104 30 q16 -12 32 0" stroke="#fff" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/>`,
    hairGrad: ["#eeeaf5", "#b8b1c8"],
    front: `<path d="M46 124 C40 64 86 46 120 46 C158 46 202 62 194 124 C186 100 170 84 146 88 C134 74 106 74 94 88 C70 84 54 100 46 124Z" fill="url(#hair${id})" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>
            <path d="M70 80 q20 -18 46 -16 M128 64 q28 -2 46 18" stroke="#fff" stroke-width="4" fill="none" opacity=".65" stroke-linecap="round"/>
            <g fill="none" stroke="#8a6a3a" stroke-width="3.5">
              <circle cx="${EYE_L}" cy="${EYE_Y}" r="21" fill="#e8f6ff" fill-opacity=".18"/><circle cx="${EYE_R}" cy="${EYE_Y}" r="21" fill="#e8f6ff" fill-opacity=".18"/>
              <path d="M113 126 q7 -6 14 0"/><path d="M71 124 l-18 -6 M169 124 l18 -6"/>
            </g>
            <path d="M80 116 l8 -8 M136 116 l8 -8" stroke="#fff" stroke-width="3" opacity=".8" stroke-linecap="round"/>`,
    body: `<path d="M98 214 L120 246 L142 214" fill="#fffaf2" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>
           ${[0, 1, 2, 3, 4, 5, 6].map((i) => { const a = Math.PI * (0.15 + (i / 6) * 0.7); return `<circle cx="${120 - Math.cos(a) * 30}" cy="${210 + Math.sin(a) * 18}" r="5" fill="#fffaf2" stroke="${O}" stroke-width="2"/><circle cx="${118 - Math.cos(a) * 30}" cy="${208 + Math.sin(a) * 18}" r="1.6" fill="#fff"/>`; }).join("")}
           <path d="M120 246 V300" stroke="${O}" stroke-width="3"/>
           ${[262, 284].map((y) => `<circle cx="110" cy="${y}" r="4" fill="#f3d27a" stroke="${O}" stroke-width="2"/>`).join("")}
           <path d="M60 250 q-6 20 -4 50 M180 250 q6 20 4 50" stroke="#6a45c2" stroke-width="3" fill="none" opacity=".6"/>`,
  };
}

function rafa(id) {
  return {
    back: `<path d="M40 236 C30 186 70 168 120 168 C170 168 210 186 200 236 Z" fill="#3fa9d6" stroke="${O}" stroke-width="3.5"/>`,
    hairGrad: ["#5a3b28", "#2b1a10"],
    front: `<path d="M50 118 C44 66 82 36 124 40 C140 22 182 30 178 54 C200 70 196 100 190 120 C182 96 160 82 124 84 C92 84 64 96 50 118Z" fill="url(#hair${id})" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>
            <path d="M122 46 q24 -12 46 0 M94 62 q14 -10 30 -8" stroke="#8a6248" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
            <g><rect x="40" y="134" width="9" height="16" rx="4" fill="#fff" stroke="${O}" stroke-width="2.5"/><rect x="191" y="134" width="9" height="16" rx="4" fill="#fff" stroke="${O}" stroke-width="2.5"/></g>`,
    body: `<path d="M104 214 V252 M136 214 V252" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
           <circle cx="104" cy="256" r="5" fill="#fff" stroke="${O}" stroke-width="2"/><circle cx="136" cy="256" r="5" fill="#fff" stroke="${O}" stroke-width="2"/>
           <path d="M84 274 H156 V300 H84Z" fill="#2f93c4" stroke="${O}" stroke-width="3"/>
           <g class="phone" transform="translate(176 230) rotate(-14)">
             <rect x="-6" y="18" width="30" height="26" rx="12" fill="url(#skin${id})" stroke="${O}" stroke-width="3"/>
             <rect x="0" y="-12" width="26" height="46" rx="6" fill="#2a2433" stroke="${O}" stroke-width="3"/>
             <rect x="3" y="-7" width="20" height="34" rx="3" fill="#9fe0ff"/><path d="M6 0 h12 M6 6 h8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
           </g>`,
  };
}

function lucien(id) {
  return {
    back: `<g stroke="${O}" stroke-width="3.5" fill="url(#hat${id})">
             <circle cx="84" cy="34" r="28"/><circle cx="156" cy="34" r="28"/><circle cx="120" cy="18" r="32"/>
             <rect x="78" y="38" width="84" height="44" rx="8"/>
           </g>
           <path d="M96 44 v30 M120 40 v34 M144 44 v30" stroke="#d5dae2" stroke-width="3"/>
           <path d="M98 10 q20 -12 40 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    hairGrad: ["#8a5a36", "#5e3a20"],
    front: `<path d="M54 100 C62 86 90 80 120 80 C150 80 178 86 186 100" fill="none" stroke="url(#hair${id})" stroke-width="10" stroke-linecap="round"/>
            <g transform="translate(0 -7)"><path d="M120 156 C108 146 86 146 78 160 C70 150 76 140 86 140 C100 140 112 146 120 152 C128 146 140 140 154 140 C164 140 170 150 162 160 C154 146 132 146 120 156Z" fill="#2c1c14" stroke="${O}" stroke-width="2.5"/>
            <path d="M92 146 q8 -3 16 1" stroke="#6b4a36" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`,
    body: `<path d="M98 210 L120 246 L142 210 Z" fill="#ff4d5a" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>
           <path d="M120 246 l-8 18 l8 -6 l8 6 z" fill="#d8323f" stroke="${O}" stroke-width="2.5"/>
           ${[258, 280].map((y) => `<circle cx="104" cy="${y}" r="5" fill="#d5dae2" stroke="${O}" stroke-width="2"/><circle cx="136" cy="${y}" r="5" fill="#d5dae2" stroke="${O}" stroke-width="2"/>`).join("")}
           <path d="M72 250 q8 22 6 50 M168 250 q-8 22 -6 50" stroke="#c9ced8" stroke-width="3" fill="none"/>`,
  };
}

/** SVG completo do cliente. */
export function renderCustomer(id, emotion = "neutro") {
  const n = ++uid;
  const look = LOOKS[id] ?? fallbackLook(id);
  const x = look.extra(n);
  const hg = x.hairGrad ?? ["#6e4a33", "#3e2618"];
  return `<svg viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="cliente ${id}, ${emotion}">
  <defs>
    <radialGradient id="skin${n}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${look.skin[0]}"/><stop offset="1" stop-color="${look.skin[1]}"/></radialGradient>
    <linearGradient id="outfit${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${look.outfit[0]}"/><stop offset="1" stop-color="${look.outfit[1]}"/></linearGradient>
    <radialGradient id="iris${n}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset=".3" stop-color="${look.iris}"/><stop offset="1" stop-color="#1d120c"/></radialGradient>
    <linearGradient id="hair${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hg[0]}"/><stop offset="1" stop-color="${hg[1]}"/></linearGradient>
    <linearGradient id="hat${n}" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe3ea"/></linearGradient>
    <filter id="blur${n}"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <g class="body-g">
    ${x.back ?? ""}
    <path d="M24 300 C24 232 64 200 120 200 C176 200 216 232 216 300 Z" fill="url(#outfit${n})" stroke="${O}" stroke-width="3.5"/>
    <path d="M40 300 C44 250 70 222 104 214" stroke="#fff" stroke-width="6" fill="none" opacity=".25" stroke-linecap="round"/>
    ${x.body ?? ""}
    <path d="M104 182 h32 v30 q-16 10 -32 0z" fill="url(#skin${n})" stroke="${O}" stroke-width="3.5"/>
    <path d="M104 190 q16 10 32 0" fill="#000" opacity=".12"/>
  </g>
  <g class="head-g">
    <ellipse cx="46" cy="138" rx="14" ry="18" fill="url(#skin${n})" stroke="${O}" stroke-width="3.5"/>
    <ellipse cx="194" cy="138" rx="14" ry="18" fill="url(#skin${n})" stroke="${O}" stroke-width="3.5"/>
    <path d="M44 132 q4 8 0 14 M196 132 q-4 8 0 14" stroke="#c88158" stroke-width="3" fill="none" opacity=".6"/>
    <ellipse cx="120" cy="130" rx="76" ry="72" fill="url(#skin${n})" stroke="${O}" stroke-width="3.5"/>
    <path d="M70 176 q50 34 100 0" stroke="#000" stroke-width="8" opacity=".05" fill="none"/>
    ${cheeks(emotion)}
    <g class="eyes">${eye(EYE_L, look, emotion, n)}${eye(EYE_R, look, emotion, n)}</g>
    ${brows(emotion, x.hairGrad ? hg[1] : "#3e2618")}
    <path d="M116 136 q-8 14 2 18 q6 2 10 -2" stroke="#c88158" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    ${mouth(emotion)}
    ${x.front ?? ""}
  </g>
  ${fx(emotion)}
  <g class="think"><circle cx="206" cy="58" r="7" fill="#fff" stroke="${O}" stroke-width="3"/><circle cx="222" cy="34" r="12" fill="#fff" stroke="${O}" stroke-width="3"/>
    <circle cx="216" cy="34" r="2" fill="${O}"/><circle cx="222" cy="34" r="2" fill="${O}"/><circle cx="228" cy="34" r="2" fill="${O}"/></g>
</svg>`;
}

/** Lip-sync: alterna visemas enquanto fala. Retorna função para parar. */
export function startLipSync(el) {
  const order = ["v-a", "v-m", "v-e", "v-o", "v-a", "v-e", "v-m"];
  let i = 0;
  let timer = null;
  const set = (v) => el.querySelector(".mouth")?.setAttribute("data-v", v);
  const tick = () => {
    set(order[i++ % order.length]);
    timer = setTimeout(tick, 80 + Math.random() * 90);
  };
  tick();
  return {
    word() { set(Math.random() < 0.5 ? "v-a" : "v-o"); }, // reforço em cada palavra (boundary)
    stop() { clearTimeout(timer); set("v-rest"); },
  };
}
