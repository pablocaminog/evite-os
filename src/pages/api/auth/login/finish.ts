import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import {
  getUserByUsername, getCredentialById, updateCredentialCounter,
  consumeChallenge, createSession, sessionCookieOpts, fromBase64url,
} from '../../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const { username, assertion } = await context.request.json() as {
      username: string;
      assertion: Record<string, unknown>;
    };

    const user = await getUserByUsername(env.DB, username.trim().toLowerCase());
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    const challenge = await consumeChallenge(env.SESSION, `auth:${user.id}`);
    if (!challenge) return Response.json({ error: 'Challenge expired. Please try again.' }, { status: 400 });

    const credId = assertion.id as string;
    const dbCred = await getCredentialById(env.DB, credId);
    if (!dbCred || dbCred.user_id !== user.id) {
      return Response.json({ error: 'Credential not found' }, { status: 404 });
    }

    const verification = await verifyAuthenticationResponse({
      response: assertion as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
      expectedChallenge: challenge,
      expectedOrigin: env.APP_URL,
      expectedRPID: new URL(env.APP_URL).hostname,
      credential: {
        id: dbCred.credential_id,
        publicKey: fromBase64url(dbCred.public_key),
        counter: dbCred.counter,
        transports: JSON.parse(dbCred.transports) as AuthenticatorTransport[],
      },
    });

    if (!verification.verified) return Response.json({ error: 'Verification failed' }, { status: 400 });

    await updateCredentialCounter(env.DB, dbCred.credential_id, verification.authenticationInfo.newCounter);

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
    console.error('[login/finish]', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
};
