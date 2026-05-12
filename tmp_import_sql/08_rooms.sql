-- rooms
INSERT INTO public.rooms (room_id, room_name) VALUES
(1, 'Main Stage'),
(2, 'Spotlight')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.rooms','room_id'), COALESCE((SELECT MAX(room_id) FROM public.rooms),1), true);
