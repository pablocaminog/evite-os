import type { APIRoute } from 'astro';
import { verifyManagementToken, updatePartyImageKey } from '../../lib/db';
import { uploadCoverImage } from '../../lib/storage';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { env } = context.locals.runtime;
  const token = context.request.headers.get('X-Management-Token') ?? '';
  const partyId = context.request.headers.get('X-Party-Id') ?? '';

  const party = await verifyManagementToken(env.DB, partyId, token);
  if (!party) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = context.request.headers.get('Content-Type') ?? '';
  const data = await context.request.arrayBuffer();

  try {
    const { key } = await uploadCoverImage(env.IMAGE_BUCKET, party.id, data, contentType);
    await updatePartyImageKey(env.DB, party.id, key);
    return new Response(
      JSON.stringify({ key, image_url: `${env.APP_URL}/images/${party.id}/cover` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
};
