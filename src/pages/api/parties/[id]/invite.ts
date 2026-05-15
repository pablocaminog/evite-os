import type { APIRoute } from 'astro';
import { verifyManagementToken, getGuestsByPartyId, markGuestInvited } from '../../../../lib/db';
import { buildInvitationEmail, sendEmail } from '../../../../lib/email';
import { buildInvitationSms, sendSms } from '../../../../lib/sms';

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

  const body = await context.request.json().catch(() => ({})) as { guest_ids?: string[] };
  const allGuests = await getGuestsByPartyId(env.DB, party.id);

  const targets = body.guest_ids
    ? allGuests.filter((g) => body.guest_ids!.includes(g.id))
    : allGuests.filter((g) => g.status === 'pending');

  const imageUrl = party.image_key
    ? `${env.APP_URL}/images/${party.id}/cover`
    : null;

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const guest of targets) {
    const rsvpUrl = `${env.APP_URL}/invite/${guest.rsvp_token}`;

    if (guest.email) {
      try {
        const content = buildInvitationEmail({
          partyTitle: party.title,
          eventDate: party.event_date,
          location: party.location,
          description: party.description,
          rsvpUrl,
          organizerName: party.organizer_name,
          imageUrl,
        });
        await sendEmail(env.SEND_EMAIL, env.FROM_EMAIL, guest.email, content);
        results.sent++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Email to ${guest.email}: ${(err as Error).message}`);
      }
    }

    if (guest.phone) {
      try {
        const text = buildInvitationSms({
          organizerName: party.organizer_name,
          partyTitle: party.title,
          eventDate: party.event_date,
          rsvpUrl,
        });
        await sendSms(env.TELNYX_API_KEY, env.FROM_PHONE, guest.phone, text);
        results.sent++;
      } catch (err) {
        results.failed++;
        results.errors.push(`SMS to ${guest.phone}: ${(err as Error).message}`);
      }
    }

    await markGuestInvited(env.DB, guest.id);
  }

  return new Response(JSON.stringify(results), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
