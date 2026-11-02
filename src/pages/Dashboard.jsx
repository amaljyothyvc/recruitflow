import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import JobPostModal from "./JobPostModal";

const STATUS = {
  submitted: { label: "Submitted", color: "#176da3" },
  interviewing: { label: "Interviewing", color: "#30a28b" },
  offered: { label: "Offered", color: "#d99a46" },
  rejected: { label: "Not selected", color: "#9aaebd" },
};
const RANGES = { "7d": 7, "30d": 30, "90d": 90 };

function buildSeries(records, range) {
  const days = RANGES[range] || 30;
  const count = days === 7 ? 7 : 6;
  const bucketDays = days / count;
  const beginning = new Date();
  beginning.setDate(beginning.getDate() - days + 1);
  beginning.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(beginning);
    start.setDate(beginning.getDate() + Math.floor(index * bucketDays));
    const end = new Date(start);
    end.setDate(start.getDate() + Math.ceil(bucketDays));
    return {
      label: days === 7
        ? start.toLocaleDateString(undefined, { weekday: "short" })
        : start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: records.filter((record) => {
        const date = new Date(record.created_at);
        return date >= start && date < end;
      }).length,
    };
  });
}

function ActivityLine({ records, range, onRangeChange, title, caption }) {
  const points = useMemo(() => buildSeries(records, range), [records, range]);
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const plotted = points.map((point, index) => ({
    ...point,
    x: 44 + index * (512 / Math.max(1, points.length - 1)),
    y: 148 - (point.value / maxValue) * 112,
  }));
  const line = plotted.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L ${plotted.at(-1)?.x || 556} 166 L ${plotted[0]?.x || 44} 166 Z`;
  const totalInRange = points.reduce((sum, point) => sum + point.value, 0);
  return (
    <section className="desk-panel desk-chart-panel">
      <div className="desk-panel-top">
        <div><span className="desk-overline">ACTIVITY SIGNAL</span><h2>{title}</h2><p>{caption}</p></div>
        <label className="desk-range">PERIOD<select aria-label="Chart date range" value={range} onChange={(event) => onRangeChange(event.target.value)}><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option></select></label>
      </div>
      <div className="desk-chart-summary"><strong>{totalInRange}</strong><span>{records.length ? `recorded in the last ${RANGES[range]} days` : "no activity yet"}</span><span className="desk-chart-key"><i /> {caption}</span></div>
      <div className="line-plot" role="img" aria-label={`${title} over the last ${RANGES[range]} days`}>
        <svg viewBox="0 0 600 194" preserveAspectRatio="none" aria-hidden="true">
          {[36, 74, 112, 150].map((y) => <line key={y} x1="40" x2="568" y1={y} y2={y} className="plot-gridline" />)}
          <path d={area} className="plot-area" />
          <path d={line} className="plot-line" />
          {plotted.map((point) => <g key={`${point.label}-${point.x}`}><circle cx={point.x} cy={point.y} r="4" className="plot-point" /><title>{point.label}: {point.value}</title></g>)}
        </svg>
        <div className="plot-labels">{plotted.map((point, index) => <span key={`${point.label}-${index}`}>{point.label}</span>)}</div>
      </div>
      {!records.length && <p className="desk-chart-note">When activity arrives, this line will show its pace across the selected period.</p>}
    </section>
  );
}

function StatusRail({ applications }) {
  const stages = Object.entries(STATUS).map(([key, value]) => ({ key, ...value, count: applications.filter((item) => item.status === key).length }));
  const total = applications.length;
  return (
    <section className="desk-panel desk-status-panel">
      <div className="desk-panel-top"><div><span className="desk-overline">YOUR PIPELINE</span><h2>Application journey</h2><p>Every application, by current stage</p></div><span className="desk-total-chip">{total} recent</span></div>
      {total ? <div className="journey-rail">{stages.map((stage, index) => <div className="journey-step" key={stage.key}><span className="journey-index">0{index + 1}</span><span className="journey-node" style={{ "--stage-color": stage.color }} /><strong>{stage.count}</strong><small>{stage.label}</small><div className="journey-track"><i style={{ width: `${total ? stage.count / total * 100 : 0}%`, background: stage.color }} /></div></div>)}</div> : <div className="desk-empty-inline"><span>Start by finding a role that fits.</span><small>Your application journey will take shape here.</small></div>}
    </section>
  );
}

function HiringFlow({ applications }) {
  const stages = Object.entries(STATUS).map(([key, value]) => ({ key, ...value, count: applications.filter((item) => item.status === key).length }));
  const total = applications.length;
  return (
    <section className="desk-panel hiring-flow-panel">
      <div className="desk-panel-top"><div><span className="desk-overline">HIRING FLOW</span><h2>Candidate movement</h2><p>Applicants across your current process</p></div><span className="desk-total-chip">{total} recent</span></div>
      {total ? <div className="hiring-flow-list">{stages.map((stage, index) => <div className="hiring-flow-row" key={stage.key}><span className="flow-step">0{index + 1}</span><span className="flow-name">{stage.label}</span><div className="flow-track"><i style={{ width: `${Math.max(stage.count ? 12 : 0, total ? stage.count / total * 100 : 0)}%`, background: stage.color }} /></div><strong>{stage.count}</strong></div>)}</div> : <div className="desk-empty-inline"><span>No candidate activity yet.</span><small>When applications arrive, your hiring flow will appear here.</small></div>}
      <div className="flow-footnote"><i /> Statuses reflect the application records currently in Supabase.</div>
    </section>
  );
}

function Metric({ label, value, note, symbol, tint }) {
  return <article className="desk-metric"><span className={`desk-metric-symbol ${tint}`}>{symbol}</span><span className="desk-metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function RecentActivity({ applications, total, candidate }) {
  const recent = applications.slice(0, 5);
  return (
    <section className="desk-panel desk-recent-panel">
      <div className="desk-panel-top"><div><span className="desk-overline">RECENT SIGNALS</span><h2>{candidate ? "Your latest applications" : "Recent candidate activity"}</h2><p>{candidate ? "A short list of what’s moving" : "The newest movement across your company roles"}</p></div><span className="desk-total-chip">{total} total</span></div>
      {recent.length ? <div className="desk-activity-list">{recent.map((application) => {
        const status = STATUS[application.status] || STATUS.submitted;
        const title = candidate ? application.job?.title || "Application" : application.job?.title || "Company role";
        return <article className="desk-activity-row" key={application.id}><span className="desk-activity-date">{new Date(application.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><span className="desk-activity-mark" style={{ "--stage-color": status.color }} /><div className="desk-activity-copy"><strong>{title}</strong><small>{candidate ? application.job?.location || "Job application" : "Applicant update"}</small></div><span className="desk-status-label" style={{ "--stage-color": status.color }}>{status.label}</span></article>;
      })}</div> : <div className="desk-empty-inline"><span>{candidate ? "Your next opportunity starts here." : "Your hiring space is ready."}</span><small>{candidate ? "Your applications will show here when you apply." : "New candidate activity will show here when someone applies."}</small></div>}
    </section>
  );
}

function RoleLedger({ jobs, applications }) {
  return (
    <section className="desk-panel role-ledger-panel">
      <div className="desk-panel-top"><div><span className="desk-overline">OPEN POSITIONS</span><h2>Role ledger</h2><p>Your company's live job inventory</p></div><span className="desk-total-chip">{jobs.length} loaded</span></div>
      {jobs.length ? <div className="role-ledger">{jobs.slice(0, 5).map((job, index) => {
        const applicantCount = applications.filter((application) => application.job_id === job.id).length;
        return <article className="role-ledger-row" key={job.id}><span className="role-ledger-index">{String(index + 1).padStart(2, "0")}</span><div className="role-ledger-title"><strong>{job.title}</strong><small>{[job.location || "Location flexible", job.employment_type || "Role"].join(" · ")}</small></div><span className={`role-state ${job.status}`}>{job.status}</span><span className="role-app-count"><strong>{applicantCount}</strong><small>applicants</small></span></article>;
      })}</div> : <div className="role-ledger-empty"><span className="ledger-dash">—</span><strong>No roles in the ledger yet</strong><small>Jobs linked to your company will appear here.</small></div>}
    </section>
  );
}

export default function Dashboard({ user, profile, onSignOut, onBrowseJobs }) {
  const [workspace, setWorkspace] = useState({ jobs: [], applications: [], details: profile.details, totalJobs: 0, totalApplications: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("30d");
  const [reloadKey, setReloadKey] = useState(0);
  const [postOpen, setPostOpen] = useState(false);
  const [postNotice, setPostNotice] = useState("");
  const candidate = profile.role === "candidate";
  const name = profile.full_name || user.email?.split("@")[0] || "there";

  useEffect(() => {
    let active = true;
    async function loadWorkspace() {
      setLoading(true);
      setError("");
      try {
        let jobs = [];
        let applications = [];
        let totalJobs = 0;
        let totalApplications = 0;
        if (candidate) {
          const { data, count, error: applicationError } = await supabase.from("applications").select("id,status,created_at,job:jobs(id,title,location,employment_type)", { count: "exact" }).eq("candidate_id", user.id).order("created_at", { ascending: false }).limit(200);
          if (applicationError) throw applicationError;
          applications = data || [];
          totalApplications = count ?? applications.length;
        } else {
          const { data: jobRows, count: jobsCount, error: jobsError } = await supabase.from("jobs").select("id,title,status,location,employment_type,created_at", { count: "exact" }).eq("company_id", profile.details.id).order("created_at", { ascending: false }).limit(1000);
          if (jobsError) throw jobsError;
          jobs = jobRows || [];
          totalJobs = jobsCount ?? jobs.length;
          const { data, count, error: applicationError } = await supabase.from("applications").select("id,status,created_at,job_id,candidate_id,job:jobs!inner(title,company_id)", { count: "exact" }).eq("job.company_id", profile.details.id).order("created_at", { ascending: false }).limit(300);
          if (applicationError) throw applicationError;
          applications = data || [];
          totalApplications = count ?? applications.length;
        }
        if (active) setWorkspace({ jobs, applications, details: profile.details, totalJobs, totalApplications });
      } catch (loadError) {
        if (active) setError(loadError.message || "Workspace data could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadWorkspace();
    return () => { active = false; };
  }, [candidate, profile.details, user.id, reloadKey]);

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const monthLabel = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const applications = workspace.applications;
  const interviews = applications.filter((item) => item.status === "interviewing").length;
  const offers = applications.filter((item) => item.status === "offered").length;
  const rejected = applications.filter((item) => item.status === "rejected").length;
  const openJobs = workspace.jobs.filter((job) => job.status === "open").length;
  const displayCompany = workspace.details.name || "Your company";

  function handleJobCreated(status) {
    setPostOpen(false);
    setPostNotice(status === "open" ? "Role published — candidates can now find it on the open jobs board." : "Draft saved — it will appear to candidates when you publish it.");
    setReloadKey((current) => current + 1);
  }

  return (
    <main className={`desk-app ${candidate ? "candidate-desk" : "employer-desk"}`}>
      <header className="desk-topbar">
        <a className="desk-brand" href="#workspace" onClick={(event) => event.preventDefault()}><span className="desk-brand-mark">R</span><span>Recruit<span>Flow</span></span></a>
        <div className="desk-top-context"><span className="desk-context-rule" /><span>{candidate ? "CANDIDATE SPACE" : displayCompany.toUpperCase()}</span><span className="desk-context-role">STAGE 5 / 5</span></div>
        <div className="desk-top-actions"><span className="desk-session-dot"><i /> PRIVATE WORKSPACE</span><button className="desk-logout" type="button" onClick={onSignOut}>Sign out <span>↗</span></button></div>
      </header>

      <div className="desk-content">
        <section className="desk-hero">
          <div className="desk-hero-main"><span className="desk-overline">{candidate ? "YOUR NEXT CHAPTER" : "YOUR HIRING ROOM"} <b>·</b> {monthLabel.toUpperCase()}</span><h1>{candidate ? <>A little progress,<br /><em>a lot of possibility.</em></> : <>Build your team<br /><em>with intention.</em></>}</h1><p>{candidate ? `Good to see you, ${name}. Here’s how your search is moving.` : `${displayCompany}, here’s a clear view of the roles and people in motion.`}</p><div className="desk-date-stamp"><span className="date-stamp-day">{today.toLocaleDateString(undefined, { day: "2-digit" })}</span><span><strong>{today.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase()}</strong><small>{dateLabel}</small></span></div>{candidate ? <button type="button" className="desk-explore-jobs" onClick={onBrowseJobs}>Explore all open jobs <span>↗</span></button> : <button type="button" className="desk-explore-jobs desk-post-role-button" onClick={() => { setPostNotice(""); setPostOpen(true); }}>Post a role <span>+</span></button>}</div>
          <div className="desk-hero-aside"><div className="desk-orbit orbit-one" /><div className="desk-orbit orbit-two" /><div className="desk-orbit-center"><span>{candidate ? "APPLICATIONS" : "OPEN ROLES"}</span><strong>{candidate ? workspace.totalApplications : openJobs}</strong><small>{candidate ? "your search, tracked" : `${workspace.totalJobs} total roles`}</small></div><span className="orbit-caption">{candidate ? "YOUR MOMENTUM" : "HIRING MOMENTUM"}</span></div>
        </section>

        {error && <div className="desk-error" role="alert"><strong>Some workspace data could not load.</strong> {error} <span>Confirm the Supabase migration has been applied.</span></div>}
        {!candidate && postNotice && <div className="desk-post-notice" role="status">{postNotice}<button type="button" onClick={() => setPostNotice("")} aria-label="Dismiss message">×</button></div>}

        {candidate ? <>
          <section className="desk-metric-band" aria-label="Candidate metrics"><Metric label="In motion" value={workspace.totalApplications} note="applications total" symbol="↗" tint="blue" /><Metric label="Conversations" value={interviews} note="interviewing" symbol="◷" tint="teal" /><Metric label="Opportunities" value={offers} note="offers received" symbol="✳" tint="amber" /><Metric label="Closed loop" value={rejected} note="not selected" symbol="—" tint="slate" /></section>
          <div className="desk-layout candidate-layout">
            <div className="desk-primary-column"><ActivityLine records={applications} range={range} onRangeChange={setRange} title="Your search rhythm" caption="Applications submitted" /><StatusRail applications={applications} /></div>
            <aside className="desk-secondary-column"><section className="desk-panel candidate-card"><div className="candidate-card-top"><span className="candidate-monogram">{name.slice(0, 1).toUpperCase()}</span><span className="candidate-live">PROFILE LIVE</span></div><span className="desk-overline">YOUR PROFILE</span><h2>{workspace.details.headline}</h2><p>{workspace.details.location || "Location not added"}{workspace.details.experience_years != null ? ` · ${workspace.details.experience_years} years’ experience` : ""}</p><div className="candidate-skill-set">{(workspace.details.skills || []).slice(0, 5).map((skill) => <span key={skill}>{skill}</span>)}</div><div className="candidate-card-foot"><span>WORK PREFERENCE</span><strong>{workspace.details.employment_type || "Flexible"}</strong></div></section><RecentActivity applications={applications} total={workspace.totalApplications} candidate /></aside>
          </div>
        </> : <>
          <section className="desk-metric-band" aria-label="Employer metrics"><Metric label="Positions" value={openJobs} note={`${workspace.totalJobs} total in ledger`} symbol="▦" tint="blue" /><Metric label="People in view" value={workspace.totalApplications} note="applications received" symbol="◎" tint="teal" /><Metric label="In conversation" value={interviews} note="interviewing" symbol="◷" tint="amber" /><Metric label="Offers extended" value={offers} note="offered" symbol="✳" tint="slate" /></section>
          <div className="desk-layout employer-layout">
            <div className="desk-primary-column"><RoleLedger jobs={workspace.jobs} applications={applications} /><ActivityLine records={applications} range={range} onRangeChange={setRange} title="Hiring cadence" caption="Applications received" /></div>
            <aside className="desk-secondary-column"><section className="desk-panel company-dossier"><div className="dossier-mark">{displayCompany.slice(0, 1).toUpperCase()}</div><span className="desk-overline">COMPANY DOSSIER</span><h2>{displayCompany}</h2><p className="dossier-meta">{[workspace.details.industry, workspace.details.location].filter(Boolean).join(" · ") || "Add a location and industry to your company profile."}</p><div className="dossier-divider" /><span className="desk-overline">YOUR HIRING FOCUS</span><p className="dossier-focus">{workspace.details.hiring_focus || "Your hiring focus will appear here."}</p><a className="dossier-link" href={workspace.details.website || "#company"} onClick={(event) => { if (!workspace.details.website) event.preventDefault(); }} target={workspace.details.website ? "_blank" : undefined} rel="noreferrer">{workspace.details.website ? "Visit company site" : "Company profile"}<span>↗</span></a></section><HiringFlow applications={applications} /></aside>
          </div>
          <RecentActivity applications={applications} total={workspace.totalApplications} />
        </>}
        {!candidate && postOpen && <JobPostModal company={profile.details} onClose={() => setPostOpen(false)} onCreated={handleJobCreated} />}
        {loading && <div className="desk-loading">Syncing your latest workspace activity…</div>}
        <footer className="desk-footer"><span>© {new Date().getFullYear()} RecruitFlow</span><span>{candidate ? "Your search, thoughtfully organized." : "Hiring, made more deliberate."}</span><span>UPDATED {today.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span></footer>
      </div>
    </main>
  );
}
