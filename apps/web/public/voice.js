// Voz 100% nativa do navegador (grátis): STT = Web Speech API, TTS = speechSynthesis.

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const sttSupported = Boolean(Recognition);
export const ttsSupported = "speechSynthesis" in window;

/**
 * Conversa mãos-livres: microfone fica aberto; uma pausa na fala (~1s) envia a frase.
 * pause()/resume() fecham o microfone enquanto o cliente pensa/fala (evita captar o TTS).
 *   onInterim(texto parcial) · onFinal(frase) · onState("off" | "listening" | "paused") · onError(código)
 */
export function createConversation({ onInterim, onFinal, onState, onError, silenceMs = 1000 }) {
  if (!Recognition) return null;
  let rec = null;
  let enabled = false; // usuário ligou o microfone
  let paused = false; // jogo pediu silêncio (cliente pensando/falando)
  let buffer = "";
  let timer = null;

  const state = () => (!enabled ? "off" : paused ? "paused" : "listening");
  const emitState = () => onState?.(state());

  function flush() {
    clearTimeout(timer);
    const text = buffer.trim();
    buffer = "";
    onInterim?.("");
    if (text) onFinal?.(text);
  }

  function build() {
    const r = new Recognition();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) buffer += " " + res[0].transcript;
        else interim += res[0].transcript;
      }
      onInterim?.((buffer + " " + interim).trim());
      // Silêncio depois de um trecho final → manda a frase.
      clearTimeout(timer);
      if (!interim.trim() && buffer.trim()) timer = setTimeout(flush, silenceMs);
    };
    r.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        enabled = false;
        emitState();
      }
      if (!["no-speech", "aborted", "network"].includes(ev.error)) onError?.(ev.error);
    };
    // O Chrome encerra a escuta sozinho de tempos em tempos: reinicia se ainda devia ouvir.
    r.onend = () => {
      rec = null;
      if (buffer.trim()) flush();
      if (enabled && !paused) setTimeout(start, 150);
    };
    return r;
  }

  function start() {
    if (!enabled || paused || rec) return;
    rec = build();
    try {
      rec.start();
    } catch {
      rec = null;
    }
  }

  function stop() {
    clearTimeout(timer);
    buffer = "";
    onInterim?.("");
    if (rec) {
      const r = rec;
      rec = null;
      r.onend = null;
      r.abort();
    }
  }

  return {
    get state() {
      return state();
    },
    toggle() {
      enabled ? this.disable() : this.enable();
    },
    enable() {
      enabled = true;
      emitState();
      start();
    },
    disable() {
      enabled = false;
      stop();
      emitState();
    },
    pause() {
      if (paused) return;
      paused = true;
      stop();
      emitState();
    },
    resume() {
      if (!paused) return;
      paused = false;
      emitState();
      start();
    },
  };
}

// ---------- TTS ----------
// O que mais soa robótico: voz antiga + pitch distorcido. Então:
//  1) preferir vozes neurais grátis ("Natural"/"Online" no Edge; Google no Chrome)
//  2) variar pouco o pitch; diferenciar personagens pela voz e pelo ritmo.
const STYLE = {
  "dona-marta": { pitch: 1.05, rate: 0.95, prefer: "female" },
  "rafa-startup": { pitch: 1.0, rate: 1.15, prefer: "male" },
  "chef-lucien": { pitch: 0.95, rate: 0.92, prefer: "male" },
};
const FEMALE = /francisca|thalita|maria|luciana|vit[oó]ria|leila|yara|female|mulher/i;
const MALE = /ant[oô]nio|daniel|felipe|donato|fabio|humberto|julio|male|homem/i;
const NEURAL = /natural|online|neural/i;

let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("pt"));
}
if (ttsSupported) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

/** Há voz neural instalada? (Edge no Windows tem de graça.) */
export function hasNaturalVoice() {
  return voices.some((v) => NEURAL.test(v.name));
}

function pickVoice(prefer) {
  const re = prefer === "male" ? MALE : FEMALE;
  const score = (v) =>
    (NEURAL.test(v.name) ? 10 : 0) + (/google/i.test(v.name) ? 5 : 0) + (/br/i.test(v.lang) ? 3 : 0) + (re.test(v.name) ? 2 : 0);
  return [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Limpa o texto para soar falado: sem emoji, travessão vira pausa. */
function forSpeech(text) {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\.{3}|…/g, "... ")
    .trim();
}

/** Fala o texto. Resolve quando termina. onStart/onEnd animam a boca. */
export function speak(text, customerId, { onStart, onEnd } = {}) {
  return new Promise((resolve) => {
    if (!ttsSupported || !text) return resolve();
    speechSynthesis.cancel();
    const st = STYLE[customerId] ?? { pitch: 1, rate: 1.0, prefer: "female" };
    const u = new SpeechSynthesisUtterance(forSpeech(text));
    u.lang = "pt-BR";
    const v = pickVoice(st.prefer);
    if (v) u.voice = v;
    u.pitch = st.pitch;
    u.rate = st.rate;
    const done = () => {
      onEnd?.();
      resolve();
    };
    u.onstart = () => onStart?.();
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (ttsSupported) speechSynthesis.cancel();
}
