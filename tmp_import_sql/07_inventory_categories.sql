-- inventory_categories
INSERT INTO public.inventory_categories (category_id, category_name) VALUES
(1, 'Beer'),
(2, 'Wine'),
(3, 'Cleaning Supply'),
(4, 'Snack'),
(5, 'Other'),
(6, 'Non-soda Beverage')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.inventory_categories','category_id'), COALESCE((SELECT MAX(category_id) FROM public.inventory_categories),1), true);
