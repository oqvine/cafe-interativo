// Voz 100% nativa do navegador (grátis): STT = Web Speech API, TTS = speechSynthesis.

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const sttSupported = Boolean(Recognition);
export const ttsSupported = "speechSynthesis" in window;

/**
 * Push-to-talk. start() ao apertar, stop() ao soltar.
 * onInterim(texto parcial), onFinal(texto final), onState(ligado?)
 */
export function createListener({ onInterim, onFinal, onState, onError }) {
  if (!Recognition) return null;
  const rec = new Recognition();
  rec.lang = "pt-BR";
  rec.interimResults = true;
  rec.continuous = true; // segura enquanto o botão estiver apertado
  let finalText = "";
  let active = false;

  rec.onresult = (ev) => {
    let interim = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    onInterim?.((finalText + " " + interim).trim());
  };
  rec.onerror = (ev) => {
    if (ev.error !== "no-speech" && ev.error !== "aborted") onError?.(ev.error);
  };
  rec.onend = () => {
    const text = finalText.trim();
    finalText = "";
    if (active) {
      active = false;
      onState?.(false);
    }
    if (text) onFinal?.(text);
  };

  return {
    start() {
      if (active) return;
      active = true;
      finalText = "";
      onState?.(true);
      try {
        rec.start();
      } catch {
        /* já rodando */
      }
    },
    stop() {
      if (!active) return;
      rec.stop(); // dispara onend → onFinal
    },
  };
}

// ---------- TTS ----------
// Timbre por personagem: pitch/rate. Voz escolhida entre as pt-BR instaladas.
const STYLE = {
  "dona-marta": { pitch: 1.35, rate: 0.95, prefer: "female" },
  "rafa-startup": { pitch: 1.0, rate: 1.25, prefer: "male" },
  "chef-lucien": { pitch: 0.7, rate: 0.9, prefer: "male" },
};
const FEMALE = /francisca|maria|luciana|vit[oó]ria|thalita|female|mulher|google portugu/i;
const MALE = /antonio|ant[oô]nio|daniel|felipe|male|homem/i;

let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("pt"));
}
if (ttsSupported) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function pickVoice(prefer) {
  const br = voices.filter((v) => /br/i.test(v.lang));
  const pool = br.length ? br : voices;
  const re = prefer === "male" ? MALE : FEMALE;
  return pool.find((v) => re.test(v.name)) ?? pool[0] ?? null;
}

/** Fala o texto. Resolve quando termina. onStart/onEnd animam a boca. */
export function speak(text, customerId, { onStart, onEnd } = {}) {
  return new Promise((resolve) => {
    if (!ttsSupported || !text) return resolve();
    speechSynthesis.cancel();
    const st = STYLE[customerId] ?? { pitch: 1, rate: 1.05, prefer: "female" };
    const u = new SpeechSynthesisUtterance(text);
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
