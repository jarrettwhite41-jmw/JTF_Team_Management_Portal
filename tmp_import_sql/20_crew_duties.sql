-- crew_duties
INSERT INTO public.crew_duties (duty_id, show_id, personnel_id, crew_duty_type_id) VALUES
(1, 1, 47, 1),
(2, 1, 74, 2),
(3, 1, 80, 3),
(4, 2, 78, 1),
(5, 3, 84, 1)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.crew_duties','duty_id'), COALESCE((SELECT MAX(duty_id) FROM public.crew_duties),1), true);
