-- show_information
INSERT INTO public.show_information (show_id, show_date, show_time, show_type_id, director_id, venue, status, notes) VALUES
(1, '2026-02-21', '21:15:00', 2, 1, 'Main Stage', 'Scheduled', NULL),
(2, '2026-02-20', '21:15:00', 1, 7, 'Main Stage', 'Scheduled', NULL),
(3, '2026-02-26', '20:00:00', 10, 4, 'Main Stage', 'Scheduled', 'Student Showcase')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.show_information','show_id'), COALESCE((SELECT MAX(show_id) FROM public.show_information),1), true);
