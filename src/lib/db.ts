/// <reference types="@cloudflare/workers-types" />

export interface Party {
  id: string;
  management_token: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  image_key: string | null;
  organizer_name: string;
  organizer_email: string | null;
  organizer_phone: string | null;
  rsvp_deadline: string | null;
  created_at: string;
}

export interface Guest {
  id: string;
  party_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  rsvp_token: string;
  status: 'pending' | 'attending' | 'declined';
  guest_count: number;
  dietary_notes: string | null;
  invited_at: string;
  responded_at: string | null;
}

export interface MagicLink {
  id: string;
  party_id: string;
  token: string;
  used: number;
  expires_at: string;
  created_at: string;
}

export interface NewParty {
  id: string;
  management_token: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string;
  organizer_name: string;
  organizer_email?: string;
  organizer_phone?: string;
  rsvp_deadline?: string;
}

export interface NewGuest {
  id: string;
  party_id: string;
  name: string;
  email?: string;
  phone?: string;
  rsvp_token: string;
}

export interface RsvpSummary {
  total: number;
  attending: number;
  declined: number;
  pending: number;
  headcount: number;
}

export async function getPartyByManagementToken(
  db: D1Database,
  token: string
): Promise<Party | null> {
  return db
    .prepare('SELECT * FROM parties WHERE management_token = ?')
    .bind(token)
    .first<Party>();
}

export async function getPartyById(
  db: D1Database,
  id: string
): Promise<Party | null> {
  return db
    .prepare('SELECT * FROM parties WHERE id = ?')
    .bind(id)
    .first<Party>();
}

export async function verifyManagementToken(
  db: D1Database,
  partyId: string,
  token: string
): Promise<Party | null> {
  return db
    .prepare('SELECT * FROM parties WHERE id = ? AND management_token = ?')
    .bind(partyId, token)
    .first<Party>();
}

export async function createParty(
  db: D1Database,
  party: NewParty
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO parties
        (id, management_token, title, description, event_date, location,
         organizer_name, organizer_email, organizer_phone, rsvp_deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      party.id,
      party.management_token,
      party.title,
      party.description ?? null,
      party.event_date,
      party.location ?? null,
      party.organizer_name,
      party.organizer_email ?? null,
      party.organizer_phone ?? null,
      party.rsvp_deadline ?? null
    )
    .run();
}

export async function updatePartyImageKey(
  db: D1Database,
  partyId: string,
  imageKey: string
): Promise<void> {
  await db
    .prepare('UPDATE parties SET image_key = ? WHERE id = ?')
    .bind(imageKey, partyId)
    .run();
}

export async function getGuestsByPartyId(
  db: D1Database,
  partyId: string
): Promise<Guest[]> {
  const result = await db
    .prepare('SELECT * FROM guests WHERE party_id = ? ORDER BY invited_at ASC')
    .bind(partyId)
    .all<Guest>();
  return result.results;
}

export async function getGuestByRsvpToken(
  db: D1Database,
  rsvpToken: string
): Promise<Guest | null> {
  return db
    .prepare('SELECT * FROM guests WHERE rsvp_token = ?')
    .bind(rsvpToken)
    .first<Guest>();
}

export async function createGuest(
  db: D1Database,
  guest: NewGuest
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO guests (id, party_id, name, email, phone, rsvp_token)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      guest.id,
      guest.party_id,
      guest.name,
      guest.email ?? null,
      guest.phone ?? null,
      guest.rsvp_token
    )
    .run();
}

export async function markGuestInvited(
  db: D1Database,
  guestId: string
): Promise<void> {
  await db
    .prepare("UPDATE guests SET invited_at = datetime('now') WHERE id = ?")
    .bind(guestId)
    .run();
}

export async function updateRsvp(
  db: D1Database,
  rsvpToken: string,
  status: 'attending' | 'declined',
  guestCount: number,
  dietaryNotes: string | null
): Promise<void> {
  await db
    .prepare(
      `UPDATE guests
       SET status = ?, guest_count = ?, dietary_notes = ?,
           responded_at = datetime('now')
       WHERE rsvp_token = ?`
    )
    .bind(status, guestCount, dietaryNotes, rsvpToken)
    .run();
}

export async function createMagicLink(
  db: D1Database,
  link: { id: string; party_id: string; token: string; expires_at: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO magic_links (id, party_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(link.id, link.party_id, link.token, link.expires_at)
    .run();
}

export async function consumeMagicLink(
  db: D1Database,
  token: string
): Promise<MagicLink | null> {
  const link = await db
    .prepare(
      `SELECT * FROM magic_links
       WHERE token = ? AND used = 0 AND expires_at > datetime('now')`
    )
    .bind(token)
    .first<MagicLink>();
  if (!link) return null;
  await db
    .prepare('UPDATE magic_links SET used = 1 WHERE id = ?')
    .bind(link.id)
    .run();
  return link;
}

export async function getRsvpSummary(
  db: D1Database,
  partyId: string
): Promise<RsvpSummary> {
  const rows = await db
    .prepare(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(guest_count), 0) as headcount
       FROM guests WHERE party_id = ? GROUP BY status`
    )
    .bind(partyId)
    .all<{ status: string; count: number; headcount: number }>();

  const summary: RsvpSummary = { total: 0, attending: 0, declined: 0, pending: 0, headcount: 0 };
  for (const row of rows.results) {
    summary.total += row.count;
    if (row.status === 'attending') {
      summary.attending = row.count;
      summary.headcount = row.headcount;
    } else if (row.status === 'declined') {
      summary.declined = row.count;
    } else {
      summary.pending = row.count;
    }
  }
  return summary;
}
