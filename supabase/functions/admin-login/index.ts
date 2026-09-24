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
// Bootstrap: while no password is set for the school, the FIRST call sets it.
// After that the endpoint only verifies. The owner is told to do this straight
// after deploying, because until they do, whoever calls first sets it.

const SCHOOL_ID = "zbt-primary";

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

    if (password.length < 8) {
      return json({ error: "weak_password", message: "كلمة المرور يجب ألا تقل عن ٨ خانات." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: adminUser, error: userError } = await supabase
      .from("teachers")
      .select("id, display_name, subject, avatar, role, username")
      .eq("school_id", SCHOOL_ID)
      .eq("role", "admin")
      .eq("username", username)
      .maybeSingle();
    if (userError) return json({ error: userError.message }, 500);
    if (!adminUser) return json({ ok: false, reason: "invalid_credentials" }, 401);

    const { data: cred, error: credError } = await supabase
      .from("admin_credentials").select("school_id").eq("school_id", SCHOOL_ID).maybeSingle();
    if (credError) return json({ error: credError.message }, 500);

    let bootstrapped = false;

    if (!cred) {
      // First ever call: this password becomes the school's admin password.
      const { error: setError } = await supabase.rpc("set_admin_password", {
        p_school_id: SCHOOL_ID,
        p_password: password,
      });
      if (setError) return json({ error: setError.message }, 500);
      bootstrapped = true;
    } else {
      const { data: ok, error: verifyError } = await supabase.rpc("verify_admin_password", {
        p_school_id: SCHOOL_ID,
        p_password: password,
      });
      if (verifyError) return json({ error: verifyError.message }, 500);
      if (ok !== true) return json({ ok: false, reason: "invalid_credentials" }, 401);
    }

    const token = newToken();
    const { error: tokenError } = await supabase.from("device_tokens").insert({
      token_hash: await sha256Hex(token),
      school_id: SCHOOL_ID,
      teacher_id: adminUser.id,
      role: "admin",
      label: deviceLabel,
      last_seen_at: new Date().toISOString(),
    });
    if (tokenError) return json({ error: tokenError.message }, 500);

    return json({ ok: true, bootstrapped, admin: adminUser, deviceToken: token });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
