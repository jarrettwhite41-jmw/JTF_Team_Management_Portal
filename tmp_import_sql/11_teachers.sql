-- teachers
INSERT INTO public.teachers (teacher_id, personnel_id, active) VALUES
(1, 29, TRUE),
(2, 47, TRUE),
(3, 48, TRUE),
(4, 17, TRUE),
(5, 36, TRUE),
(6, 41, TRUE),
(9, 15, TRUE),
(10, 42, TRUE),
(11, 32, TRUE),
(12, 9, TRUE),
(13, 44, TRUE),
(14, 49, TRUE)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.teachers','teacher_id'), COALESCE((SELECT MAX(teacher_id) FROM public.teachers),1), true);
