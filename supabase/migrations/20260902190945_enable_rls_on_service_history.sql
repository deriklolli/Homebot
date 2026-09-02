-- service_history was the only table left with RLS disabled, leaving it
-- readable and writable by anyone holding the public anon key.
--
-- All existing rows already have user_id populated and matching their parent
-- service's owner, so no backfill is required.

-- user_id already defaults to auth.uid(); make it non-nullable so a row can
-- never be created without an owner.
ALTER TABLE public.service_history
  ALTER COLUMN user_id SET NOT NULL;

-- Index to keep the policy check fast.
CREATE INDEX IF NOT EXISTS idx_service_history_user_id
  ON public.service_history(user_id);

ALTER TABLE public.service_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own service_history"
  ON public.service_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service_history"
  ON public.service_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service_history"
  ON public.service_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own service_history"
  ON public.service_history FOR DELETE
  USING (auth.uid() = user_id);
