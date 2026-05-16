import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getGuestByRsvpToken, updateRsvp } from '../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const guest = await getGuestByRsvpToken(env.DB, context.params.rsvp_token!);

  if (!guest) {
    return new Response(JSON.stringify({ error: 'Invalid RSVP link' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { status, adult_count, kid_count, dietary_notes } = body as Record<string, unknown>;

  if (status !== 'attending' && status !== 'declined') {
    return new Response(
      JSON.stringify({ error: 'status must be "attending" or "declined"' }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const adults = status === 'attending' ? Math.max(1, Number(adult_count) || 1) : 1;
  const kids   = status === 'attending' ? Math.max(0, Number(kid_count)   || 0) : 0;
  const notes  = typeof dietary_notes === 'string' ? dietary_notes : null;

  await updateRsvp(env.DB, context.params.rsvp_token!, status, adults, kids, notes);

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
