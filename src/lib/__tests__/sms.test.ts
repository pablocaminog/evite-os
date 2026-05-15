import { describe, it, expect } from 'vitest';
import { buildInvitationSms } from '../sms';

describe('buildInvitationSms', () => {
  it('includes party title and RSVP URL', () => {
    const msg = buildInvitationSms({
      organizerName: 'Pablo',
      partyTitle: 'Dino Party',
      eventDate: '2026-06-15T14:00:00Z',
      rsvpUrl: 'https://example.com/invite/abc',
    });
    expect(msg).toContain('Dino Party');
    expect(msg).toContain('https://example.com/invite/abc');
    expect(msg).toContain('Pablo');
  });

  it('stays under 320 characters for basic cases', () => {
    const msg = buildInvitationSms({
      organizerName: 'Pablo',
      partyTitle: 'Party',
      eventDate: '2026-06-15T14:00:00Z',
      rsvpUrl: 'https://ex.com/i/a',
    });
    expect(msg.length).toBeLessThanOrEqual(320);
  });
});
