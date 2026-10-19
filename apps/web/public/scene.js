// Cenário ilustrado em SVG: fundo (parede, janela, luz) + balcão (frente, máquina, vitrine).
// Cliente fica ENTRE os dois → profundidade de verdade.
const O = "#4a2f22";

export function renderBackground() {
  return `<svg class="bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3cf95"/><stop offset=".6" stop-color="#eebd7a"/><stop offset="1" stop-color="#d99a5b"/>
    </linearGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6cc7f5"/><stop offset=".7" stop-color="#b9e6fb"/><stop offset="1" stop-color="#ffe9c4"/>
    </linearGradient>
    <linearGradient id="woodV" x1="0" x2="1"><stop offset="0" stop-color="#9b5a32"/><stop offset=".5" stop-color="#b8723f"/><stop offset="1" stop-color="#8a4c28"/></linearGradient>
    <linearGradient id="plank" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98550"/><stop offset="1" stop-color="#8f5129"/></linearGradient>
    <linearGradient id="slate" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d4a43"/><stop offset="1" stop-color="#26302b"/></linearGradient>
    <linearGradient id="ray" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffbe8" stop-opacity=".55"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2b8" stop-opacity=".9"/><stop offset=".35" stop-color="#ffd772" stop-opacity=".35"/><stop offset="1" stop-color="#ffd772" stop-opacity="0"/></radialGradient>
    <radialGradient id="vignette" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a1f0e" stop-opacity=".35"/></radialGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f5d50"/><stop offset="1" stop-color="#1e3d34"/></linearGradient>
    <linearGradient id="brass" x1="0" x2="1"><stop offset="0" stop-color="#b8862f"/><stop offset=".5" stop-color="#f3d27a"/><stop offset="1" stop-color="#9a6d22"/></linearGradient>
    <pattern id="bricks" width="120" height="60" patternUnits="userSpaceOnUse">
      <rect width="120" height="60" fill="#c8794b"/>
      <g fill="#d68a59" stroke="#a85f36" stroke-width="3">
        <rect x="2" y="2" width="56" height="26" rx="4"/><rect x="62" y="2" width="56" height="26" rx="4"/>
        <rect x="-28" y="32" width="56" height="26" rx="4"/><rect x="32" y="32" width="56" height="26" rx="4"/><rect x="92" y="32" width="56" height="26" rx="4"/>
      </g>
    </pattern>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#3a1f0e" flood-opacity=".28"/></filter>
    <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>

  <!-- parede + painéis -->
  <rect width="1600" height="900" fill="url(#wall)"/>
  ${Array.from({ length: 17 }, (_, i) => `<rect x="${i * 100 - 2}" y="0" width="4" height="900" fill="#d9a466" opacity=".35"/>`).join("")}
  <rect x="1060" y="0" width="540" height="900" fill="url(#bricks)" opacity=".9"/>
  <rect x="1050" y="0" width="14" height="900" fill="#b8723f"/>
  <rect y="600" width="1600" height="300" fill="#a8643a"/>
  <rect y="596" width="1600" height="14" fill="#7a4223"/>

  <!-- janela -->
  <g filter="url(#soft)">
    <rect x="110" y="110" width="420" height="380" rx="18" fill="url(#woodV)"/>
    <rect x="132" y="132" width="376" height="336" rx="8" fill="url(#sky)"/>
    <circle cx="420" cy="215" r="70" fill="url(#glow)"/>
    <circle cx="420" cy="215" r="34" fill="#ffd34d"/>
    <g class="clouds" fill="#fff" opacity=".9">
      <g class="cloud a"><ellipse cx="220" cy="220" rx="56" ry="20"/><ellipse cx="250" cy="206" rx="34" ry="22"/></g>
      <g class="cloud b"><ellipse cx="330" cy="300" rx="44" ry="15"/><ellipse cx="352" cy="290" rx="26" ry="16"/></g>
    </g>
    <g fill="#8fb9d6" opacity=".85">
      <rect x="140" y="370" width="50" height="98"/><rect x="196" y="340" width="40" height="128"/><rect x="242" y="390" width="62" height="78"/>
      <rect x="310" y="355" width="44" height="113"/><rect x="360" y="400" width="70" height="68"/><rect x="436" y="365" width="64" height="103"/>
    </g>
    <g fill="#d8ecf8" opacity=".9">
      ${[[150, 385], [166, 385], [150, 410], [206, 355], [220, 380], [322, 372], [446, 380], [470, 405], [252, 405]].map(([x, y]) => `<rect x="${x}" y="${y}" width="8" height="10" rx="1"/>`).join("")}
    </g>
    <rect x="316" y="132" width="10" height="336" fill="url(#woodV)"/>
    <rect x="132" y="296" width="376" height="10" fill="url(#woodV)"/>
    <rect x="96" y="482" width="448" height="22" rx="6" fill="url(#plank)"/>
    <!-- vasinho na janela -->
    <path d="M150 482 l6 -34 h36 l6 34 z" fill="#d9663b" stroke="${O}" stroke-width="3"/>
    <g fill="#5fbf6b" stroke="#2f7a3c" stroke-width="2.5">
      <path d="M174 450 q-30 -30 -14 -60 q20 20 14 60z"/><path d="M174 450 q30 -28 18 -62 q-24 22 -18 62z"/><path d="M174 450 q2 -40 0 -72 q-12 30 0 72z"/>
    </g>
  </g>
  <!-- raios de luz -->
  <polygon class="rays" points="132,132 508,132 900,900 300,900" fill="url(#ray)" opacity=".55"/>

  <!-- prateleira -->
  <g filter="url(#soft)">
    <rect x="600" y="300" width="400" height="18" rx="4" fill="url(#plank)"/>
    <path d="M630 318 l20 34 M970 318 l-20 34" stroke="#7a4223" stroke-width="8" stroke-linecap="round"/>
    ${[640, 712].map((x) => `
      <rect x="${x}" y="226" width="56" height="74" rx="12" fill="#e8f6ff" fill-opacity=".55" stroke="${O}" stroke-width="3"/>
      <rect x="${x + 4}" y="250" width="48" height="46" rx="8" fill="#6b3a1c"/>
      ${Array.from({ length: 7 }, (_, k) => `<ellipse cx="${x + 12 + (k % 4) * 10}" cy="${258 + Math.floor(k / 4) * 14}" rx="4.5" ry="3" fill="#a5683c"/>`).join("")}
      <rect x="${x - 2}" y="218" width="60" height="12" rx="4" fill="#c4874f" stroke="${O}" stroke-width="3"/>
      <path d="M${x + 10} 238 v40" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/>`).join("")}
    <g transform="translate(800 230)">
      ${[0, 1, 2].map((k) => `<path d="M${-28} ${44 - k * 24} h56 l-6 24 h-44 z" fill="#f6f1ea" stroke="${O}" stroke-width="3"/>`).join("")}
    </g>
    <path d="M900 300 l6 -40 h52 l6 40 z" fill="#3f7fb8" stroke="${O}" stroke-width="3"/>
    <g fill="#5fbf6b" stroke="#2f7a3c" stroke-width="2.5">
      <path d="M932 262 q-40 -10 -50 -46 q34 0 50 46z"/><path d="M932 262 q34 -20 56 -50 q-44 4 -56 50z"/><path d="M932 262 q-4 -40 8 -70 q14 34 -8 70z"/>
    </g>
  </g>

  <!-- lousa -->
  <g filter="url(#soft)">
    <rect x="1120" y="100" width="380" height="400" rx="16" fill="#7a4223"/>
    <rect x="1136" y="116" width="348" height="368" rx="8" fill="url(#slate)"/>
    <text x="1310" y="172" text-anchor="middle" class="chalk title">Cardápio</text>
    <path d="M1200 186 q110 10 220 0" stroke="#f3e9d2" stroke-width="2.5" fill="none" opacity=".7"/>
    <g id="boardItems"></g>
    <path d="M1170 460 q16 -12 30 0 q14 12 28 0" stroke="#ffc83d" stroke-width="3" fill="none" opacity=".8"/>
  </g>

  <!-- luminárias -->
  ${[420, 800, 1180].map((x, i) => `
    <g class="lamp l${i}" style="transform-origin:${x}px 0px">
      <line x1="${x}" y1="0" x2="${x}" y2="70" stroke="#3a2a22" stroke-width="4"/>
      <circle cx="${x}" cy="128" r="180" fill="url(#glow)" class="lamp-glow"/>
      <path d="M${x - 60} 120 q60 -70 120 0 z" fill="url(#shade)" stroke="${O}" stroke-width="3"/>
      <rect x="${x - 10}" y="64" width="20" height="16" rx="3" fill="url(#brass)"/>
      <ellipse cx="${x}" cy="120" rx="60" ry="8" fill="#20372f"/>
      <ellipse cx="${x}" cy="124" rx="18" ry="10" fill="#fff6c9"/>
    </g>`).join("")}

  <rect width="1600" height="900" fill="url(#vignette)"/>
</svg>`;
}

export function renderCounter() {
  return `<svg class="fg" viewBox="0 0 1600 330" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1d3a6"/><stop offset="1" stop-color="#d8ad74"/></linearGradient>
    <linearGradient id="front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4a26"/><stop offset="1" stop-color="#5e2f16"/></linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9c5a31"/><stop offset="1" stop-color="#7a4223"/></linearGradient>
    <linearGradient id="chrome" x1="0" x2="1"><stop offset="0" stop-color="#8d98a3"/><stop offset=".25" stop-color="#f4f7fa"/><stop offset=".5" stop-color="#b9c3cc"/><stop offset=".8" stop-color="#eef2f5"/><stop offset="1" stop-color="#7c8792"/></linearGradient>
    <linearGradient id="red" x1="0" x2="1"><stop offset="0" stop-color="#c9373b"/><stop offset=".45" stop-color="#ff6b5f"/><stop offset="1" stop-color="#a82a2e"/></linearGradient>
    <linearGradient id="dome" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".7"/><stop offset=".35" stop-color="#e8f6ff" stop-opacity=".18"/><stop offset="1" stop-color="#cfe9f7" stop-opacity=".45"/></linearGradient>
    <filter id="cs" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#2a1408" flood-opacity=".35"/></filter>
  </defs>

  <!-- tampo -->
  <rect x="0" y="40" width="1600" height="300" fill="url(#front)"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${30 + i * 200}" y="92" width="170" height="200" rx="10" fill="url(#panel)" stroke="#5a2c14" stroke-width="4"/>
     <rect x="${42 + i * 200}" y="104" width="146" height="8" rx="4" fill="#b8723f" opacity=".5"/>`).join("")}
  <rect x="0" y="22" width="1600" height="34" rx="6" fill="url(#top)" filter="url(#cs)"/>
  <rect x="0" y="22" width="1600" height="6" fill="#fff3dc" opacity=".8"/>
  <rect x="0" y="54" width="1600" height="10" fill="#3a1d0c" opacity=".35"/>

  <!-- vitrine de doces (direita, sob a lousa) -->
  <g transform="translate(1260 -112)">
    <ellipse cx="110" cy="134" rx="120" ry="12" fill="#2a1408" opacity=".25"/>
    <rect x="-6" y="120" width="232" height="16" rx="6" fill="#e9e2d6" stroke="${O}" stroke-width="3"/>
    <g>
      <path d="M36 118 q20 -34 52 -10 q-24 -2 -52 10z" fill="#e7a24a" stroke="${O}" stroke-width="3"/>
      <path d="M40 116 q22 -24 46 -8" stroke="#c97c2c" stroke-width="2.5" fill="none"/>
      ${[[124, 108], [148, 110], [136, 92], [172, 108]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#f2c063" stroke="${O}" stroke-width="2.5"/><circle cx="${x - 4}" cy="${y - 4}" r="5" fill="#ffe3a0"/>`).join("")}
    </g>
    <path d="M4 120 q0 -120 106 -120 q106 0 106 120 z" fill="url(#dome)" stroke="${O}" stroke-width="3"/>
    <path d="M40 100 q4 -60 50 -80" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".75"/>
    <circle cx="110" cy="-6" r="10" fill="#e9e2d6" stroke="${O}" stroke-width="3"/>
  </g>

  <!-- máquina de espresso (esquerda) -->
  <g transform="translate(110 -198)" filter="url(#cs)">
    <rect x="0" y="30" width="300" height="190" rx="22" fill="url(#red)" stroke="${O}" stroke-width="4"/>
    <rect x="16" y="0" width="268" height="44" rx="14" fill="url(#chrome)" stroke="${O}" stroke-width="4"/>
    <rect x="22" y="62" width="256" height="70" rx="12" fill="url(#chrome)" stroke="${O}" stroke-width="4"/>
    <circle cx="80" cy="97" r="22" fill="#fffaf0" stroke="${O}" stroke-width="4"/><path d="M80 97 l12 -10" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="220" cy="97" r="22" fill="#fffaf0" stroke="${O}" stroke-width="4"/><path d="M220 97 l-8 -12" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
    ${[90, 210].map((x) => `
      <rect x="${x - 28}" y="140" width="56" height="20" rx="6" fill="url(#chrome)" stroke="${O}" stroke-width="3"/>
      <rect x="${x - 6}" y="160" width="12" height="16" fill="#5d6770"/>
      <path d="M${x + 26} 150 h40" stroke="#2a1a12" stroke-width="10" stroke-linecap="round"/>`).join("")}
    <rect x="18" y="200" width="264" height="22" rx="6" fill="#5d6770" stroke="${O}" stroke-width="3"/>
    ${Array.from({ length: 10 }, (_, i) => `<rect x="${30 + i * 25}" y="205" width="14" height="12" rx="2" fill="#3e464d"/>`).join("")}
    <path d="M36 50 q4 100 0 150" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".35" fill="none"/>
    <g class="steam" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".6">
      <path d="M260 -6 q-14 -20 0 -40 q14 -20 0 -40"/><path d="M236 0 q-12 -18 0 -36 q12 -18 0 -36"/>
    </g>
    <text x="150" y="32" text-anchor="middle" class="brand-plate">CAFÉ</text>
  </g>
</svg>`;
}

/** Escreve o cardápio na lousa (texto "giz"). */
export function fillBoard(svgRoot, menu) {
  const g = svgRoot.querySelector("#boardItems");
  if (!g) return;
  const fmt = (n) => String(n).replace(".", ",");
  g.innerHTML = menu
    .map(
      (m, i) => `<text x="1168" y="${228 + i * 36}" class="chalk">${m.name}</text>
        <text x="1456" y="${228 + i * 36}" text-anchor="end" class="chalk price">${fmt(m.prices.P)} · ${fmt(m.prices.M)} · ${fmt(m.prices.G)}</text>`,
    )
    .join("");
}
