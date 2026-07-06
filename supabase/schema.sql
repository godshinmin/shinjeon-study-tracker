-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh
-- or existing project. It recreates the same key-value model the Claude
-- artifact used (window.storage), so the app code needs almost no changes.

-- Personal data: one row per (user, key). Only the owner can read/write it.
create table if not exists user_data (
  user_id uuid references auth.users(id) on delete cascade not null,
  key text not null,
  value text,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

alter table user_data enable row level security;

create policy "read own data" on user_data
  for select using (auth.uid() = user_id);

create policy "write own data" on user_data
  for insert with check (auth.uid() = user_id);

create policy "update own data" on user_data
  for update using (auth.uid() = user_id);

-- Shared data: community boards + study groups. Any signed-in user can read
-- everything and write any key (matches the "last write wins" behavior of
-- the original app's shared storage).
create table if not exists shared_data (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table shared_data enable row level security;

create policy "read shared data" on shared_data
  for select using (auth.role() = 'authenticated');

create policy "write shared data" on shared_data
  for insert with check (auth.role() = 'authenticated');

create policy "update shared data" on shared_data
  for update using (auth.role() = 'authenticated');

-- Optional next step (not required to launch): move photo fields
-- (attempt.image, drawing entries, etc.) out of these JSON blobs and into a
-- dedicated Supabase Storage bucket once photo volume grows. For now, base64
-- images inside the JSON value work fine and require no extra setup.
