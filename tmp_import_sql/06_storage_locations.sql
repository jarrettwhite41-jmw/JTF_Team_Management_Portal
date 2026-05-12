-- storage_locations
INSERT INTO public.storage_locations (location_id, location_name, description) VALUES
(1, 'Green Room', NULL),
(2, 'SpotLight Storage', NULL)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.storage_locations','location_id'), COALESCE((SELECT MAX(location_id) FROM public.storage_locations),1), true);
