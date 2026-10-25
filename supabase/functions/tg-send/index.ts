// Telegram notification relay.
// The bot token lives here as a Supabase secret (TELEGRAM_BOT_TOKEN) instead
// of in each browser's localStorage. Chat IDs are stored in app_settings
// under key 'telegram_groups' so admins can manage them in the Settings UI.
//
// Request (POST, authenticated): { group: 'pflege' | 'pm' | 'inter' | 'all', text: string }
// 'all' sends to every distinct configured chat once (weekly summary).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GROUPS = ["pflege", "pm", "inter"] as const;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Verify the caller is an internal user (admin/mitarbeiter) using their JWT.
  const asCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: isInternal, error: rpcError } = await asCaller.rpc("is_internal");
  if (rpcError || !isInternal) {
    return json({ error: "forbidden" }, 403);
  }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) {
    return json({ error: "TELEGRAM_BOT_TOKEN secret not configured" }, 503);
  }

  let body: { group?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const { group, text } = body;
  if (!text || !group || (group !== "all" && !GROUPS.includes(group as any))) {
    return json({ error: "expected { group: 'pflege'|'pm'|'inter'|'all', text }" }, 400);
  }

  // Chat IDs from app_settings (service role: RLS-independent read).
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "telegram_groups")
    .maybeSingle();
  const chatIds: Record<string, string> = row?.value ?? {};

  const targets = group === "all"
    ? [...new Set(GROUPS.map((g) => chatIds[g]).filter(Boolean))]
    : [chatIds[group]].filter(Boolean);

  if (targets.length === 0) {
    return json({ error: `no chat id configured for group '${group}'` }, 400);
  }

  const results = await Promise.all(
    targets.map(async (chatId) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
        });
        return { chat_id: chatId, ok: res.ok };
      } catch {
        return { chat_id: chatId, ok: false };
      }
    }),
  );

  const allOk = results.every((r) => r.ok);
  return json({ ok: allOk, results }, allOk ? 200 : 502);
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
