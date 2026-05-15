import type { APIRoute } from 'astro';
import { generateId, generateToken } from '../../lib/tokens';
import { createMagicLink } from '../../lib/db';
import { buildMagicLinkEmail, sendEmail } from '../../lib/email';

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

  const { email } = body as Record<string, string>;
  if (!email) {
    return new Response(JSON.stringify({ error: 'email is required' }), {
      status: 422, headers: { 'Content-Type': 'application/json' },
    });
  }

  const party = await env.DB
    .prepare('SELECT id, management_token FROM parties WHERE organizer_email = ? ORDER BY created_at DESC LIMIT 1')
    .bind(email)
    .first<{ id: string; management_token: string }>();

  const successResponse = new Response(
    JSON.stringify({ success: true, message: 'If that email has a party, a link is on the way.' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );

  if (!party) return successResponse;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await createMagicLink(env.DB, { id: generateId(), party_id: party.id, token, expires_at: expiresAt });

  const manageUrl = `${env.APP_URL}/manage/${party.management_token}?ml=${token}`;
  const content = buildMagicLinkEmail(manageUrl);

  try {
    await sendEmail(env.SEND_EMAIL, env.FROM_EMAIL, email, content);
  } catch {
    // Always return success — don't leak whether email exists
  }

  return successResponse;
};
