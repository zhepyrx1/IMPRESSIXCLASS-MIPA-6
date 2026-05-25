create extension if not exists "pgcrypto";

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  no_absen int not null,
  name text not null,
  class_name text not null default 'MIPA 6',
  role_in_class text not null default 'Anggota Kelas',
  email text unique not null,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  name text not null,
  email text unique not null,
  role text not null check (role in ('teacher', 'student')),
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  class_name text not null default 'MIPA 6',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_active boolean not null default true
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  session_id uuid references public.attendance_sessions(id) on delete set null,
  date date not null default current_date,
  time time,
  status text not null check (status in ('Hadir', 'Izin', 'Sakit', 'Tidak Hadir', 'Alpha')),
  method text not null check (method in ('Scan QR Dinamis', 'Form Rumah', 'Input Admin')),
  note text,
  approval_status text not null default 'Terverifikasi',
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create table if not exists public.absence_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  type text not null check (type in ('izin', 'sakit', 'tidak_hadir')),
  reason text not null,
  date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  proof_url text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  description text not null,
  image_url text,
  created_at timestamptz not null default now()
);

-- Migration helpers for older project versions.
alter table public.attendance_sessions add column if not exists token text;
alter table public.attendance_sessions add column if not exists expires_at timestamptz;
alter table public.absence_requests add column if not exists type text;
alter table public.absence_requests add column if not exists reason text;
alter table public.absence_requests add column if not exists status text default 'pending';
alter table public.absence_requests add column if not exists verified_by uuid references auth.users(id) on delete set null;
alter table public.absence_requests add column if not exists verified_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'attendance_sessions' and column_name = 'session_code'
  ) then
    alter table public.attendance_sessions alter column session_code drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'attendance_sessions' and column_name = 'expired_at'
  ) then
    alter table public.attendance_sessions alter column expired_at drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'absence_requests' and column_name = 'note'
  ) then
    alter table public.absence_requests alter column note drop not null;
  end if;
end $$;

alter table public.absence_requests drop constraint if exists absence_requests_status_check;
alter table public.absence_requests drop constraint if exists absence_requests_approval_status_check;
alter table public.absence_requests drop constraint if exists absence_requests_student_id_date_key;
alter table public.absence_requests add constraint absence_requests_status_check check (status in ('pending', 'approved', 'rejected'));

create unique index if not exists attendance_sessions_token_key on public.attendance_sessions(token);
create index if not exists attendance_records_date_idx on public.attendance_records(date);
create index if not exists absence_requests_status_idx on public.absence_requests(status);
create index if not exists attendance_sessions_active_idx on public.attendance_sessions(is_active, expires_at);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.absence_requests enable row level security;
alter table public.activities enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid() limit 1
$$;

drop policy if exists "profiles_select_own_or_staff" on public.profiles;
drop policy if exists "Profiles can read own or teacher can read" on public.profiles;
create policy "Profiles can read own or teacher can read"
on public.profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'teacher'
  )
);

drop policy if exists "students_read_authenticated" on public.students;
drop policy if exists "students_staff_write" on public.students;
drop policy if exists "Teachers can read all students" on public.students;
create policy "Teachers can read all students"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'teacher'
  )
);

drop policy if exists "Students can read own student data" on public.students;
create policy "Students can read own student data"
on public.students
for select
to authenticated
using (
  id in (
    select student_id
    from public.profiles
    where user_id = auth.uid()
      and role = 'student'
  )
);

drop policy if exists "sessions_staff_write" on public.attendance_sessions;
drop policy if exists "sessions_student_read_active" on public.attendance_sessions;
drop policy if exists "Teachers can manage attendance sessions" on public.attendance_sessions;
create policy "Teachers can manage attendance sessions"
on public.attendance_sessions
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'teacher'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'teacher'
  )
);

drop policy if exists "Students can read active attendance sessions" on public.attendance_sessions;
create policy "Students can read active attendance sessions"
on public.attendance_sessions
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'student'
  )
);

drop policy if exists "records_staff_read_write" on public.attendance_records;
drop policy if exists "records_student_read_own" on public.attendance_records;
drop policy if exists "records_student_insert_qr" on public.attendance_records;
drop policy if exists "Students can insert own attendance records" on public.attendance_records;
create policy "Students can insert own attendance records"
on public.attendance_records
for insert
to authenticated
with check (
  student_id in (
    select student_id
    from public.profiles
    where user_id = auth.uid()
      and role = 'student'
  )
);

drop policy if exists "Students can read own attendance records" on public.attendance_records;
create policy "Students can read own attendance records"
on public.attendance_records
for select
to authenticated
using (
  student_id in (
    select student_id
    from public.profiles
    where user_id = auth.uid()
      and role = 'student'
  )
);

drop policy if exists "Teachers can read all attendance records" on public.attendance_records;
create policy "Teachers can read all attendance records"
on public.attendance_records
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'teacher'
  )
);

drop policy if exists "Teachers can delete attendance records" on public.attendance_records;
create policy "Teachers can delete attendance records"
on public.attendance_records
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'teacher'
  )
);

drop policy if exists "absence_student_own" on public.absence_requests;
drop policy if exists "absence_staff_all" on public.absence_requests;
drop policy if exists "Students can insert own absence requests" on public.absence_requests;
create policy "Students can insert own absence requests"
on public.absence_requests
for insert
to authenticated
with check (
  student_id in (
    select student_id
    from public.profiles
    where user_id = auth.uid()
      and role = 'student'
  )
);

drop policy if exists "Students can read own absence requests" on public.absence_requests;
create policy "Students can read own absence requests"
on public.absence_requests
for select
to authenticated
using (
  student_id in (
    select student_id
    from public.profiles
    where user_id = auth.uid()
      and role = 'student'
  )
);

drop policy if exists "Teachers can read all absence requests" on public.absence_requests;
create policy "Teachers can read all absence requests"
on public.absence_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'teacher'
  )
);

drop policy if exists "Teachers can update absence requests" on public.absence_requests;
create policy "Teachers can update absence requests"
on public.absence_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'teacher'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'teacher'
  )
);

drop policy if exists "activities_read_authenticated" on public.activities;
drop policy if exists "Activities can be read by authenticated users" on public.activities;
create policy "Activities can be read by authenticated users"
on public.activities
for select
to authenticated
using (true);

drop policy if exists "activities_staff_write" on public.activities;
drop policy if exists "Teachers can manage activities" on public.activities;
create policy "Teachers can manage activities"
on public.activities
for all
to authenticated
using (public.current_profile_role() = 'teacher')
with check (public.current_profile_role() = 'teacher');
