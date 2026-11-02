# RecruitFlow role onboarding and dashboards

## Existing app and database integration

The uploaded source is a Vite/React app with Supabase authentication. The active Supabase project already contains `public.profiles`, `public.companies`, `public.jobs`, and `public.applications`, with RLS enabled. Employers' jobs are linked through `jobs.company_id`; the existing application statuses are `submitted`, `interviewing`, `offered`, and `rejected`. Reuse these tables and policies rather than creating parallel jobs or application tables.

After Supabase authentication, load the signed-in user's saved profile. Users without a role select Candidate or Employer and fill the corresponding details. Candidates save to the additive `candidate_profiles` table. Employers save to the existing `companies` table by `owner_id`; a non-destructive migration adds the requested company fields. Profile routing opens `/candidate/dashboard` or `/employer/dashboard` based on the stored role. The same Register component retains the separate sign-in/create-account modes.

Candidate profile fields: full name, professional headline, location, years of experience, employment preference, skills, short professional summary, LinkedIn URL, portfolio URL, and optional resume URL. Employer fields: contact name, company name, website, industry, team size, headquarters/location, company description, LinkedIn URL, contact phone, and hiring focus. Candidate profiles require a headline; employer profiles require the company name. Optional profile links are plain URLs; no files are stored by this implementation.

The Candidate dashboard queries that candidate's applications and uses the existing statuses. The Employer dashboard queries jobs for the employer's company and related applications. Both have role-specific copy, metrics, recent activity, responsive chart cards, and truthful empty states. Charts are SVG/CSS visuals with no chart dependency. Dashboard charts use recent records; exact total application counts are requested from Supabase. Do not invent activity for empty accounts.

## Project structure

- `src/App.jsx`: auth session, saved-profile lookup, role onboarding/dashboard routing, sign-out.
- `src/pages/Register.jsx`: existing combined register/sign-in entry point.
- `src/pages/RoleOnboarding.jsx`: role selection and candidate/company profile capture.
- `src/pages/Dashboard.jsx`: candidate/employer dashboard variants, Supabase queries, charts, and activity.
- `src/App.css`: app shell, onboarding, dashboard, cards, and responsive chart styles.
- `src/index.css`: global typography and layout reset.
- `supabase/migrations/001_role_profiles_and_recruitment.sql`: additive company fields, candidate profile table/RLS, and an insert-policy update for either role.

## Design

Three candidate styles considered: (A) RecruitFlow's existing calm blue hiring-product identity, 0.06 probability; (B) high-contrast editorial job-board monochrome, 0.04; (C) vivid neon-gradient startup dashboard, 0.03. Choose A to maintain continuity with the supplied registration page.

**Design Movement:** contemporary SaaS product design with a restrained editorial hiring tone.

**Core Principles:** clear role-specific hierarchy; data-first dashboards with truthful empty states; approachable forms with visible progress; responsive accessibility.

**Color Philosophy:** deep ink and restrained RecruitFlow blue communicate trust, while pale cool backgrounds keep information-dense surfaces calm. Teal is reserved for positive status.

**Layout Paradigm:** persistent left navigation on desktop with a compact top header; stacked cards and horizontally scrollable chart containers on small screens.

**Signature Elements:** soft blue icon tiles; compact metric cards with small trend/period labels; low-ink chart gridlines and role-color accents.

**Interaction Philosophy:** role selection is explicit, form steps retain entered values, and every save/loading/error/empty state is visible.

**Animation:** brief, subtle entry transitions only; no looping movement in charts or essential controls.

**Typography System:** DM Sans for interface text and Manrope for display headings, continuing the supplied registration page.

**Brand Essence:** a focused workspace for people building teams and people finding their next role; clear, capable, supportive.

**Brand Voice:** direct, encouraging, and specific. Example: “Your next chapter starts with a profile.” “See every application in one place.”

**Wordmark & Logo:** retain the existing RecruitFlow identity and avoid inventing a replacement mark.

**Signature Brand Color:** RecruitFlow blue (`#176da3`).

## Data and limits

The candidate/employer profile migration is additive to the inspected database. It has not been executed against Supabase; it must be applied before onboarding. The existing Supabase URL and publishable key belong in the user's local `.env.local` and are intentionally excluded from the delivered project ZIP. No service-role key is used in browser code.
