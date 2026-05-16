const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(
  secret: string,
  token: string | null | undefined,
  ip?: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: 'Missing verification token' };
  if (!secret) return { success: true }; // dev fallback — no secret configured

  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  try {
    const res = await fetch(SITEVERIFY, { method: 'POST', body });
    const data = await res.json() as { success: boolean; 'error-codes'?: string[]; hostname?: string };
    console.log('[turnstile siteverify]', JSON.stringify(data));
    if (data.success) return { success: true };
    return { success: false, error: data['error-codes']?.[0] ?? 'verification-failed' };
  } catch (err) {
    console.error('[turnstile siteverify error]', err);
    return { success: false, error: 'siteverify-unreachable' };
  }
}
