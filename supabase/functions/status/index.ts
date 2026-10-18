// Edge Function: status — auth required, owner-only poll
// POST { job_id } with Authorization: Bearer <supabase user JWT>
import { createClient } from "npm:@supabase/supabase-js@2";

const SONIOX_BASE = "https://api.soniox.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return err("login required");
    const { job_id } = await req.json();

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return err("invalid session");
    const { data: job } = await admin.from("jobs").select("*").eq("id", job_id).single();
    if (!job || job.user_id !== user.id) return err("job not found");
    if (job.status === "completed") return new Response(JSON.stringify({ status: "completed", text: job.transcript_text }), { headers: json() });
    if (!job.soniox_id) return new Response(JSON.stringify({ status: job.status }), { headers: json() });

    const headers = { Authorization: `Bearer ${Deno.env.get("SONIOX_API_KEY")}` };
    const r = await fetch(`${SONIOX_BASE}/v1/transcriptions/${job.soniox_id}`, { headers });
    const info = await r.json();

    if (info.status === "completed") {
      const t = await fetch(`${SONIOX_BASE}/v1/transcriptions/${job.soniox_id}/transcript`, { headers });
      const { tokens = [] } = await t.json();
      const text = renderTokens(tokens);
      await admin.from("jobs").update({ status: "completed", transcript_text: text, tokens }).eq("id", job_id);
      await fetch(`${SONIOX_BASE}/v1/transcriptions/${job.soniox_id}`, { method: "DELETE", headers }).catch(() => {});
      return new Response(JSON.stringify({ status: "completed", text }), { headers: json() });
    }
    if (info.status === "error") {
      await admin.from("jobs").update({ status: "error", error: info.error_message || "soniox error" }).eq("id", job_id);
      return new Response(JSON.stringify({ status: "error", error: info.error_message }), { headers: json() });
    }
    return new Response(JSON.stringify({ status: "processing" }), { headers: json() });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: json() });
  }
});

function renderTokens(tokens: any[]): string {
  let out: string[] = [], curSp: any = null, curLang: any = null;
  for (const t of tokens) {
    if (t.speaker !== undefined && t.speaker !== curSp) {
      if (curSp !== null) out.push("\n\n");
      curSp = t.speaker; curLang = null;
      out.push(`Speaker ${curSp}:`);
    }
    if (t.language !== undefined && t.language !== curLang) {
      curLang = t.language;
      out.push(`\n[${curLang}] `);
    }
    out.push(t.text || "");
  }
  return out.join("");
}
function cors() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }; }
function json() { return { ...cors(), "Content-Type": "application/json" }; }
function err(m: string) { return new Response(JSON.stringify({ error: m }), { status: 400, headers: json() }); }
