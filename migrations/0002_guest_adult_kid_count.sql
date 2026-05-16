ALTER TABLE guests ADD COLUMN adult_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE guests ADD COLUMN kid_count INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows: existing guest_count becomes adult_count
UPDATE guests SET adult_count = guest_count, kid_count = 0;
