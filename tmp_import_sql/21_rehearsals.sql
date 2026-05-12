-- rehearsals
INSERT INTO public.rehearsals (rehearsal_id, show_id, rehearsal_date, rehearsal_time, location, notes) VALUES
(1, NULL, '2025-01-22', '19:30:00', NULL, 'LeadPersonnelID:3'),
(2, NULL, '2025-01-29', '19:30:00', NULL, 'LeadPersonnelID:4'),
(3, NULL, '2025-02-05', '19:30:00', NULL, 'LeadPersonnelID:2'),
(4, NULL, '2025-02-12', '19:30:00', NULL, 'LeadPersonnelID:5'),
(5, NULL, '2025-02-19', '19:30:00', NULL, 'LeadPersonnelID:1'),
(6, NULL, '2025-02-26', '19:30:00', NULL, 'LeadPersonnelID:6'),
(7, NULL, '2025-03-05', '19:30:00', NULL, 'LeadPersonnelID:3'),
(8, NULL, '2025-03-12', '19:30:00', NULL, 'LeadPersonnelID:2'),
(9, NULL, '2025-08-06', NULL, NULL, NULL),
(10, NULL, '2025-08-13', NULL, NULL, NULL),
(11, NULL, '2025-08-20', NULL, NULL, NULL),
(12, NULL, '2025-08-27', NULL, NULL, NULL),
(13, NULL, '2025-09-03', NULL, NULL, NULL),
(14, NULL, '2025-09-10', NULL, NULL, NULL),
(15, NULL, '2025-09-17', NULL, NULL, NULL),
(16, NULL, '2025-09-24', NULL, NULL, NULL),
(17, NULL, '2025-10-01', NULL, NULL, NULL),
(18, NULL, '2025-10-08', NULL, NULL, NULL),
(19, NULL, '2025-10-15', NULL, NULL, NULL),
(20, NULL, '2025-10-22', NULL, NULL, NULL)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.rehearsals','rehearsal_id'), COALESCE((SELECT MAX(rehearsal_id) FROM public.rehearsals),1), true);
