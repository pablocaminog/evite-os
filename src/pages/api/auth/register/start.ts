import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getUserByUsername, createUser, getCredentialsByUserId, saveChallenge } from '../../../../lib/auth';
import { verifyTurnstile } from '../../../../lib/turnstile';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json() as { username: string; turnstileToken?: string };

    const ts = await verifyTurnstile(
      (env as any).TURNSTILE_SECRET_KEY,
      body.turnstileToken,
      context.request.headers.get('CF-Connecting-IP')
    );
    if (!ts.success) {
      return Response.json({ error: `Human verification failed (${ts.error}). Please try again.` }, { status: 403 });
    }

    const { username } = body;
    if (!username?.trim()) return Response.json({ error: 'username required' }, { status: 422 });

    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (clean.length < 2) return Response.json({ error: 'Username must be at least 2 characters' }, { status: 422 });

    let user = await getUserByUsername(env.DB, clean);
    if (!user) user = await createUser(env.DB, clean);

    const existingCreds = await getCredentialsByUserId(env.DB, user.id);

    const options = await generateRegistrationOptions({
      rpName: 'whosisdown',
      rpID: new URL(env.APP_URL).hostname,
      userName: user.username,
      userDisplayName: user.display_name,
      userID: new TextEncoder().encode(user.id),
      excludeCredentials: existingCreds.map(c => ({
        id: c.credential_id,
        transports: JSON.parse(c.transports) as AuthenticatorTransport[],
      })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });

    await saveChallenge(env.SESSION, `reg:${user.id}`, options.challenge);
    return Response.json({ ...options, userId: user.id });
  } catch (err) {
    console.error('[register/start]', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
};
