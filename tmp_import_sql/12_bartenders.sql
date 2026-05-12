-- bartenders
INSERT INTO public.bartenders (bartender_id, personnel_id, trained, status, active) VALUES
(1, 41, TRUE, '1', TRUE),
(2, 51, TRUE, '1', TRUE),
(3, 46, TRUE, '1', TRUE),
(4, 36, FALSE, '0', TRUE),
(5, 31, TRUE, '1', TRUE),
(6, 24, TRUE, '1', TRUE),
(7, 29, TRUE, '1', TRUE),
(8, 28, TRUE, '1', TRUE),
(9, 61, TRUE, 'Active', TRUE)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.bartenders','bartender_id'), COALESCE((SELECT MAX(bartender_id) FROM public.bartenders),1), true);
