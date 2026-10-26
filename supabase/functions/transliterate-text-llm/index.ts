// Edge Function: transliterate-text-llm — LLM-based phonetic transliteration
// POST { text, sourceScript?, targetScripts?, recordId? }
// Auth: user JWT (Authorization: Bearer) OR shared secret header (x-function-secret)
// Saves results to `transcripts` table keyed by recordId. One failing script never crashes the run.
import { createClient } from "npm:@supabase/supabase-js@2";

const API_BASE = Deno.env.get("LLM_API_BASE") || "https://api.openai.com/v1";
const API_KEY = Deno.env.get("LLM_API_KEY") || "";
const MODEL = Deno.env.get("LLM_MODEL") || "gpt-4o-mini";
const MAX_CHARS = 200_000;
const SOURCE_DEFAULT = "Urdu";

// Target script -> human label (for LLM prompting and response metadata)
const SCRIPT_LABELS: Record<string, string> = {
  Devanagari: "Devanagari (Hindi)",
  Gujarati: "Gujarati",
  Urdu: "Urdu (Arabic-Persian script)",
  English: "English (Roman phonetic)",
  IAST: "IAST romanization",
  Latin: "Latin (iTrans-style)",
  Tamil: "Tamil",
  Telugu: "Telugu",
  Kannada: "Kannada",
  Malayalam: "Malayalam",
  Bengali: "Bengali",
  Odia: "Odia",
  Gurmukhi: "Gurmukhi (Punjabi)",
  Grantha: "Grantha",
};

type Row = { record_id: string; script: string; text: string; source_script: string };

function resolveScript(name: string): string | null {
  const n = String(name).trim();
  for (const key of Object.keys(SCRIPT_LABELS)) if (key.toLowerCase() === n.toLowerCase()) return key;
  return null;
}

function toId(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim();
  return (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || /^\d+$/.test(s)) ? s : null;
}

// Build a transliteration prompt for the LLM
function buildPrompt(text: string, source: string, target: string): string {
  const targetLabel = SCRIPT_LABELS[target] ?? target;
  return `You are an expert transliterator. Transliterate the following ${source} text into ${targetLabel} script.

Rules:
- Transliterate phonetically — preserve pronunciation, do NOT translate
- Keep the same words, only change the script
- Preserve punctuation, numbers, and whitespace exactly
- Output ONLY the transliterated text, no explanations, no quotes, no markdown code blocks

Source language: ${source}
Target script: ${targetLabel}

Text:
${text}`;
}

function cors() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-function-secret", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400" }; }
function json() { return { ...cors(), "Content-Type": "application/json" }; }
function err(code: number, m: string) { return new Response(JSON.stringify({ error: m }), { status: code, headers: json() }); }

// Call the LLM chat completions API (OpenAI-compatible)
async function llmTransliterate(text: string, source: string, target: string): Promise<string> {
  if (!API_KEY) throw new Error("LLM_API_KEY not configured");
  const prompt = buildPrompt(text, source, target);
  const r = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: "You transliterate text between scripts. Output only the transliterated text." }, { role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`LLM API ${r.status}: ${body.slice(0, 300)}`);
  }
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("LLM returned empty content");
  return content.trim();
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

    // Auth
    const sharedSecret = Deno.env.get("TRANSLITERATE_SECRET");
    const provided = req.headers.get("x-function-secret");
    if (sharedSecret && provided === sharedSecret) {
      // automation path, proceed
    } else {
      const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      if (!jwt) return err(401, "Authorization Bearer JWT or x-function-secret required");
      try {
        const { data: { user }, error } = await admin.auth.getUser(jwt);
        if (error || !user) return err(401, "invalid session, login again");
        if (recordId) {
          const { data: job } = await admin.from("jobs").select("user_id").eq("id", recordId).maybeSingle();
          if (job && job.user_id !== user.id) return err(403, "not your record");
        }
      } catch {
        return err(401, "invalid session");
      }
    }

    const source = resolveScript(body.sourceScript ?? body.source_script ?? SOURCE_DEFAULT);
    if (!source) return err(400, `unsupported sourceScript "${body.sourceScript ?? body.source_script}". Supported: ${Object.keys(SCRIPT_LABELS).join(", ")}`);

    const targetsRaw = Array.isArray(body.targetScripts) ? body.targetScripts
      : Array.isArray(body.target_scripts) ? body.target_scripts
      : ["Devanagari", "Gujarati", "English"];
    if (!Array.isArray(targetsRaw) || targetsRaw.length === 0) return err(400, "targetScripts must be a non-empty array");
    if (targetsRaw.length > 10) return err(400, "max 10 target scripts per request");

    const results: { script: string; label: string; text: string }[] = [];
    const failed: { script: string; label: string; error: string }[] = [];

    await Promise.allSettled(targetsRaw.map(async (raw) => {
      const target = resolveScript(String(raw));
      if (target === source) {
        results.push({ script: target, label: SCRIPT_LABELS[target] ?? target, text });
        return;
      }
      if (!target) {
        failed.push({ script: String(raw), label: String(raw), error: "unsupported script" });
        return;
      }
      try {
        const out = await llmTransliterate(text, source, target);
        if (!out || out.replace(/\s/g, "").length === 0) throw new Error("empty output");
        results.push({ script: target, label: SCRIPT_LABELS[target] ?? target, text: out });
      } catch (e) {
        failed.push({ script: target, label: SCRIPT_LABELS[target] ?? target, error: String(e).slice(0, 300) });
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
    return new Response(JSON.stringify({ recordId, source, results, failed: failed.length ? failed : undefined, persisted, engine: "llm" }), { headers: json() });
  } catch (e) {
    return err(400, String(e));
  }
});
