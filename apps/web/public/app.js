// UI do jogo. Fala com apps/server via WebSocket (/ws).
import { renderCustomer } from "./characters.js";
import { createConversation, hasNaturalVoice, speak, stopSpeaking, sttSupported, ttsSupported } from "./voice.js";

const $ = (id) => document.getElementById(id);
const EMOJI_ITEM = { espresso: "☕", latte: "🥛", cappuccino: "☕", mocha: "🍫", "cold-brew": "🧊", "cha-mate": "🍋", "pao-de-queijo": "🧀" };
const EMOJI_EMO = { feliz: ["😊", "✨"], encantado: ["😍", "💖", "⭐"], neutro: ["👍"], impaciente: ["⏱", "💨"], irritado: ["💢", "😠"], confuso: ["❓", "🤔"] };
const brl = (n) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

const state = {
  menu: [],
  modifiers: [],
  customers: [],
  current: null,
  emotion: "neutro",
  busy: true,
  score: 0,
  tray: [],
  size: "M",
  mods: new Set(),
  pick: null, // null = aleatório
  muted: false,
  cc: false, // legendas: desligadas → conversa só por voz
  talking: false, // TTS do cliente tocando
  leaving: false,
};

try {
  state.muted = localStorage.getItem("cafe.muted") === "1";
  state.cc = localStorage.getItem("cafe.cc") === "1";
} catch { /* sem storage */ }

// ---------- WebSocket ----------
let ws;
function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = () => send({ type: "hello" });
  ws.onmessage = (ev) => onMessage(JSON.parse(ev.data));
  ws.onclose = () => {
    toast("Conexão perdida. Tentando de novo…", "bad");
    setTimeout(connect, 1500);
  };
}
const send = (m) => ws?.readyState === 1 && ws.send(JSON.stringify(m));

// ---------- mensagens do server ----------
let speaking = Promise.resolve();

function onMessage(m) {
  switch (m.type) {
    case "init":
      state.menu = m.menu;
      state.modifiers = m.modifiers ?? [];
      state.customers = m.customers;
      setScore(m.score?.points ?? 0, false);
      renderMenu();
      renderPick();
      $("start").disabled = false;
      $("start").textContent = "Abrir a cafeteria";
      break;

    case "arrive":
      state.current = m.customer;
      state.leaving = false;
      state.emotion = "neutro";
      drawCustomer("enter");
      $("nameplate").textContent = m.customer.name;
      $("nameplate").classList.remove("hidden");
      $("cupZone").innerHTML = "";
      hideTicket();
      clearTray();
      log("sys", `${m.customer.name} chegou ao balcão`);
      break;

    case "thinking":
      setBusy(m.on);
      if (m.on) {
        conv?.pause();
        $("customer").classList.add("thinking");
        showBubble(null);
      } else {
        resumeIfIdle();
      }
      break;

    case "line": {
      const emo = m.emotion ?? state.emotion;
      if (emo !== state.emotion) {
        state.emotion = emo;
        drawCustomer();
      }
      $("customer").classList.remove("thinking");
      // Sem legenda e com voz: o balão some, a conversa é só falada.
      if (state.cc || state.muted || !ttsSupported) showBubble(m.speech);
      else $("bubble").classList.add("hidden");
      log("them", m.speech, `${state.current?.name ?? "cliente"} · ${emo} · ${(m.ms / 1000).toFixed(1)}s`);
      speaking = say(m.speech).then(resumeIfIdle);
      break;
    }

    case "order":
      if (m.order) showTicket(m.order);
      else hideTicket();
      break;

    case "served": {
      const cups = state.lastServed ?? [];
      $("cupZone").innerHTML = cups.map((i) => `<span class="cup">${EMOJI_ITEM[i.itemId] ?? "☕"}</span>`).join("");
      setScore(state.score + m.points);
      const good = m.accuracy >= 0.99;
      toast(good ? `Perfeito! +${m.points} pts` : `+${m.points} pts · ${m.issues.join(" · ")}`, good ? "good" : "bad");
      log("sys", good ? `🎯 ${m.points} pts — perfeito` : `🎯 ${m.points} pts — ${m.issues.join("; ")}`);
      break;
    }

    case "react":
      burst(EMOJI_EMO[m.emotion] ?? ["✨"]);
      if (m.tip > 0) {
        setScore(state.score + m.tip);
        setTimeout(() => toast(`Gorjeta: +${m.tip} 💰`, "good"), 900);
      }
      break;

    case "tool":
      if (["create_order", "change_order", "close_order"].includes(m.name)) log("sys", `⚙ ${m.name.replace("_", " ")}`);
      break;

    case "leave":
      state.leaving = true;
      conv?.pause();
      setScore(m.score?.points ?? state.score);
      speaking.then(() => {
        $("customer").className = "customer leave";
        $("bubble").classList.add("hidden");
        $("nameplate").classList.add("hidden");
        setTimeout(() => betweenCustomers(m.score), 800);
      });
      break;

    case "error":
      toast(m.message, "bad");
      log("sys", `⚠ ${m.message}`);
      setBusy(false);
      break;
  }
}

// ---------- cena ----------
function drawCustomer(anim) {
  const el = $("customer");
  el.innerHTML = renderCustomer(state.current?.id ?? "?", state.emotion);
  el.className = `customer idle e-${state.emotion}${anim ? " " + anim : ""}`;
  if (anim) el.addEventListener("animationend", () => el.classList.remove(anim), { once: true });
}

function showBubble(text) {
  const b = $("bubble");
  b.classList.remove("hidden", "dots");
  if (text == null) {
    b.classList.add("dots");
    $("bubbleText").innerHTML = "<span>•</span><span style='animation-delay:.2s'>•</span><span style='animation-delay:.4s'>•</span>";
  } else {
    $("bubbleText").textContent = text;
  }
  b.style.animation = "none";
  void b.offsetWidth; // reinicia o "pop"
  b.style.animation = "";
}

function say(text) {
  if (state.muted || !ttsSupported) return Promise.resolve();
  const el = $("customer");
  state.talking = true;
  return speak(text, state.current?.id, {
    onStart: () => el.classList.add("talking"),
    onEnd: () => el.classList.remove("talking"),
  }).finally(() => {
    state.talking = false;
  });
}

function showTicket(o) {
  $("ticketId").textContent = `#${o.id}`;
  $("ticketItems").innerHTML = o.items
    .map((i) => `<li>${itemName(i.itemId)} ${i.size}${i.modifiers.length ? ` <small>(${i.modifiers.join(", ")})</small>` : ""}</li>`)
    .join("");
  $("ticketTotal").textContent = brl(o.total);
  $("ticket").classList.remove("hidden");
}
const hideTicket = () => $("ticket").classList.add("hidden");

function burst(emojis) {
  const box = $("burst");
  for (let i = 0; i < 10; i++) {
    const s = document.createElement("i");
    s.textContent = emojis[i % emojis.length];
    const a = (Math.PI * 2 * i) / 10;
    s.style.setProperty("--dx", `${Math.cos(a) * 120}px`);
    s.style.setProperty("--dy", `${Math.sin(a) * 90 - 30}px`);
    box.appendChild(s);
    setTimeout(() => s.remove(), 1300);
  }
}

let toastTimer;
function toast(text, kind = "") {
  const t = $("toast");
  t.textContent = text;
  t.className = `toast ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 3200);
}

function setScore(n, pop = true) {
  state.score = n;
  $("score").textContent = `${n} pts`;
  if (pop) {
    $("score").classList.remove("pop");
    void $("score").offsetWidth;
    $("score").classList.add("pop");
  }
}

// Textos ficam "por debaixo dos panos": só no console (F12) para depurar.
function log(kind, text, meta) {
  console.debug(`[${kind}] ${text}${meta ? ` — ${meta}` : ""}`);
}

function setBusy(on) {
  state.busy = on;
  $("textInput").disabled = on;
  $("deliver").disabled = on || !state.tray.length;
  $("bye").disabled = on;
}

// ---------- cardápio / preparo ----------
const itemName = (id) => state.menu.find((m) => m.id === id)?.name ?? id;

function renderMenu() {
  $("menuBoard").innerHTML =
    "<b>CARDÁPIO</b>" + state.menu.map((m) => `<div><span>${m.name}</span><span>${m.prices.P}·${m.prices.M}·${m.prices.G}</span></div>`).join("");
  $("items").innerHTML = state.menu
    .map((m) => `<button data-id="${m.id}" title="${m.description}"><span>${EMOJI_ITEM[m.id] ?? "☕"}</span>${m.name}</button>`)
    .join("");
  $("mods").innerHTML = state.modifiers.map((x) => `<button data-mod="${x}">${x}</button>`).join("");
}

$("items").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-id]");
  if (!b) return;
  state.tray.push({ itemId: b.dataset.id, size: state.size, modifiers: [...state.mods] });
  state.mods.clear();
  document.querySelectorAll("#mods button").forEach((x) => x.classList.remove("on"));
  renderTray();
});
$("sizes").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-size]");
  if (!b) return;
  state.size = b.dataset.size;
  document.querySelectorAll("#sizes button").forEach((x) => x.classList.toggle("on", x === b));
});
$("mods").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-mod]");
  if (!b) return;
  const m = b.dataset.mod;
  state.mods.has(m) ? state.mods.delete(m) : state.mods.add(m);
  b.classList.toggle("on");
});

function renderTray() {
  $("tray").innerHTML = state.tray.length
    ? state.tray
        .map(
          (i, n) =>
            `<li><span>${EMOJI_ITEM[i.itemId] ?? "☕"} ${itemName(i.itemId)} ${i.size}${i.modifiers.length ? ` <small>(${i.modifiers.join(", ")})</small>` : ""}</span><button data-rm="${n}" title="remover">✕</button></li>`,
        )
        .join("")
    : `<li class="empty">vazia — escolha tamanho/adicionais e clique num item</li>`;
  $("deliver").disabled = state.busy || !state.tray.length;
}
function clearTray() {
  state.tray = [];
  renderTray();
}
$("tray").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-rm]");
  if (!b) return;
  state.tray.splice(Number(b.dataset.rm), 1);
  renderTray();
});
$("clearTray").addEventListener("click", clearTray);

$("deliver").addEventListener("click", () => {
  if (!state.tray.length || state.busy) return;
  state.lastServed = [...state.tray];
  log("me", `(entrega) ${state.tray.map((i) => `${itemName(i.itemId)} ${i.size}`).join(" + ")}`);
  send({ type: "serve", items: state.tray, text: "" });
  clearTray();
});
$("bye").addEventListener("click", () => {
  if (state.busy || !state.current) return;
  log("me", "Até logo!");
  send({ type: "bye" });
});

// ---------- conversa (mãos-livres) ----------
function sendLine(text) {
  text = text.trim();
  if (!text || state.busy || !state.current || state.leaving) return;
  stopSpeaking();
  conv?.pause(); // até o cliente responder
  log("me", text);
  send({ type: "say", text });
}

/** Reabre o microfone quando é a vez do barista: cliente parou de pensar e de falar. */
function resumeIfIdle() {
  if (!state.busy && !state.talking && !state.leaving && state.current) conv?.resume();
}

const MIC_TEXT = {
  off: "microfone desligado — clique no 🎤",
  listening: "pode falar…",
  paused: "aguarde…",
};

const conv = createConversation({
  onState: (s) => {
    $("mic").className = `mic ${s}`;
    $("micStatus").textContent = MIC_TEXT[s];
  },
  // Mostra o que está ouvindo só enquanto você fala (confirma que entendeu), depois some.
  onInterim: (t) => {
    $("mic").classList.toggle("hearing", Boolean(t));
    $("micStatus").textContent = t ? `“${t}”` : MIC_TEXT[conv?.state ?? "off"];
  },
  onFinal: (t) => sendLine(t),
  onError: (err) => toast(err === "not-allowed" ? "Microfone bloqueado. Libere nas permissões do site (cadeado na barra)." : `Voz: ${err}`, "bad"),
});

if (!sttSupported) {
  $("mic").disabled = true;
  $("micStatus").textContent = "voz indisponível — use Chrome/Edge ou ⌨";
}

$("mic").addEventListener("click", () => {
  if (!conv) return;
  conv.toggle();
  if (conv.state !== "off" && (state.busy || state.talking || !state.current)) conv.pause();
});

// Teclado: reserva, escondido atrás do ⌨
$("kbd").addEventListener("click", () => {
  const f = $("textForm");
  f.classList.toggle("hidden");
  $("kbd").classList.toggle("on", !f.classList.contains("hidden"));
  if (!f.classList.contains("hidden")) $("textInput").focus();
});
$("textForm").addEventListener("submit", (e) => {
  e.preventDefault();
  sendLine($("textInput").value);
  $("textInput").value = "";
});

// ---------- legendas ----------
function renderCC() {
  $("cc").classList.toggle("on", state.cc);
  $("cc").title = state.cc ? "Legendas ligadas" : "Legendas desligadas";
}
$("cc").addEventListener("click", () => {
  state.cc = !state.cc;
  try { localStorage.setItem("cafe.cc", state.cc ? "1" : "0"); } catch { /* ok */ }
  renderCC();
});
renderCC();

// ---------- som ----------
function renderMute() {
  $("mute").textContent = state.muted ? "🔇" : "🔊";
  $("mute").title = state.muted ? "Voz desligada" : "Voz ligada";
}
$("mute").addEventListener("click", () => {
  state.muted = !state.muted;
  if (state.muted) stopSpeaking();
  try { localStorage.setItem("cafe.muted", state.muted ? "1" : "0"); } catch { /* ok */ }
  renderMute();
});
renderMute();

// ---------- overlay ----------
function renderPick() {
  const opts = [{ id: null, name: "🎲 Aleatório" }, ...state.customers];
  $("pick").innerHTML = opts
    .map((c) => `<button data-pick="${c.id ?? ""}" class="${(c.id ?? null) === state.pick ? "on" : ""}" title="${c.archetype ?? ""}">${c.name}</button>`)
    .join("");
}
$("pick").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-pick]");
  if (!b) return;
  state.pick = b.dataset.pick || null;
  renderPick();
  send({ type: "warm", customerId: state.pick ?? undefined }); // sobe o processo do cliente já
});

$("start").addEventListener("click", () => {
  $("overlay").classList.add("hidden");
  // Microfone liga junto (clique = gesto do usuário, o navegador permite). Fica pausado até o cliente falar.
  // Pede permissão agora (clique = gesto do usuário) e já solta o microfone.
  navigator.mediaDevices?.getUserMedia({ audio: true }).then((st) => st.getTracks().forEach((t) => t.stop())).catch(() => {});
  conv?.pause();
  if (conv && conv.state === "off") conv.enable();
  if (ttsSupported && !state.muted && !hasNaturalVoice() && !state.tipShown) {
    state.tipShown = true;
    setTimeout(() => toast("Dica: no Microsoft Edge as vozes soam bem mais naturais (grátis)."), 1500);
  }
  setBusy(true);
  send({ type: "next", customerId: state.pick ?? undefined });
});

function betweenCustomers(score) {
  const name = state.current?.name ?? "O cliente";
  $("modalEmoji").textContent = "👋";
  $("modalTitle").textContent = `${name} foi embora`;
  $("modalText").textContent = `Placar: ${score?.points ?? state.score} pts · ${score?.served ?? 0} cafés servidos. Chamar o próximo?`;
  $("start").textContent = "Próximo cliente";
  state.pick = null;
  renderPick();
  $("overlay").classList.remove("hidden");
}

renderTray();
setBusy(true);
connect();
