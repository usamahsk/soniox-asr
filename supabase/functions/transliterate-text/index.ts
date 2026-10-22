// Edge Function: transliterate-text — phonetic script transliteration for large text blocks
// POST { text, sourceScript?, targetScripts?, recordId? }
// Auth: user JWT (Authorization: Bearer) OR shared secret header (x-function-secret, for automation)
// Saves results to `transcripts` table keyed by recordId. One failing script never crashes the run.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALIAS = "https://esm.sh/aksharamukha"; // npm build is Pyodide-based; loaded lazily, REST fallback below
const REST_BASE = Deno.env.get("TRANSLITERATION_API_BASE") || "https://aksharamukha.appspot.com/api/convert";
const SOURCE_DEFAULT = "Urdu";
const TARGETS_DEFAULT = ["Gujarati", "Devanagari"];
const MAX_CHARS = 200_000; // ~2-3k words is 15-30k chars; generous safety cap

// SCRIPT REGISTRY — to add a new target script later, add ONE entry here (key = Aksharamukha script name).
// preOptions/postOptions are optional Aksharamukha preprocess/postprocess flags (REST path applies them;
// the bundled library path uses defaults unless a local engine is wired for options).
const SCRIPTS: Record<string, { label: string; preOptions?: string[]; postOptions?: string[] }> = {
  Devanagari: { label: "Devanagari (Hindi/Sanskrit/Marathi)" },
  Gujarati: { label: "Gujarati" },
  Urdu: { label: "Urdu (Arabic-Persian script)" },
  Tamil: { label: "Tamil" },
  Telugu: { label: "Telugu" },
  Kannada: { label: "Kannada" },
  Malayalam: { label: "Malayalam" },
  Bengali: { label: "Bengali" },
  Odia: { label: "Odia" },
  Gurmukhi: { label: "Gurmukhi (Punjabi)" },
  Grantha: { label: "Grantha" },
  IAST: { label: "IAST romanization", postOptions: ["capitalizeSentence"] },
  English: { label: "English (Roman phonetic)" },
  Latin: { label: "Latin (iTrans-style)" },
};

type Row = { record_id: string; script: string; text: string; source_script: string };

// ---- Urdu/Arabic-script -> ISO pre-bridge ----
// Aksharamukha's Urdu source module leaves Urdu-specific codepoints (ک ے ٹ ڑ ں گ ڈ چ ژ) unmapped,
// producing mixed-script garbage. We deterministically map to ISO ourselves (verified via /api/public:
// source name is "ISO", and the converter silently absorbs a trailing "a", which lets one schwa rule
// fix both unwritten vowels and word-final halants).
const WORD_OVERRIDES = new Map([["یہ", "yē"], ["وہ", "ō"], ["میں", "mēṁ"], ["کیا", "kyā"], ["کیوں", "kyōṁ"], ["اور", "aur"], ["بھی", "b\u0001h\u0001ī"], ["کوئی", "kōī"], ["کیونکہ", "kyōṅkē"], ["کے", "kē"], ["کا", "kā"], ["کی", "kī"], ["کو", "kō"], ["ہے", "hē"], ["ہوں", "hōṁ"], ["ہیں", "haiṁ"]]);
const UAC: Record<string, string> = {
  "ا": "ā", "آ": "ā", "ب": "b", "پ": "p", "ت": "t", "ٹ": "\u1E6D", "ث": "s", "ج": "j", "چ": "c",
  "ح": "h", "خ": "kh", "د": "d", "ڈ": "\u1E0D", "ذ": "z", "ر": "r", "ڑ": "\u1E5B", "ز": "z",
  "ژ": "\u1E93", "س": "s", "ش": "\u015B", "ص": "\u1E63", "ض": "\u1E0D", "ط": "t", "ظ": "z",
  "ع": "", "غ": "gh", "ف": "f", "ق": "q", "ک": "k", "ك": "k", "گ": "g", "ل": "l", "م": "m",
  "ن": "n", "ں": "\u1E41", "ؤ": "", "ہ": "h", "ه": "h", "ة": "h", "ھ": "h", "ۃ": "h",
  "ی": "ī", "ي": "ī", "ے": "\u0113", "ئ": "", "ى": "y", "۔": ".", "،": ",", "؟": "?", "؛": ";",
};
const DROP = new Set("\u0621\u0623\u0625\u0626\u0624\u0654\u0655\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0640\u200C\u200D");
const ARA_LETTER = /[\u0600-\u06FF\u0750-\u077F]/;
const ISO_VOWEL = /[aeiou\u0101\u0113\u012B\u014D\u016B]/;
const ISO_CONS = /[bcdfghjklmnpqrstvwyqz\u1E0D\u1E6D\u1E5B\u1E63\u1E93]/;

function uWordToIso(w: string): string {
  if (WORD_OVERRIDES.has(w)) return WORD_OVERRIDES.get(w)!;
  let out = "", prevLetter = false;
  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    if (DROP.has(ch)) continue;
    if (ch === "ا") { out += prevLetter ? "ā" : "a"; prevLetter = true; continue; }
    if ((ch === "ی" || ch === "ي") && i === 0) { out += "y"; prevLetter = true; continue; }
    if (ch === "و") { out += prevLetter ? "ō" : (out === "" ? "v" : "o"); prevLetter = true; continue; }
    if (ch === "ھ") {
      // aspirate marker (U+06BE) merges with the preceding consonant; ح/ہ stay separate
      out += out !== "" && ISO_CONS.test(out[out.length - 1]) ? "\u0001h\u0001" : "h";
      prevLetter = true;
      continue;
    }
    const m = UAC[ch] ?? ch;
    out += m;
    prevLetter = m !== "" && ISO_LETTERISH.test(m);
  }
  return out;
}
const ISO_LETTERISH = /[a-z\u0101\u0113\u012B\u014D\u016B\u1E0D\u1E6D\u1E5B\u1E63\u1E93]/;
// ISO -> plain Latin, English-phonetic reading (no diacritics: baṛā -> bara / kaheen)
function anglicize(iso: string): string {
  return iso
    .replace(/ṣ/g, "sh").replace(/ś/g, "sh").replace(/ḥ/g, "h")
    .replace(/ṭ/g, "t").replace(/ḍ/g, "d").replace(/ṛ/g, "r").replace(/[ṅṁ]/g, "n")
    .replace(/ā/g, "aa").replace(/ī/g, "ee").replace(/ū/g, "oo")
    .replace(/ē/g, "e").replace(/ō/g, "o")
    .normalize("NFD").replace(/[\u0300-\u036F]/g, "");
}

function uToIso(text: string): string {
  return text.split(/(\s+)/).map((t) => /\s/.test(t) ? t : addSchwa(uWordToIso(t))).join("").replaceAll("\u0001", "");
}
// insert an unwritten schwa after consonants that sit in a dead cluster or word-end
// (converter absorbs a trailing "a" silently, so "saba" renders as સબ, not સબઅ)
function addSchwa(w: string): string {
  let out = "";
  let i = 0;
  while (i < w.length) {
    const c = w[i];
    out += c;
    if (ISO_CONS.test(c)) {
      if (w.startsWith("\u0001h\u0001", i + 1)) { out += "\u0001h\u0001"; i += 4; } else { i += 1; }
      const next = w[i];
      if (next === undefined || !(ISO_VOWEL.test(next) || next === "\u1E41")) out += "a";
    } else i += 1;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json().catch(() => ({}));
    const text: string = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return err(400, "missing or empty `text`");
    if (text.length > MAX_CHARS) return err(400, `text too large: ${text.length} chars (max ${MAX_CHARS})`);

    const recordId: string | null = toId(body.recordId ?? body.record_id ?? body.jobId ?? body.job_id);
    if ((body.recordId ?? body.jobId ?? body.job_id) && !recordId) return err(400, "invalid recordId/jobId");

    const auth = await authorize(req, admin, recordId);
    if (!auth.ok) return err(auth.code, auth.error);

    const source = resolveScript(body.sourceScript ?? body.source_script ?? SOURCE_DEFAULT);
    if (!source) return err(400, `unsupported sourceScript "${body.sourceScript ?? body.source_script}". Supported: ${Object.keys(SCRIPTS).join(", ")}`);

    const targetsRaw = Array.isArray(body.targetScripts) ? body.targetScripts
      : Array.isArray(body.target_scripts) ? body.target_scripts
      : TARGETS_DEFAULT;
    if (!Array.isArray(targetsRaw) || targetsRaw.length === 0) return err(400, "targetScripts must be a non-empty array");
    if (targetsRaw.length > 10) return err(400, "max 10 target scripts per request");

    let engine: Engine;
    try {
      engine = await getEngine();
    } catch (e) {
      return err(503, "transliteration engine unavailable: " + String(e));
    }

    const results: { script: string; label: string; text: string }[] = [];
    const failed: { script: string; label: string; error: string }[] = [];

    await Promise.allSettled(targetsRaw.map(async (raw) => {
      const target = resolveScript(String(raw));
      if (target === source) {
        results.push({ script: target, label: SCRIPTS[target]?.label ?? target, text });
        return;
      }
      if (!target) {
        failed.push({ script: String(raw), label: String(raw), error: "unsupported script" });
        return;
      }
      try {
        // English: fully local (our own ISO mapping -> anglicized), no engine roundtrip
        if (source === "Urdu" && target === "English") {
          const out = anglicize(uToIso(text));
          if (!out) throw new Error("empty output");
          results.push({ script: target, label: SCRIPTS[target]?.label ?? target, text: out });
          return;
        }
        // Urdu source: bridge via our own ISO mapping (Urdu-specific codepoints are unreliable in engine modules)
        const viaIso = source === "Urdu";
        const src = viaIso ? "ISO" : source;
        const textIn = viaIso ? uToIso(text) : text;
        const out = await engine.process({
          source: src,
          target: target,
          text: textIn,
          preOptions: SCRIPTS[target]?.preOptions ?? [],
          postOptions: SCRIPTS[target]?.postOptions ?? [],
        });
        if (!out || out.replace(/\s/g, "").length === 0) throw new Error("empty output");
        results.push({ script: target, label: SCRIPTS[target]?.label ?? target, text: out });
      } catch (e) {
        failed.push({ script: target, label: SCRIPTS[target]?.label ?? target, error: String(e).slice(0, 300) });
      }
    }));

    let persisted = false;
    if (recordId && results.length > 0) {
      try {
        const rows: Row[] = results.map((r) => ({ record_id: recordId, script: r.script, text: r.text, source_script: source }));
        const { error } = await admin.from("transcripts").upsert(rows, { onConflict: "record_id,script" });
        if (error) throw error;
        persisted = true;
      } catch (e) {
        failed.push({ script: "*", label: "database save", error: String(e).slice(0, 300) });
      }
    }

    if (results.length === 0) return err(422, "all targets failed: " + (failed.at(-1)?.error ?? "unknown"));
    return new Response(JSON.stringify({ recordId, source, results, failed: failed.length ? failed : undefined, persisted }), { headers: json() });
  } catch (e) {
    return err(400, String(e));
  }
});

// ---- auth: user JWT for the app, shared-secret header for automation (either is enough) ----
async function authorize(req: Request, admin: SupabaseClient, recordId: string | null): Promise<{ ok: true; user: string | null } | { ok: false; code: number; error: string }> {
  const sharedSecret = Deno.env.get("TRANSLITERATE_SECRET");
  const provided = req.headers.get("x-function-secret");
  if (sharedSecret && provided === sharedSecret) return { ok: true, user: null };

  const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  if (!jwt) return sharedSecret ? { ok: true, user: null } : { ok: false, code: 401, error: "Authorization Bearer JWT or x-function-secret required" };
  try {
    const { data: { user }, error } = await admin.auth.getUser(jwt);
    if (error || !user) return { ok: false, code: 401, error: "invalid session, login again" };
    if (recordId) {
      const { data: job } = await admin.from("jobs").select("user_id").eq("id", recordId).maybeSingle();
      if (job && job.user_id !== user.id) return { ok: false, code: 403, error: "not your record" };
    }
    return { ok: true, user: user.id };
  } catch {
    return { ok: false, code: 401, error: "invalid session" };
  }
}

// ---- engine resolution: bundled lib first (lazy, cached), official REST API fallback ----
type Engine = { process: (input: { source: string; target: string; text: string; preOptions: string[]; postOptions: string[] }) => Promise<string> };

let libEngine: Engine | null = null;
let restEngine: Engine | null = null;

async function getEngine(): Promise<Engine> {
  if (libEngine) return libEngine;
  try {
    const mod: any = await import(ALIAS);
    const lib = mod.default ?? mod.Aksharamukha ?? mod;
    if (typeof lib?.new !== "function") throw new Error("unexpected aksharamukha export shape");
    const inst = await lib.new();
    libEngine = { process: ({ source, target, text }) => inst.process(source, target, text) };
    return libEngine;
  } catch (e) {
    console.warn("aksharamukha bundled lib unavailable, falling back to REST:", e);
  }
  if (restEngine) return restEngine;
  restEngine = { process: async ({ source, target, text, preOptions, postOptions }) => {
    const r = await fetch(REST_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, target, text, nativize: true, preOptions, postOptions }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) throw new Error(`aksharamukha API ${r.status}: ${(await r.text()).slice(0, 200)}`);
    let raw = await r.text();
    try {
      const p = JSON.parse(raw);
      if (typeof p === "string") raw = p;
    } catch { /* plain string response */ }
    return raw;
  } };
  return restEngine;
}

// ---- helpers ----
function resolveScript(name: string): string | null {
  const n = String(name).trim();
  for (const key of Object.keys(SCRIPTS)) if (key.toLowerCase() === n.toLowerCase()) return key;
  return null;
}
function toId(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim();
  return (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || /^\d+$/.test(s)) ? s : null;
}
function cors() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-function-secret", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400" }; }
function json() { return { ...cors(), "Content-Type": "application/json" }; }
function err(code: number, m: string) { return new Response(JSON.stringify({ error: m }), { status: code, headers: json() }); }
