-- show_types
INSERT INTO public.show_types (show_type_id, show_type_name) VALUES
(1, 'FNL'),
(2, 'The BIG Show'),
(3, 'Musical'),
(4, 'Fakespheare'),
(5, 'Hip-Hop'),
(6, 'QPI'),
(7, 'Spanish'),
(8, 'JTF Presents'),
(9, 'Death Match'),
(10, 'Student Showcase')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.show_types','show_type_id'), COALESCE((SELECT MAX(show_type_id) FROM public.show_types),1), true);
