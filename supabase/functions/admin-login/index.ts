import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// admin-login
// ---------------------------------------------------------------------------
// Verifies the school admin's password on the server and issues that device an
// admin token, which is what get-attendance requires to read submissions.
//
// Why this exists: VITE_ADMIN_PASSWORD is inlined into the public bundle by
// Vite, so it was never really secret. Checking here means the real password
// never reaches a browser.
//
// No bootstrap: if no password is stored the endpoint refuses (security review
// S4). Set or rotate it with SQL: select public.set_admin_password(...).
// Failed attempts are throttled per IP and globally (login_failures).

const SCHOOL_ID = "zbt-primary";
const WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES_PER_IP = 10;
const MAX_FAILURES_GLOBAL = 50;
const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const password = String(body?.password ?? "");
    const username = String(body?.username ?? "admin").trim().toLowerCase();
    const deviceLabel = typeof body?.deviceLabel === "string" ? body.deviceLabel.slice(0, 120) : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    const buckets = [`admin:ip:${ip}`, "admin:global"];
    const [perIp, global] = await Promise.all([
      supabase.rpc("login_is_throttled", { p_bucket: buckets[0], p_max: MAX_FAILURES_PER_IP, p_window_seconds: WINDOW_SECONDS }),
      supabase.rpc("login_is_throttled", { p_bucket: buckets[1], p_max: MAX_FAILURES_GLOBAL, p_window_seconds: WINDOW_SECONDS }),
    ]);
    if (perIp.error || global.error) return json({ error: "throttle_check_failed" }, 500);
    if (perIp.data === true || global.data === true) {
      return json({ ok: false, reason: "too_many_attempts", message: "محاولات كثيرة غير صحيحة. حاول بعد ١٥ دقيقة." }, 429);
    }
    const fail = async () => {
      await supabase.rpc("record_login_failure", { p_buckets: buckets });
      return json({ ok: false, reason: "invalid_credentials" }, 401);
    };

    const { data: adminUser, error: userError } = await supabase
      .from("teachers")
      .select("id, display_name, subject, avatar, role, username")
      .eq("school_id", SCHOOL_ID)
      .eq("role", "admin")
      .eq("username", username)
      .maybeSingle();
    if (password.length < 8 || password.length > 200) return await fail();
    if (userError) return json({ error: "user_lookup_failed" }, 500);
    if (!adminUser) return await fail();

    const { data: ok, error: verifyError } = await supabase.rpc("verify_admin_password", {
      p_school_id: SCHOOL_ID,
      p_password: password,
    });
    if (verifyError) return json({ error: "verify_failed" }, 500);
    if (ok !== true) return await fail();

    const token = newToken();
    const { error: tokenError } = await supabase.from("device_tokens").insert({
      token_hash: await sha256Hex(token),
      school_id: SCHOOL_ID,
      teacher_id: adminUser.id,
      role: "admin",
      label: deviceLabel,
      last_seen_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString(),
    });
    if (tokenError) return json({ error: "token_issue_failed" }, 500);

    return json({ ok: true, bootstrapped: false, admin: adminUser, deviceToken: token });
  } catch (err) {
    console.error("[admin-login]", err instanceof Error ? err.message : err);
    return json({ error: "internal_error" }, 500);
  }
});
