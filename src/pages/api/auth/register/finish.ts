import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import {
  getUserByUsername, getCredentialsByUserId, saveCredential,
  consumeChallenge, createSession, sessionCookieOpts, toBase64url,
} from '../../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const { username, credential } = await context.request.json() as {
      username: string;
      credential: Record<string, unknown>;
    };

    const user = await getUserByUsername(env.DB, username);
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    const challenge = await consumeChallenge(env.SESSION, `reg:${user.id}`);
    if (!challenge) return Response.json({ error: 'Challenge expired. Please try again.' }, { status: 400 });

    const origin = env.APP_URL;
    const rpID = new URL(origin).hostname;

    const verification = await verifyRegistrationResponse({
      response: credential as Parameters<typeof verifyRegistrationResponse>[0]['response'],
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return Response.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credential: cred } = verification.registrationInfo;
    const existingCreds = await getCredentialsByUserId(env.DB, user.id);
    if (existingCreds.some(c => c.credential_id === cred.id)) {
      return Response.json({ error: 'Credential already registered' }, { status: 409 });
    }

    await saveCredential(env.DB, {
      user_id: user.id,
      credential_id: cred.id,
      public_key: toBase64url(cred.publicKey),
      counter: cred.counter,
      device_type: cred.deviceType,
      backed_up: cred.backedUp ? 1 : 0,
      transports: JSON.stringify(credential.response && (credential.response as any).transports || []),
    });

    const token = await createSession(env.SESSION, {
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
    });

    return new Response(JSON.stringify({ ok: true, username: user.username }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `wid_session=${token}; ${sessionCookieOpts()}`,
      },
    });
  } catch (err) {
    console.error('[register/finish]', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
};
