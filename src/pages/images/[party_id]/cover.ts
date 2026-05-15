import type { APIRoute } from 'astro';
import { getCoverImage } from '../../../lib/storage';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { env } = context.locals.runtime;
  const obj = await getCoverImage(env.IMAGES, context.params.party_id!);

  if (!obj) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
