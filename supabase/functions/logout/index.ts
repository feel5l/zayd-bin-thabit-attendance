import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// logout — ends ONE device session on the server.
//
// The client calls this with the x-device-token it is about to forget. We stamp
// device_tokens.revoked_at, and every other function already rejects a token
// whose revoked_at is set (get-attendance, submit-attendance, admin-manage,
// get-student-contacts, publish-import-batch), so a copied/stolen token stops
// working the moment the user logs out. Deleting it from localStorage alone
// would not do that.
//
// Idempotent and deliberately uninformative: it answers 200 {ok:true} whether
// the token was live, already revoked, expired or unknown, so it cannot be used
// to probe which tokens exist. Only the hash of the token is ever looked at.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const token = (req.headers.get("x-device-token") || "").trim();
    if (token && token.length <= 512) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { error } = await supabase
        .from("device_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", await sha256Hex(token))
        .is("revoked_at", null);
      if (error) return json({ error: "logout_failed" }, 500);
    }
    return json({ ok: true });
  } catch {
    return json({ error: "logout_failed" }, 500);
  }
});
