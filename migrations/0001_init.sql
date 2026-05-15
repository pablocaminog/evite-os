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
  guest_count INTEGER NOT NULL DEFAULT 1,
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

CREATE INDEX idx_guests_party_id ON guests(party_id);
CREATE INDEX idx_guests_rsvp_token ON guests(rsvp_token);
CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_parties_management_token ON parties(management_token);
