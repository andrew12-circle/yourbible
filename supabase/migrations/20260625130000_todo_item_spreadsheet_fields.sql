-- Spreadsheet-style task fields on todo_items (type, dates, status, today pin).

ALTER TABLE public.todo_items
  ADD COLUMN IF NOT EXISTS task_type text
    CHECK (
      task_type IS NULL OR task_type IN (
        'work', 'educational', 'familiar', 'financial', 'friends',
        'health', 'home', 'laboral', 'meeting', 'personal'
      )
    ),
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'done', 'cancelled')),
  ADD COLUMN IF NOT EXISTS pinned_for_date date;

-- Backfill end_date from legacy due_date column.
UPDATE public.todo_items
SET end_date = due_date
WHERE end_date IS NULL AND due_date IS NOT NULL;

-- Sync status from done flag for existing rows.
UPDATE public.todo_items
SET status = 'done'
WHERE done = true AND status = 'not_started';

CREATE INDEX IF NOT EXISTS idx_todo_items_user_end_date
  ON public.todo_items (user_id, end_date)
  WHERE done = false AND end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_todo_items_user_pinned
  ON public.todo_items (user_id, pinned_for_date)
  WHERE pinned_for_date IS NOT NULL;
