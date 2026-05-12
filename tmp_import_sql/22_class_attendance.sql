-- class_attendance
INSERT INTO public.class_attendance (attendance_id, enrollment_id, class_date, attended, notes) VALUES
(1, 1, '2026-01-07', TRUE, 'Removed'),
(2, 2, '2026-02-23', TRUE, 'Removed'),
(3, 5, '2026-02-25', TRUE, 'Removed'),
(4, 6, '2026-02-25', TRUE, 'Removed'),
(5, 3, '2026-02-23', TRUE, 'Present'),
(6, 3, '2026-03-02', TRUE, 'Present')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.class_attendance','attendance_id'), COALESCE((SELECT MAX(attendance_id) FROM public.class_attendance),1), true);
