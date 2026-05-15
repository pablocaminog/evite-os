CREATE TABLE parties (
  id TEXT PRIMARY KEY,
  management_token TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  location TEXT,
  image_key TEXT,
  organizer_name TEXT NOT NULL,
  organizer_email TEXT,
  organizer_phone TEXT,
  rsvp_deadline TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE guests (
  id TEXT PRIMARY KEY,
  party_id TEXT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  rsvp_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'attending', 'declined')),
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count >= 1),
  dietary_notes TEXT,
  invited_at TEXT NOT NULL DEFAULT (datetime('now')),
  responded_at TEXT,
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE magic_links (
  id TEXT PRIMARY KEY,
  party_id TEXT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1)),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Only idx_guests_party_id is needed; UNIQUE constraints already create implicit indexes
-- on rsvp_token, management_token, and magic_links.token
CREATE INDEX idx_guests_party_id ON guests(party_id);
