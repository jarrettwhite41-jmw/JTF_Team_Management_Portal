-- directors
INSERT INTO public.directors (director_id, personnel_id) VALUES
(1, 47),
(2, 48),
(3, 29),
(4, 17),
(5, 36),
(6, 3),
(7, 34),
(8, 41),
(9, 42),
(10, 14),
(11, 38),
(12, 9),
(13, 49)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.directors','director_id'), COALESCE((SELECT MAX(director_id) FROM public.directors),1), true);
