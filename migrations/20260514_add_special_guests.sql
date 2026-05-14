-- Adds special guests and links them to workshops

CREATE TABLE IF NOT EXISTS special_guests (
  special_guest_id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  primary_email VARCHAR(255),
  primary_phone VARCHAR(50),
  expertise VARCHAR(255),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS special_guest_id INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workshops_special_guest_id_fkey'
  ) THEN
    ALTER TABLE workshops
      ADD CONSTRAINT workshops_special_guest_id_fkey
      FOREIGN KEY (special_guest_id)
      REFERENCES special_guests(special_guest_id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workshops_single_instructor_source_chk'
  ) THEN
    ALTER TABLE workshops
      ADD CONSTRAINT workshops_single_instructor_source_chk
      CHECK (instructor_personnel_id IS NULL OR special_guest_id IS NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_special_guests_active ON special_guests(active);
CREATE INDEX IF NOT EXISTS idx_workshops_special_guest_id ON workshops(special_guest_id);
