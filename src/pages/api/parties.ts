import type { APIRoute } from 'astro';
import { generateId, generateToken } from '../../lib/tokens';
import { createParty } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { env } = context.locals.runtime;

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
  } = body as Record<string, string>;

  if (!title || !event_date || !organizer_name) {
    return new Response(
      JSON.stringify({ error: 'title, event_date, and organizer_name are required' }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const id = generateId();
  const management_token = generateToken();

  try {
    await createParty(env.DB, {
      id, management_token, title, event_date, organizer_name,
      description, location, organizer_email, organizer_phone, rsvp_deadline,
    });
  } catch (err) {
    console.error('createParty failed:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to create party. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      id,
      manage_url: `${env.APP_URL}/manage/${management_token}`,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
};
