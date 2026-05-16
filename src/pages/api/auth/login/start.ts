import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getUserByUsername, getCredentialsByUserId, saveChallenge } from '../../../../lib/auth';
import { verifyTurnstile } from '../../../../lib/turnstile';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json() as { username: string; turnstileToken?: string };

    const clean = body.username?.trim().toLowerCase();
    if (!clean) return Response.json({ error: 'username required' }, { status: 422 });

    // Check existence BEFORE consuming the Turnstile token — single-use tokens
    // must be preserved for register/start when the user doesn't exist yet.
    const user = await getUserByUsername(env.DB, clean);
    if (!user) return Response.json({ error: 'No account found' }, { status: 404 });

    const creds = await getCredentialsByUserId(env.DB, user.id);
    // No passkeys yet — return 404 WITHOUT consuming the Turnstile token so
    // the same token can be forwarded to register/start on the next call.
    if (!creds.length) return Response.json({ error: 'No passkeys registered' }, { status: 404 });

    // Credentials confirmed — safe to consume the token now
    const ts = await verifyTurnstile(
      (env as any).TURNSTILE_SECRET_KEY,
      body.turnstileToken,
      context.request.headers.get('CF-Connecting-IP')
    );
    if (!ts.success) {
      return Response.json({ error: `Human verification failed (${ts.error}). Please try again.` }, { status: 403 });
    }

    const options = await generateAuthenticationOptions({
      rpID: new URL(env.APP_URL).hostname,
      allowCredentials: creds.map(c => ({
        id: c.credential_id,
        transports: JSON.parse(c.transports) as AuthenticatorTransport[],
      })),
      userVerification: 'preferred',
    });

    await saveChallenge(env.SESSION, `auth:${user.id}`, options.challenge);
    return Response.json({ ...options, userId: user.id });
  } catch (err) {
    console.error('[login/start]', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
};
