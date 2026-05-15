import { describe, it, expect } from 'vitest';
import { buildInvitationEmail, buildMagicLinkEmail } from '../email';

describe('buildInvitationEmail', () => {
  it('includes party title in subject', () => {
    const { subject } = buildInvitationEmail({
      partyTitle: 'Dino Party',
      eventDate: '2026-06-15T14:00:00Z',
      location: 'Park',
      description: 'Come have fun!',
      rsvpUrl: 'https://example.com/invite/abc',
      organizerName: 'Pablo',
      imageUrl: null,
    });
    expect(subject).toContain('Dino Party');
  });

  it('escapes HTML special chars in party title', () => {
    const { subject, html } = buildInvitationEmail({
      partyTitle: '<script>alert(1)</script>Party',
      eventDate: '2026-06-15T14:00:00Z',
      location: null,
      description: null,
      rsvpUrl: 'https://example.com/invite/abc',
      organizerName: 'Pablo',
      imageUrl: null,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(subject).toContain('<script>alert(1)</script>Party'); // subject is plain text, not HTML
  });

  it('includes RSVP URL in html body', () => {
    const { html } = buildInvitationEmail({
      partyTitle: 'Dino Party',
      eventDate: '2026-06-15T14:00:00Z',
      location: 'Park',
      description: null,
      rsvpUrl: 'https://example.com/invite/abc123',
      organizerName: 'Pablo',
      imageUrl: null,
    });
    expect(html).toContain('https://example.com/invite/abc123');
  });
});

describe('buildMagicLinkEmail', () => {
  it('includes manage URL in html body', () => {
    const { html } = buildMagicLinkEmail('https://example.com/manage/tok');
    expect(html).toContain('https://example.com/manage/tok');
  });

  it('has correct subject', () => {
    const { subject } = buildMagicLinkEmail('https://example.com/manage/tok');
    expect(subject).toBe('Your evite-os management link');
  });
});
