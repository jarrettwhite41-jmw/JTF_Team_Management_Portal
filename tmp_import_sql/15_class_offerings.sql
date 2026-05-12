-- class_offerings
INSERT INTO public.class_offerings (offering_id, class_level_id, start_date, end_date, teacher_id, room_id, max_students, status, notes) VALUES
(1, 2, '2026-01-06', '2026-02-17', 1, NULL, 12, 'Upcoming', NULL),
(2, 1, '2026-02-24', '2026-03-31', 4, 1, 16, 'In Progress', 'Tuesday'),
(3, 6, '2026-02-26', '2026-04-09', 11, 2, 12, 'Upcoming', 'Thursday'),
(4, 3, '2026-02-24', '2026-04-07', 10, 2, 12, 'Upcoming', 'Tuesday'),
(5, 2, '2026-03-05', '2026-04-09', 12, 1, 12, 'Upcoming', 'Thursday'),
(6, 10, '2026-02-23', '2026-04-06', 5, 2, 12, 'Upcoming', 'Monday'),
(7, 2, '2026-02-23', '2026-04-06', 13, 1, 13, 'Upcoming', 'Monday')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.class_offerings','offering_id'), COALESCE((SELECT MAX(offering_id) FROM public.class_offerings),1), true);
