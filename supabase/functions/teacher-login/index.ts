import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// teacher-login
// ---------------------------------------------------------------------------
// Identifies a teacher from the number they typed WITHOUT the app having to
// carry phone numbers or national IDs in its bundle, and issues that device a
// secret token so it can later submit attendance.
//
// Returns only a public profile — id, display name, subject, homeroom, avatar.
// A caller who does not already know a teacher's number learns nothing.
//
// This is not a password check. It reproduces the trust level the app already
// had (knowing the number identifies you) while removing the data leak and
// giving each device a revocable credential.

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

function normalisePhone(raw: string): string {
  let d = (raw || "").replace(/[^0-9]/g, "");
  if (d.startsWith("00966")) d = "0" + d.slice(5);
  else if (d.startsWith("966")) d = "0" + d.slice(3);
  if (d.length === 9 && d.startsWith("5")) d = "0" + d;
  return d;
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
    const { identifier, deviceLabel } = await req.json().catch(() => ({ identifier: "" }));
    const raw = String(identifier ?? "").trim();
    if (!raw) return json({ error: "missing_identifier" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const publicColumns =
      "id, display_name, subject, assigned_class_id, avatar, role, is_active, sequence_number, username";

    const phoneDigits = normalisePhone(raw);
    const rawDigits = raw.replace(/[^0-9]/g, "");
    const candidates: string[] = [];
    if (phoneDigits) candidates.push(await sha256Hex(phoneDigits));
    if (rawDigits && rawDigits !== phoneDigits) candidates.push(await sha256Hex(rawDigits));

    let match: Record<string, unknown> | null = null;

    if (candidates.length > 0) {
      const { data, error } = await supabase
        .from("teachers").select(publicColumns)
        .eq("school_id", SCHOOL_ID).eq("is_active", true)
        .in("phone_hash", candidates).limit(2);
      if (error) return json({ error: error.message }, 500);
      if (data && data.length > 1) return json({ error: "ambiguous_identifier" }, 409);
      match = data && data.length === 1 ? data[0] : null;
    }

    if (!match) {
      const idHash = await sha256Hex(raw);
      const { data, error } = await supabase
        .from("teachers").select(publicColumns)
        .eq("school_id", SCHOOL_ID).eq("is_active", true)
        .eq("national_id_hash", idHash).limit(2);
      if (error) return json({ error: error.message }, 500);
      if (data && data.length > 1) return json({ error: "ambiguous_identifier" }, 409);
      match = data && data.length === 1 ? data[0] : null;
    }

    if (!match) return json({ found: false }, 404);

    // Issue this device a token so it can submit attendance later. Only the
    // hash is stored; the plaintext is returned once and never again.
    const token = newToken();
    const tokenHash = await sha256Hex(token);
    const { error: tokenError } = await supabase.from("device_tokens").insert({
      token_hash: tokenHash,
      school_id: SCHOOL_ID,
      teacher_id: match.id as string,
      role: (match.role as string) === "admin" ? "admin" : "teacher",
      label: typeof deviceLabel === "string" ? deviceLabel.slice(0, 120) : null,
      last_seen_at: new Date().toISOString(),
    });
    if (tokenError) return json({ error: tokenError.message }, 500);

    return json({ found: true, teacher: match, deviceToken: token });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
