-- skills
INSERT INTO public.skills (skill_id, skill_category_id, skill_name, description) VALUES
(1, 1, 'Listening', NULL),
(2, 1, 'Agreement', NULL),
(3, 2, 'Object Work', NULL),
(4, 3, 'Heightening', NULL)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.skills','skill_id'), COALESCE((SELECT MAX(skill_id) FROM public.skills),1), true);
