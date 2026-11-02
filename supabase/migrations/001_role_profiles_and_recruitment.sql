-- RecruitFlow profile additions for the EXISTING AdvancedReactApp schema.
-- Existing public.profiles, public.companies, public.jobs, and public.applications
-- are intentionally reused; this migration does not recreate or replace them.

alter table public.companies
  add column if not exists website text,
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists location text,
  add column if not exists linkedin_url text,
  add column if not exists phone text,
  add column if not exists hiring_focus text;

create table if not exists public.candidate_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text not null,
  location text,
  experience_years integer check (experience_years is null or experience_years between 0 and 60),
  employment_type text not null default 'Full-time',
  skills text[] not null default '{}',
  summary text,
  linkedin_url text,
  portfolio_url text,
  resume_url text,
  updated_at timestamptz not null default now()
);

create index if not exists candidate_profiles_location_idx on public.candidate_profiles (location);
alter table public.candidate_profiles enable row level security;

grant select, insert, update, delete on public.candidate_profiles to authenticated;

-- The existing insert policy allowed only candidate role creation. Onboarding
-- must also allow a signed-in user to create their own employer profile.
drop policy if exists "Candidates can create own profile" on public.profiles;
drop policy if exists "Users can create own role profile" on public.profiles;
create policy "Users can create own role profile" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and role in ('candidate', 'employer'));

drop policy if exists "Candidates manage their own candidate profile" on public.candidate_profiles;
create policy "Candidates manage their own candidate profile" on public.candidate_profiles
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'candidate')
  )
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'candidate')
  );

-- Existing company/job/application policies remain in place and continue to
-- control employer and candidate access to those rows.
