# RecruitFlow

RecruitFlow is a React + Vite + Supabase hiring workspace for Candidates and Employers. It includes email/password authentication, five-stage role onboarding, distinct role dashboards, analytics, an employer job composer, and a searchable Candidate jobs board.

## Configure Supabase

Create a local `.env.local` in the project root (never commit it):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use only the public/publishable client key in the browser app. Never put a Supabase `service_role` key in a `VITE_` variable or frontend code. `.env` files are ignored by Git.

The app is designed for the existing Supabase schema with `profiles`, `companies`, `jobs`, and `applications`. The additive migration at `supabase/migrations/001_role_profiles_and_recruitment.sql` was applied to the connected Supabase project. It extends company profile fields, creates `candidate_profiles` with row-level security, and adjusts profile insert permissions; it does not recreate the existing jobs or applications tables. If you use another Supabase project, review and apply the migration there first.

For direct access immediately after account creation, turn off **Confirm email** for the Email auth provider in Supabase. Keep the Email provider itself enabled. Returning users sign in and are routed to their saved role workspace.

## User journey and features

1. A user creates an account or signs in on the same Register page.
2. A signed-in user chooses Candidate or Employer.
3. They enter essential details and complete role-specific profile fields.
4. They review and save their profile.
5. They enter the matching Candidate or Employer dashboard.

Candidate and Employer dashboards read each user's role-appropriate data from Supabase and include interactive chart ranges, activity summaries, and honest empty states. Employers can create a job through a three-stage composer: role essentials, a clear role brief, and review/publish or save as draft. Candidates can search and filter open jobs on the jobs board. Extra job-posting details that do not have dedicated columns in the existing schema are stored in the job description text.

The app does not yet include candidate application submission, resume file upload, or an employer applicant-management workflow.

## Development

```sh
npm ci
npm run dev
```

Production checks:

```sh
npm run lint
npm run build
```
