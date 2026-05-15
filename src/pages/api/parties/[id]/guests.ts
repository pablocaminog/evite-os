import type { APIRoute } from 'astro';
import { generateId, generateToken } from '../../../../lib/tokens';
import { verifyManagementToken, createGuest } from '../../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { env } = context.locals.runtime;
  const token = context.request.headers.get('X-Management-Token') ?? '';
  const party = await verifyManagementToken(env.DB, context.params.id!, token);

  if (!party) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
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

  const { name, email, phone } = body as Record<string, string>;

  if (!name) {
    return new Response(JSON.stringify({ error: 'name is required' }), {
      status: 422, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!email && !phone) {
    return new Response(
      JSON.stringify({ error: 'email or phone is required' }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const id = generateId();
  const rsvp_token = generateToken();
  await createGuest(env.DB, { id, party_id: party.id, name, email, phone, rsvp_token });

  return new Response(
    JSON.stringify({
      id,
      invite_url: `${env.APP_URL}/invite/${rsvp_token}`,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
};
