-- Durable per-project memory for My AI chats.

ALTER TABLE public.my_ai_projects
  ADD COLUMN IF NOT EXISTS memory text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'my_ai_projects_memory_length'
      AND conrelid = 'public.my_ai_projects'::regclass
  ) THEN
    ALTER TABLE public.my_ai_projects
      ADD CONSTRAINT my_ai_projects_memory_length
      CHECK (char_length(memory) <= 4000);
  END IF;
END $$;
