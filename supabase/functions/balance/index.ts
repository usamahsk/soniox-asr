// Edge Function: balance — auth required, returns Soniox org balance (no key leak)
// POST {} with Authorization: Bearer <supabase user JWT>
// Env: SONIOX_ORG_API_KEY (snx_org_*, needs balance permission), fallback SONIOX_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "npm:@supabase/supabase-js@2";

const SONIOX_BASE = "https://api.soniox.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return err("login required");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: uErr } = await admin.auth.getUser(jwt);
    if (uErr || !user) return err("invalid session, login again");

    const key = Deno.env.get("SONIOX_ORG_API_KEY") || Deno.env.get("SONIOX_API_KEY");
    if (!key) return err("SONIOX_ORG_API_KEY not configured (create one at console.soniox.com > org Settings > Organization API keys, then: supabase secrets set SONIOX_ORG_API_KEY=snx_org_...)");

    const r = await fetch(`${SONIOX_BASE}/v1/organization/balance`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) {
      const m = await r.text();
      // Project keys always 403 here — needs an org key (snx_org_*). Surface actionable hint.
      if (r.status === 403) {
        return err("balance needs an Organization API key (snx_org_*) with balance permission. Project keys always 403. Create at console.soniox.com > org Settings > Organization API keys, then: supabase secrets set SONIOX_ORG_API_KEY=snx_org_... | soniox: " + m.slice(0, 200));
      }
      return err("soniox balance failed: " + m.slice(0, 300));
    }
    const b = await r.json();
    return new Response(JSON.stringify({
      available_balance_usd: b.available_balance_usd ?? null,
      free_balance_usd: b.free_balance_usd ?? null,
      used_balance_usd: b.used_balance_usd ?? null,
      invoice_billing_enabled: b.invoice_billing_enabled ?? false,
      balance_exhausted: b.balance_exhausted ?? false,
      autopay_enabled: b.autopay_enabled ?? false,
      autopay_threshold_usd: b.autopay_threshold_usd ?? null,
      autopay_amount_usd: b.autopay_amount_usd ?? null,
      has_payment_method: b.has_payment_method ?? false,
      has_payment_error: b.has_payment_error ?? false,
    }), { headers: json() });
  } catch (e) {
    return err(String(e));
  }
});

function cors() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }; }
function json() { return { ...cors(), "Content-Type": "application/json" }; }
function err(m: string) { return new Response(JSON.stringify({ error: m }), { status: 400, headers: json() }); }
