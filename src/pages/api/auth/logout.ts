import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { deleteSession, sessionCookieOpts } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const token = context.request.headers.get('Cookie')
    ?.split(';').map(c => c.trim())
    .find(c => c.startsWith('wid_session='))
    ?.split('=')[1];

  if (token) await deleteSession(env.SESSION, token);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `wid_session=; ${sessionCookieOpts(0)}`,
    },
  });
};
