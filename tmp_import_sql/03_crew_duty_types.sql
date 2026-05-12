-- crew_duty_types
INSERT INTO public.crew_duty_types (crew_duty_type_id, duty_name) VALUES
(1, 'Tech'),
(2, 'Box'),
(3, 'House'),
(4, 'Bar')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.crew_duty_types','crew_duty_type_id'), COALESCE((SELECT MAX(crew_duty_type_id) FROM public.crew_duty_types),1), true);
