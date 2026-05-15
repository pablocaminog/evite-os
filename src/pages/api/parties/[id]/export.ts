import type { APIRoute } from 'astro';
import { verifyManagementToken, getGuestsByPartyId } from '../../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { env } = context.locals.runtime;
  const token = context.request.headers.get('X-Management-Token') ?? '';
  const party = await verifyManagementToken(env.DB, context.params.id!, token);

  if (!party) {
    return new Response('Unauthorized', { status: 401 });
  }

  const guests = await getGuestsByPartyId(env.DB, party.id);

  const header = 'Name,Email,Phone,Status,GuestCount,DietaryNotes,InvitedAt,RespondedAt\n';
  const rows = guests.map((g) =>
    [
      csvEscape(g.name),
      csvEscape(g.email ?? ''),
      csvEscape(g.phone ?? ''),
      g.status,
      g.guest_count,
      csvEscape(g.dietary_notes ?? ''),
      g.invited_at,
      g.responded_at ?? '',
    ].join(',')
  );
  const csv = header + rows.join('\n');
  const filename = `${party.title.replace(/[^a-z0-9]/gi, '_')}_guests.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
};

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
