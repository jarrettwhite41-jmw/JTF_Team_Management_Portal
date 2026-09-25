-- Migration: 20260925_add_ticketing_system.sql
-- Enables TicketWeb and Eventbrite integration, sales tracking, capacity management, and door reconciliation.

-- 1. Integration Settings Table for TicketWeb and Eventbrite credentials
CREATE TABLE IF NOT EXISTS ticketing_integrations (
  integration_id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL UNIQUE, -- 'eventbrite', 'ticketweb'
  api_key TEXT,
  api_secret TEXT,
  organization_id TEXT,
  venue_id TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'syncing', 'success', 'error'
  sync_error TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed defaults for both platforms if not present
INSERT INTO ticketing_integrations (platform, is_active, sync_status)
VALUES 
  ('eventbrite', false, 'idle'),
  ('ticketweb', false, 'idle')
ON CONFLICT (platform) DO NOTHING;

-- 2. Show Ticketing Links Table (links JTF Show to external platform events)
CREATE TABLE IF NOT EXISTS show_ticketing (
  ticket_link_id SERIAL PRIMARY KEY,
  show_id INT NOT NULL REFERENCES show_information(show_id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'eventbrite', 'ticketweb', 'box_office'
  external_event_id TEXT,
  external_event_url TEXT,
  total_capacity INT DEFAULT 100,
  sold_count INT DEFAULT 0,
  held_count INT DEFAULT 0, -- comp or reserved holdbacks
  gross_revenue NUMERIC(10, 2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'USD',
  ticket_status VARCHAR(50) DEFAULT 'open', -- 'open', 'paused', 'sold_out', 'closed'
  door_walkup_count INT DEFAULT 0,
  door_walkup_revenue NUMERIC(10, 2) DEFAULT 0.00,
  checked_in_count INT DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_show_platform UNIQUE (show_id, platform)
);

-- 3. Ticket Tiers / Breakdown Table (e.g., General Admission, VIP, Student/Senior)
CREATE TABLE IF NOT EXISTS show_ticket_tiers (
  tier_id SERIAL PRIMARY KEY,
  show_id INT NOT NULL REFERENCES show_information(show_id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'eventbrite', 'ticketweb', 'door'
  tier_name VARCHAR(100) NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  capacity INT DEFAULT 50,
  sold_count INT DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_show_ticketing_show_id ON show_ticketing(show_id);
CREATE INDEX IF NOT EXISTS idx_show_ticketing_platform ON show_ticketing(platform);
CREATE INDEX IF NOT EXISTS idx_show_ticket_tiers_show_id ON show_ticket_tiers(show_id);

-- RLS Policies
ALTER TABLE ticketing_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_ticketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_ticket_tiers ENABLE ROW LEVEL SECURITY;

-- Admins, managers, and directors can read ticketing
CREATE POLICY "Admins, managers, directors can read ticketing_integrations"
  ON ticketing_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND portal_name = 'team'
        AND portal_role IN ('admin', 'manager')
        AND is_active = true
    )
  );

CREATE POLICY "Admins and managers can update ticketing_integrations"
  ON ticketing_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND portal_name = 'team'
        AND portal_role IN ('admin', 'manager')
        AND is_active = true
    )
  );

CREATE POLICY "Team staff can read show_ticketing"
  ON show_ticketing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY "Admins, managers, directors can manage show_ticketing"
  ON show_ticketing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND portal_name = 'team'
        AND portal_role IN ('admin', 'manager', 'director')
        AND is_active = true
    )
  );

CREATE POLICY "Team staff can read show_ticket_tiers"
  ON show_ticket_tiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY "Admins, managers, directors can manage show_ticket_tiers"
  ON show_ticket_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND portal_name = 'team'
        AND portal_role IN ('admin', 'manager', 'director')
        AND is_active = true
    )
  );
