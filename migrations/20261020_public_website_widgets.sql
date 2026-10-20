-- Migration: 20261020_public_website_widgets.sql
-- Provides secure, read-only public access to upcoming live shows and classes for Squarespace embedding.

-- 1. Function to retrieve public upcoming shows with authoritative Eventbrite ticketing
CREATE OR REPLACE FUNCTION public.get_public_upcoming_shows(
  limit_count INT DEFAULT 20,
  include_internal BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  show_id INT,
  show_date DATE,
  show_time TIME,
  venue VARCHAR,
  status VARCHAR,
  program_category VARCHAR,
  show_type_name VARCHAR,
  is_eventbrite BOOLEAN,
  ticket_url TEXT,
  ticket_status VARCHAR
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    s.show_id,
    s.show_date,
    s.show_time,
    s.venue,
    s.status,
    s.program_category,
    COALESCE(st.show_type_name, 'Main Stage Show') AS show_type_name,
    CASE 
      WHEN eb.external_event_url IS NOT NULL AND eb.external_event_url != '' THEN TRUE 
      ELSE FALSE 
    END AS is_eventbrite,
    COALESCE(eb.external_event_url, '') AS ticket_url,
    COALESCE(eb.ticket_status, 'open') AS ticket_status
  FROM show_information s
  LEFT JOIN show_types st ON s.show_type_id = st.show_type_id
  LEFT JOIN show_ticketing eb ON s.show_id = eb.show_id AND eb.platform = 'eventbrite'
  WHERE s.show_date >= CURRENT_DATE
    AND s.status NOT IN ('Canceled', 'Draft')
    AND (
      include_internal = TRUE 
      OR (eb.external_event_url IS NOT NULL AND eb.external_event_url != '')
    )
  ORDER BY s.show_date ASC, s.show_time ASC
  LIMIT limit_count;
$$;

-- 2. Function to retrieve public upcoming classes & workshops
CREATE OR REPLACE FUNCTION public.get_public_upcoming_classes(
  limit_count INT DEFAULT 20
)
RETURNS TABLE (
  item_type TEXT,
  offering_or_workshop_id INT,
  title TEXT,
  level_name TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  meeting_days_or_time TEXT,
  venue TEXT,
  status TEXT,
  ticket_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Conservatory Classes
  SELECT
    'class'::TEXT AS item_type,
    co.offering_id AS offering_or_workshop_id,
    COALESCE(cl.level_name, 'Conservatory Class')::TEXT AS title,
    COALESCE(cl.level_name, '')::TEXT AS level_name,
    COALESCE(cl.description, co.notes, '')::TEXT AS description,
    co.start_date,
    co.end_date,
    COALESCE(co.notes, 'Weekly Session')::TEXT AS meeting_days_or_time,
    COALESCE(r.room_name, 'Conservatory')::TEXT AS venue,
    co.status::TEXT AS status,
    ''::TEXT AS ticket_url
  FROM class_offerings co
  LEFT JOIN class_levels cl ON co.class_level_id = cl.class_level_id
  LEFT JOIN rooms r ON co.room_id = r.room_id
  WHERE (co.end_date >= CURRENT_DATE OR co.start_date >= CURRENT_DATE)
    AND co.status != 'Completed'

  UNION ALL

  -- Workshops
  SELECT
    'workshop'::TEXT AS item_type,
    w.workshop_id AS offering_or_workshop_id,
    w.title::TEXT AS title,
    'Specialty Workshop'::TEXT AS level_name,
    COALESCE(w.description, '')::TEXT AS description,
    w.workshop_date AS start_date,
    w.workshop_date AS end_date,
    CASE 
      WHEN w.start_time IS NOT NULL AND w.end_time IS NOT NULL 
      THEN (to_char(w.start_time, 'HH12:MI AM') || ' - ' || to_char(w.end_time, 'HH12:MI AM'))::TEXT
      ELSE 'Intensive'::TEXT 
    END AS meeting_days_or_time,
    COALESCE(w.venue, 'Main Stage')::TEXT AS venue,
    w.status::TEXT AS status,
    ''::TEXT AS ticket_url
  FROM workshops w
  WHERE w.workshop_date >= CURRENT_DATE
    AND w.status = 'Upcoming'

  ORDER BY start_date ASC
  LIMIT limit_count;
$$;

-- Grant execution permissions to anon and authenticated users for widget embedding
GRANT EXECUTE ON FUNCTION public.get_public_upcoming_shows(INT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_upcoming_classes(INT) TO anon, authenticated;
