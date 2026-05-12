-- inventory_transactions
INSERT INTO public.inventory_transactions (transaction_id, item_id, transaction_type, quantity_change, notes, created_by) VALUES
(1, 1, 'Initial Stock', 1, 'LocationID:1 | TransactionDate:2025-10-27 | Initial inventory setup', '1'),
(2, 2, 'Initial Stock', 48, 'LocationID:2 | TransactionDate:2025-10-27 | Initial inventory setup', '1'),
(3, 2, 'Sale', -30, 'LocationID:2 | TransactionDate:2025-10-27', '1'),
(4, 2, 'Stock In', 40, 'LocationID:2 | TransactionDate:2025-10-27', '1'),
(5, 2, 'Sale', -1, 'LocationID:2 | TransactionDate:2025-10-26', '1'),
(6, 2, 'Stock In', 1, 'LocationID:2 | TransactionDate:2025-10-26', '1'),
(7, 2, 'Sale', -2, 'LocationID:2 | TransactionDate:2025-10-27', '1'),
(8, 3, 'Initial Stock', 100, 'LocationID:2 | TransactionDate:2025-10-27 | Initial inventory setup', '1'),
(9, 4, 'Initial Stock', 120, 'LocationID:2 | TransactionDate:2025-10-28 | Initial inventory setup', '1'),
(10, 5, 'Initial Stock', 106, 'LocationID:2 | TransactionDate:2025-10-28 | Initial inventory setup', '1'),
(11, 6, 'Initial Stock', 120, 'LocationID:2 | TransactionDate:2025-10-28 | Initial inventory setup', '1'),
(12, 7, 'Initial Stock', 120, 'LocationID:2 | TransactionDate:2025-10-28 | Initial inventory setup', '1'),
(13, 8, 'Initial Stock', 24, 'LocationID:2 | TransactionDate:2025-10-28 | Initial inventory setup', '1'),
(14, 10, 'Initial Stock', 42, 'LocationID:2 | TransactionDate:2025-10-28 | Initial inventory setup', '1'),
(15, 3, 'Sale', -46, 'LocationID:2 | TransactionDate:2025-10-28', '1'),
(16, 11, 'Initial Stock', 24, 'LocationID:2 | TransactionDate:2025-10-28 | Initial inventory setup', '1'),
(17, 6, 'Manual Adjustment', 3, 'LocationID:2 | TransactionDate:2025-10-28', '1'),
(18, 12, 'Initial Stock', 46, 'LocationID:2 | TransactionDate:2025-10-28 | Initial inventory setup', '1'),
(19, 6, 'Stock In', -1, 'LocationID:2 | TransactionDate:2026-01-15', '1'),
(20, 12, 'Stock In', -4, 'LocationID:2 | TransactionDate:2026-01-15', '1'),
(21, 7, 'Stock In', -4, 'LocationID:2 | TransactionDate:2026-01-15', '1')
ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.inventory_transactions','transaction_id'), COALESCE((SELECT MAX(transaction_id) FROM public.inventory_transactions),1), true);
