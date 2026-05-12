-- class_levels
INSERT INTO public.class_levels (class_level_id, level_name, description) VALUES
(1, 'IA1', NULL),
(2, 'IA2', NULL),
(3, 'IA3', NULL),
(4, 'IA4', NULL),
(5, 'IA5', NULL),
(6, 'IA6', NULL),
(7, 'Sketch', NULL),
(8, 'Musical', NULL),
(9, 'Hip-Hop', NULL),
(10, 'Fakespear', NULL),
(11, 'SP1', NULL),
(12, 'SP2', NULL),
(13, 'SP3', NULL),
(14, 'SP4', NULL),
(15, 'SP5', NULL),
(16, 'SP6', NULL)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.class_levels','class_level_id'), COALESCE((SELECT MAX(class_level_id) FROM public.class_levels),1), true);
