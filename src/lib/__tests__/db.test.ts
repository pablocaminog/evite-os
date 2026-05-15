import { describe, it, expect } from 'vitest';
import { createMockD1, createMockStatement } from './helpers';
import {
  getPartyByManagementToken,
  getPartyById,
  createParty,
  getGuestsByPartyId,
  getGuestByRsvpToken,
  createGuest,
  updateRsvp,
  createMagicLink,
  consumeMagicLink,
  verifyManagementToken,
  getRsvpSummary,
} from '../db';

const PARTY = {
  id: 'party-1',
  management_token: 'tok-1',
  title: 'Dino Party',
  description: null,
  event_date: '2026-06-15T14:00:00Z',
  location: 'Park',
  image_key: null,
  organizer_name: 'Pablo',
  organizer_email: 'p@example.com',
  organizer_phone: null,
  rsvp_deadline: null,
  created_at: '2026-05-01T00:00:00Z',
};

const GUEST = {
  id: 'guest-1',
  party_id: 'party-1',
  name: 'Alice',
  email: 'alice@example.com',
  phone: null,
  rsvp_token: 'rsvp-tok-1',
  status: 'pending' as const,
  guest_count: 1,
  dietary_notes: null,
  invited_at: '2026-05-01T00:00:00Z',
  responded_at: null,
};

describe('getPartyByManagementToken', () => {
  it('returns party when found', async () => {
    const db = createMockD1({
      prepare: (_q: string) => createMockStatement(PARTY) as unknown as D1PreparedStatement,
    });
    const party = await getPartyByManagementToken(db, 'tok-1');
    expect(party).toEqual(PARTY);
  });

  it('returns null when not found', async () => {
    const db = createMockD1({
      prepare: (_q: string) => createMockStatement(null) as unknown as D1PreparedStatement,
    });
    const party = await getPartyByManagementToken(db, 'bad-tok');
    expect(party).toBeNull();
  });
});

describe('getGuestsByPartyId', () => {
  it('returns array of guests', async () => {
    const db = createMockD1({
      prepare: (_q: string) => createMockStatement(null, [GUEST]) as unknown as D1PreparedStatement,
    });
    const guests = await getGuestsByPartyId(db, 'party-1');
    expect(guests).toHaveLength(1);
    expect(guests[0].name).toBe('Alice');
  });
});

describe('updateRsvp', () => {
  it('calls bind with correct status and count', async () => {
    let calledWith: unknown[] = [];
    const stmt = {
      bind: (...args: unknown[]) => { calledWith = args; return stmt; },
      run: async () => ({ success: true, meta: {}, results: [] }),
      first: async () => null,
      all: async () => ({ success: true, meta: {}, results: [] }),
      raw: async () => [],
    };
    const db = createMockD1({ prepare: () => stmt as unknown as D1PreparedStatement });
    await updateRsvp(db, 'rsvp-tok-1', 'attending', 3, 'no nuts');
    expect(calledWith).toContain('attending');
    expect(calledWith).toContain(3);
  });
});
