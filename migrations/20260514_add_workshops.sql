-- Option A Workshops Module
-- Adds dedicated workshop events and registrations tables for Team Portal

CREATE TABLE IF NOT EXISTS workshops (
  workshop_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  workshop_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  room_id INT REFERENCES rooms(room_id),
  venue VARCHAR(255),
  instructor_personnel_id INT REFERENCES personnel(personnel_id),
  capacity INT NOT NULL DEFAULT 20 CHECK (capacity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Completed', 'Canceled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workshop_registrations (
  workshop_registration_id SERIAL PRIMARY KEY,
  workshop_id INT NOT NULL REFERENCES workshops(workshop_id) ON DELETE CASCADE,
  personnel_id INT NOT NULL REFERENCES personnel(personnel_id),
  registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  registration_status VARCHAR(20) NOT NULL DEFAULT 'Registered' CHECK (registration_status IN ('Registered', 'Canceled', 'Waitlist')),
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(workshop_id, personnel_id)
);

CREATE INDEX IF NOT EXISTS idx_workshops_date ON workshops(workshop_date);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop ON workshop_registrations(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_personnel ON workshop_registrations(personnel_id);
