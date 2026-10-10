// Supabase Edge Function: forwards AI requests from signed-in app users to the Anthropic Messages API.
// The API key stays on the server (set it with `supabase secrets set ANTHROPIC_API_KEY=...`).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, anthropic-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // Only signed-in users may use the AI.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json({ error: 'unauthorized' }, 401);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not set' }, 500);

  let body: { system?: string; messages?: unknown[]; max_tokens?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 40) {
    return json({ error: 'invalid messages' }, 400);
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5',
      max_tokens: Math.min(Number(body.max_tokens) || 1024, 1500),
      system: typeof body.system === 'string' ? body.system.slice(0, 8000) : undefined,
      messages: body.messages,
    }),
  });
  return new Response(await res.text(), { status: res.status, headers: { ...cors, 'content-type': 'application/json' } });
});
