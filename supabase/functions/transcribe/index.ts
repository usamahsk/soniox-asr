// Edge Function: transcribe — auth required, owner-only, zero extra steps
// Upload original file as-is. We give Soniox a 3h signed URL, no edge download.
// POST { job_id } with Authorization: Bearer <supabase user JWT>
// Env: SONIOX_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "npm:@supabase/supabase-js@2";

const SONIOX_BASE = "https://api.soniox.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return err("login required");
    const { job_id, lang } = await req.json();
    if (!job_id) return err("missing job_id");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: uErr } = await admin.auth.getUser(jwt);
    if (uErr || !user) return err("invalid session, login again");

    const { data: job } = await admin.from("jobs").select("*").eq("id", job_id).single();
    if (!job || job.user_id !== user.id) return err("job not found");

    // signed URL valid 3h — Soniox fetches directly, works for 3-4h originals
    const { data: signed, error: sErr } = await admin.storage.from("lectures").createSignedUrl(job.audio_path, 60 * 60 * 3);
    if (sErr || !signed?.signedUrl) return err("signed url failed: " + (sErr?.message || ""));
    const headers = { Authorization: `Bearer ${Deno.env.get("SONIOX_API_KEY")}` };

    // language selector: map frontend choice to Soniox hints
    const LANG_MAP: Record<string, string[]> = {
      "ur": ["ur"],
      "ar": ["ar"],
      "ur-ar": ["ur", "ar"],
      "hi": ["hi"],
      "gu": ["gu"],
      "multi": ["ur", "ar", "hi", "gu"],
    };
    const hints = LANG_MAP[lang] || ["ur", "ar"];

    const create = await fetch(`${SONIOX_BASE}/v1/transcriptions`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "stt-async-v5",
        audio_url: signed.signedUrl,
        language_hints: hints,
        enable_language_identification: true,
        enable_speaker_diarization: true,
        context: {
          general: [
            { key: "domain", value: "Islamic lecture" },
            { key: "topic", value: "Deeni bayan Quran Hadith" },
          ],
          text: "اردو میں دینی بیان قرآن مجید اور حدیث شریف کی تشریح نماز روزہ زکوٰۃ حج اللہ رسول صلی اللہ علیہ وسلم",
          terms: ["قرآن", "حدیث", "نماز", "اللہ", "رسول", "صلی اللہ علیہ وسلم"],
        },
        client_reference_id: job_id,
      }),
    });
    if (!create.ok) {
      const m = await create.text();
      await admin.from("jobs").update({ status: "error", error: m.slice(0, 500) }).eq("id", job_id);
      return err("soniox create failed: " + m.slice(0, 300));
    }
    const { id: soniox_id } = await create.json();
    await admin.from("jobs").update({ soniox_id, status: "processing" }).eq("id", job_id);
    return new Response(JSON.stringify({ soniox_id }), { headers: json() });
  } catch (e) {
    return err(String(e));
  }
});

function cors() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }; }
function json() { return { ...cors(), "Content-Type": "application/json" }; }
function err(m: string) { return new Response(JSON.stringify({ error: m }), { status: 400, headers: json() }); }
