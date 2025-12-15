
# Supabase Database Setup

To fix the issue where data is not saving across devices, you must run the following SQL code in your Supabase Dashboard > SQL Editor.

This script does two things:
1. Creates the necessary tables with `UUID` types to match the code.
2. Creates "Public Access" policies so your application can read/write data using the API Key provided.

```sql
-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Drop existing tables if they exist (WARNING: This clears old data)
-- Remove these DROP lines if you want to try and keep existing data, 
-- but it is recommended to start fresh to ensure schema compatibility.
drop table if exists notifications;
drop table if exists blocked_slots;
drop table if exists interviews;
drop table if exists users;

-- 3. Create Tables
create table users (
  id uuid primary key,
  name text not null,
  phone text not null,
  email text,
  role text not null,
  password text,
  approved boolean default false
);

create table interviews (
  id uuid primary key,
  student_id uuid references users(id),
  interviewer_id uuid references users(id),
  date text not null,
  start_time text not null,
  duration_minutes integer not null,
  stage text not null,
  company_name text
);

create table blocked_slots (
  id uuid primary key,
  date text not null,
  start_time text not null,
  end_time text not null,
  reason text
);

create table notifications (
  id uuid primary key,
  user_id uuid references users(id),
  message text not null,
  read boolean default false,
  timestamp text
);

-- 4. Enable RLS and Add Policies (Fixes "Data not saving" issue)

-- Users
alter table users enable row level security;
create policy "Enable all access for all users" on users for all using (true) with check (true);

-- Interviews
alter table interviews enable row level security;
create policy "Enable all access for all users" on interviews for all using (true) with check (true);

-- Blocked Slots
alter table blocked_slots enable row level security;
create policy "Enable all access for all users" on blocked_slots for all using (true) with check (true);

-- Notifications
alter table notifications enable row level security;
create policy "Enable all access for all users" on notifications for all using (true) with check (true);

-- 5. Enable Realtime (Optional but recommended for instant updates across devices)
-- You usually need to enable this in the Supabase Dashboard:
-- Database > Replication > Source > Select tables > Toggle Insert/Update/Delete
```
