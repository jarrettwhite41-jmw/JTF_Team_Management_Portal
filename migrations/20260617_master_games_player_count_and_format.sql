-- Rename difficulty_level to player_count and add format enum-like constraint.
-- This migration is idempotent and safe to run on environments already updated.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'master_game_list'
      AND column_name = 'difficulty_level'
  ) THEN
    EXECUTE 'ALTER TABLE public.master_game_list RENAME COLUMN difficulty_level TO player_count';
  END IF;
END $$;

ALTER TABLE public.master_game_list
  ADD COLUMN IF NOT EXISTS format VARCHAR(10);

ALTER TABLE public.master_game_list
  DROP CONSTRAINT IF EXISTS master_game_list_difficulty_level_check;

ALTER TABLE public.master_game_list
  DROP CONSTRAINT IF EXISTS master_game_list_player_count_check;

ALTER TABLE public.master_game_list
  DROP CONSTRAINT IF EXISTS master_game_list_format_check;

ALTER TABLE public.master_game_list
  ADD CONSTRAINT master_game_list_player_count_check
  CHECK (player_count IS NULL OR player_count > 0);

ALTER TABLE public.master_game_list
  ADD CONSTRAINT master_game_list_format_check
  CHECK (format IS NULL OR format IN ('Short', 'Long'));
