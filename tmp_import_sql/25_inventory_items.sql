-- inventory_items
INSERT INTO public.inventory_items (item_id, item_name, category_id, current_quantity, min_quantity, location_id, notes) VALUES
(1, 'Vacuum', 3, 0, 0, NULL, 'For vacuuming the Mainstage area'),
(2, 'La Rubia', 1, 0, 48, NULL, NULL),
(3, 'Father Francisco', 1, 0, 48, NULL, NULL),
(4, 'Golden Monkey', 1, 0, 48, NULL, NULL),
(5, 'Funky Buddha', 1, 0, 48, NULL, NULL),
(6, 'Unknown Item 6', 5, 0, 0, NULL, 'Auto-generated placeholder from InventoryTransactions'),
(7, 'Sour Monkey', 1, 0, 40, NULL, NULL),
(8, 'Freedom Tower', 1, 0, 0, NULL, NULL),
(9, 'Unholy', 1, 0, 0, NULL, NULL),
(10, 'Biscayne Bay', 1, 0, 0, NULL, NULL),
(11, 'La Croix', 6, 0, 0, NULL, NULL),
(12, 'The Federalist', 2, 0, 12, NULL, NULL)
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.inventory_items','item_id'), COALESCE((SELECT MAX(item_id) FROM public.inventory_items),1), true);
