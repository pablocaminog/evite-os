import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateId, generateToken } from '../../lib/tokens';
import { createParty } from '../../lib/db';
import { getSession } from '../../lib/auth';
import { verifyTurnstile } from '../../lib/turnstile';

export const prerender = false;

const json500 = (msg: string) =>
  new Response(JSON.stringify({ error: msg }), {
    status: 500, headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async (context) => {
  try {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const {
      title, description, event_date, location,
      organizer_name, organizer_email, organizer_phone, rsvp_deadline,
      turnstileToken,
    } = body as Record<string, string>;

    const ts = await verifyTurnstile(
      (env as any).TURNSTILE_SECRET_KEY,
      turnstileToken,
      context.request.headers.get('CF-Connecting-IP')
    );
    if (!ts.success) {
      return new Response(
        JSON.stringify({ error: 'Human verification failed. Please try again.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!title || !event_date || !organizer_name) {
      return new Response(
        JSON.stringify({ error: 'title, event_date, and organizer_name are required' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for authenticated user
    const sessionToken = context.request.headers.get('Cookie')
      ?.split(';').map(c => c.trim())
      .find(c => c.startsWith('wid_session='))
      ?.split('=')[1];
    const session = sessionToken ? await getSession(env.SESSION, sessionToken) : null;

    const id = generateId();
    const management_token = generateToken();
    const expires_at = session ? null : new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString();

    await createParty(env.DB, {
      id, management_token, title, event_date, organizer_name,
      description, location, organizer_email, organizer_phone, rsvp_deadline,
      user_id: session?.userId ?? null,
      expires_at,
    });

    return new Response(
      JSON.stringify({
        id,
        manage_url: `${env.APP_URL}/manage/${management_token}`,
        guest: !session,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[POST /api/parties]', err);
    return json500(err instanceof Error ? err.message : 'Unexpected error');
  }
};
