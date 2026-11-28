/* Supabase RPC helper. Same project + anon key as the delivery app.
   Every UI call goes through a SECURITY DEFINER RPC that checks p_code (rec_check). */
export const SB_URL = 'https://idcmfebqizovivuvsuns.supabase.co';
export const SB_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY21mZWJxaXpvdml2dXZzdW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDgxODgsImV4cCI6MjA5OTMyNDE4OH0.miXziOcl5sEo8S6K1WsrHRhCbtEYRgnnUA4gAISUkmM';

export const CODE_KEY = 'hjsRecovery.code';

export function getCode(): string {
  try { return sessionStorage.getItem(CODE_KEY) || ''; } catch { return ''; }
}
export function setCode(code: string | null) {
  try { if (code) sessionStorage.setItem(CODE_KEY, code); else sessionStorage.removeItem(CODE_KEY); } catch { /* storage blocked */ }
}

// Older RPCs (stuck schema) raise Hinglish messages — show them in English.
const MSG: Record<string, string> = {
  'Galat access code': 'Wrong access code.',
  'Notice 1 (Reminder) ya 2 (Final) hi hota hai': 'Only Notice 1 (Reminder) or Notice 2 (Final) exists.',
  'Future date nahi chalegi': 'The date cannot be in the future.',
  'Case nahi mila': 'Case not found.',
  'Case closed hai': 'This case is closed.',
  'Pehle Notice 1 bhejo': 'Send Notice 1 first.',
  'Pehle Notice 2 bhejo': 'Send Notice 2 first.',
};

export class ApiError extends Error {}

export async function rpc<T = unknown>(name: string, params: Record<string, unknown> = {}, code = getCode()): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SB_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      body: JSON.stringify({ p_code: code, ...params }),
    });
  } catch {
    throw new ApiError('Could not connect to Supabase. Check your internet.');
  }
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  if (!res.ok) {
    const raw = (json as { message?: string } | null)?.message || `Error ${res.status}`;
    throw new ApiError(MSG[raw] || raw);
  }
  return json as T;
}
