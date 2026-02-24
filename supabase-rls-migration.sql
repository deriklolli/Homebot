-- ============================================================
-- HOMEBOT: Per-User Data Isolation (Row Level Security)
-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
--
-- BEFORE RUNNING: Look up your user UUID by running:
--   SELECT id, email FROM auth.users;
-- Then replace YOUR_USER_UUID below with your actual UUID.
-- ============================================================

-- Step 1: Add user_id columns with DEFAULT auth.uid()
-- (nullable initially so existing rows are not rejected)

ALTER TABLE projects        ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE contractors     ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE services        ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE tasks           ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE home_assets     ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE project_events  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE project_notes   ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE project_images  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE project_invoices ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();


-- Step 2: Backfill existing rows to your user
-- REPLACE 'YOUR_USER_UUID' with your actual UUID from auth.users!

-- UPDATE projects         SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
-- UPDATE contractors      SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
-- UPDATE inventory_items  SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
-- UPDATE services         SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
-- UPDATE tasks            SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
-- UPDATE home_assets      SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
-- UPDATE project_events   SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
-- UPDATE project_notes    SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
-- UPDATE project_images   SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;
-- UPDATE project_invoices SET user_id = 'YOUR_USER_UUID' WHERE user_id IS NULL;


-- Step 3: Make user_id NOT NULL (run AFTER backfill!)

-- ALTER TABLE projects         ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE contractors      ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE inventory_items  ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE services         ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE tasks            ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE home_assets      ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE project_events   ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE project_notes    ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE project_images   ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE project_invoices ALTER COLUMN user_id SET NOT NULL;


-- Step 4: Add indexes for fast RLS policy checks

CREATE INDEX IF NOT EXISTS idx_projects_user_id         ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_contractors_user_id      ON contractors(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id  ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id         ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id            ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_home_assets_user_id      ON home_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_project_events_user_id   ON project_events(user_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_user_id    ON project_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_images_user_id   ON project_images(user_id);
CREATE INDEX IF NOT EXISTS idx_project_invoices_user_id ON project_invoices(user_id);


-- Step 5: Enable RLS on all tables

ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_assets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_images   ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_snapshot    ENABLE ROW LEVEL SECURITY;


-- Step 6: Create RLS policies (SELECT / INSERT / UPDATE / DELETE)

-- projects
CREATE POLICY "Users can view own projects"   ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- contractors
CREATE POLICY "Users can view own contractors"   ON contractors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contractors" ON contractors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contractors" ON contractors FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contractors" ON contractors FOR DELETE USING (auth.uid() = user_id);

-- inventory_items
CREATE POLICY "Users can view own inventory"   ON inventory_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON inventory_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON inventory_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory" ON inventory_items FOR DELETE USING (auth.uid() = user_id);

-- services
CREATE POLICY "Users can view own services"   ON services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own services" ON services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own services" ON services FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own services" ON services FOR DELETE USING (auth.uid() = user_id);

-- tasks
CREATE POLICY "Users can view own tasks"   ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- home_assets
CREATE POLICY "Users can view own home_assets"   ON home_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own home_assets" ON home_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own home_assets" ON home_assets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own home_assets" ON home_assets FOR DELETE USING (auth.uid() = user_id);

-- project_events
CREATE POLICY "Users can view own project_events"   ON project_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own project_events" ON project_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own project_events" ON project_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own project_events" ON project_events FOR DELETE USING (auth.uid() = user_id);

-- project_notes
CREATE POLICY "Users can view own project_notes"   ON project_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own project_notes" ON project_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own project_notes" ON project_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own project_notes" ON project_notes FOR DELETE USING (auth.uid() = user_id);

-- project_images
CREATE POLICY "Users can view own project_images"   ON project_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own project_images" ON project_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own project_images" ON project_images FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own project_images" ON project_images FOR DELETE USING (auth.uid() = user_id);

-- project_invoices
CREATE POLICY "Users can view own project_invoices"   ON project_invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own project_invoices" ON project_invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own project_invoices" ON project_invoices FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own project_invoices" ON project_invoices FOR DELETE USING (auth.uid() = user_id);

-- home_snapshot (already has user_id, just needs policies)
CREATE POLICY "Users can view own snapshots"   ON home_snapshot FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own snapshots" ON home_snapshot FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own snapshots" ON home_snapshot FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own snapshots" ON home_snapshot FOR DELETE USING (auth.uid() = user_id);
