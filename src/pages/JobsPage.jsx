import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const PAGE_SIZE = 12;
const TYPES = ["All roles", "Full-time", "Part-time", "Contract", "Internship", "Flexible"];

function timeAgo(value) {
  const date = new Date(value);
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function salaryRange(job) {
  if (job.salary_min == null && job.salary_max == null) return "Compensation not listed";
  const currency = job.description?.match(/Compensation currency:\s*([A-Z]{3})/i)?.[1]?.toUpperCase();
  const period = job.description?.match(/Compensation period:\s*([A-Za-z]+)/i)?.[1]?.toLowerCase();
  const format = (amount) => {
    if (!currency) return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount);
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
    catch { return `${currency} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount)}`; }
  };
  const range = job.salary_min != null && job.salary_max != null
    ? `${format(job.salary_min)} – ${format(job.salary_max)}`
    : job.salary_min != null ? `${format(job.salary_min)}+` : `Up to ${format(job.salary_max)}`;
  return `${range}${period ? ` / ${period}` : " · salary range"}`;
}

function readBriefMeta(description = "") {
  const value = (label) => description.match(new RegExp(`^${label}:\\s*(.+)$`, "im"))?.[1]?.trim() || "";
  return { department: value("Department"), seniority: value("Level"), workplace: value("Work arrangement") };
}

export default function JobsPage({ profile, onBack, onSignOut }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("All roles");
  const [industry, setIndustry] = useState("All industries");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [expandedJob, setExpandedJob] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadAllOpenJobs() {
      setLoading(true);
      setError("");
      const rows = [];
      const batchSize = 500;
      let from = 0;
      try {
        while (true) {
          const { data, error: jobsError } = await supabase
            .from("jobs")
            .select("id,company_id,title,description,location,employment_type,salary_min,salary_max,created_at,company:companies(name,industry,location)")
            .eq("status", "open")
            .order("created_at", { ascending: false })
            .range(from, from + batchSize - 1);
          if (jobsError) throw jobsError;
          const batch = data || [];
          rows.push(...batch);
          if (batch.length < batchSize) break;
          from += batchSize;
        }
        if (active) setJobs(rows);
      } catch (loadError) {
        if (active) setError(loadError.message || "Could not load open jobs.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAllOpenJobs();
    return () => { active = false; };
  }, []);

  const industries = useMemo(() => ["All industries", ...new Set(jobs.map((job) => job.company?.industry).filter(Boolean).sort((a, b) => a.localeCompare(b)))], [jobs]);
  const filteredJobs = useMemo(() => {
    const words = query.trim().toLowerCase();
    const place = location.trim().toLowerCase();
    const filtered = jobs.filter((job) => {
      const company = job.company?.name || "";
      const searchable = `${job.title} ${company} ${job.company?.industry || ""} ${job.description || ""}`.toLowerCase();
      const matchesQuery = !words || searchable.includes(words);
      const matchesLocation = !place || `${job.location || ""} ${job.company?.location || ""}`.toLowerCase().includes(place);
      const matchesType = type === "All roles" || job.employment_type?.toLowerCase() === type.toLowerCase();
      const matchesIndustry = industry === "All industries" || job.company?.industry === industry;
      return matchesQuery && matchesLocation && matchesType && matchesIndustry;
    });
    return filtered.sort((a, b) => sort === "newest"
      ? new Date(b.created_at) - new Date(a.created_at)
      : (Number(b.salary_max || b.salary_min || 0) - Number(a.salary_max || a.salary_min || 0)));
  }, [jobs, query, location, type, industry, sort]);

  const pages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const visibleJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const candidateName = profile.full_name || "Candidate";
  const clearFilters = () => { setQuery(""); setLocation(""); setType("All roles"); setIndustry("All industries"); setSort("newest"); setPage(1); };

  return (
    <main className="jobs-app">
      <header className="jobs-topbar">
        <a className="desk-brand" href="#workspace" onClick={(event) => event.preventDefault()}><span className="desk-brand-mark">R</span><span>Recruit<span>Flow</span></span></a>
        <div className="jobs-breadcrumb"><button type="button" onClick={onBack}>Dashboard</button><span>/</span><strong>Explore jobs</strong></div>
        <div className="jobs-top-actions"><span className="jobs-user-name">{candidateName}</span><button type="button" className="desk-logout" onClick={onSignOut}>Sign out <span>↗</span></button></div>
      </header>

      <section className="jobs-hero">
        <div className="jobs-hero-orbit" aria-hidden="true"><i /><i /><i /><b>OPEN<br />ROLES</b></div>
        <div className="jobs-hero-copy"><span className="jobs-kicker"><i /> LIVE OPPORTUNITY BOARD</span><h1>Find work that<br /><em>moves you forward.</em></h1><p>Explore every open role in the RecruitFlow network. Filter for the work, place, and team that fit your next chapter.</p><button className="jobs-back-link" type="button" onClick={onBack}>← Back to your dashboard</button></div>
        <div className="jobs-hero-stats"><strong>{loading ? "…" : jobs.length}</strong><span>OPEN ROLES<br />IN THE NETWORK</span><i className="jobs-stat-line" /><small>LIVE · UPDATED WHEN YOU VISIT</small></div>
      </section>

      <section className="jobs-search-panel" aria-label="Search job listings">
        <label className="jobs-search-field"><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Job title, company, or keyword" aria-label="Search title, company, or keyword" /></label>
        <label className="jobs-search-field"><span>⌖</span><input value={location} onChange={(event) => { setLocation(event.target.value); setPage(1); }} placeholder="City, region, or remote" aria-label="Filter by location" /></label>
        <label className="jobs-sort-field"><span>SORT</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="newest">Most recent</option><option value="salary">Salary range</option></select></label>
      </section>

      <div className="jobs-workspace">
        <aside className="jobs-filter-rail">
          <div className="jobs-filter-heading"><span className="jobs-kicker">REFINE THE SEARCH</span><button type="button" onClick={clearFilters}>Reset</button></div>
          <section className="jobs-filter-group"><h2>Work type</h2><div className="jobs-type-list">{TYPES.map((item) => <button key={item} type="button" className={type === item ? "active" : ""} onClick={() => { setType(item); setPage(1); }}><span className="filter-radio" />{item}<small>{item === "All roles" ? jobs.length : jobs.filter((job) => job.employment_type?.toLowerCase() === item.toLowerCase()).length}</small></button>)}</div></section>
          <section className="jobs-filter-group"><h2>Industry</h2><select className="jobs-industry-select" value={industry} onChange={(event) => { setIndustry(event.target.value); setPage(1); }}>{industries.map((item) => <option key={item} value={item}>{item}</option>)}</select></section>
          <div className="jobs-filter-note"><span>✦</span><p>Your search is private. Listings are read directly from the live RecruitFlow jobs board.</p></div>
        </aside>

        <section className="jobs-results" aria-live="polite">
          <div className="jobs-results-head"><div><span className="jobs-kicker">THE OPEN BOARD</span><h2>{loading ? "Finding your next move" : `${filteredJobs.length} ${filteredJobs.length === 1 ? "role" : "roles"} to explore`}</h2><p>Open positions from companies in the RecruitFlow network.</p></div><span className="jobs-results-index">{String(Math.min(filteredJobs.length, (page - 1) * PAGE_SIZE + 1)).padStart(2, "0")} <i>—</i> {String(Math.min(filteredJobs.length, page * PAGE_SIZE)).padStart(2, "0")} <small>/ {filteredJobs.length}</small></span></div>
          {error && <div className="jobs-error" role="alert"><strong>Couldn’t load jobs.</strong> {error}</div>}
          {loading ? <div className="jobs-skeletons">{Array.from({ length: 3 }, (_, index) => <div className="job-skeleton" key={index}><i /><span /><span /><b /></div>)}</div> : visibleJobs.length ? <div className="jobs-list">{visibleJobs.map((job, index) => {
            const companyName = job.company?.name || "RecruitFlow company";
            const isExpanded = expandedJob === job.id;
            const briefMeta = readBriefMeta(job.description);
            return <article className={`job-opportunity ${isExpanded ? "expanded" : ""}`} key={job.id} style={{ "--job-index": index }}>
              <div className="job-card-index">{String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</div>
              <div className="job-company-mark">{companyName.slice(0, 1).toUpperCase()}</div>
              <div className="job-card-main"><div className="job-card-meta"><span>{companyName}</span>{briefMeta.department && <><i>·</i><span>{briefMeta.department}</span></>}{job.company?.industry && <><i>·</i><span>{job.company.industry}</span></>}<i>·</i><span>{timeAgo(job.created_at)}</span></div><h3>{job.title}</h3><div className="job-card-details"><span>⌖ {job.location || "Location not specified"}</span><span>◷ {job.employment_type || "Flexible"}</span>{briefMeta.workplace && <span className="job-meta-chip">{briefMeta.workplace}</span>}{briefMeta.seniority && <span className="job-meta-chip">{briefMeta.seniority}</span>}<span className="job-salary">↗ {salaryRange(job)}</span></div>{isExpanded && <p className="job-description">{job.description || "The employer has not added a detailed description yet."}</p>}</div>
              <button type="button" className="job-open-button" onClick={() => setExpandedJob(isExpanded ? null : job.id)} aria-expanded={isExpanded}>{isExpanded ? "Close details" : "View details"}<span>{isExpanded ? "−" : "↗"}</span></button>
            </article>;
          })}</div> : <div className="jobs-empty"><div className="jobs-empty-symbol">⌕</div><span className="jobs-kicker">NO MATCHES IN THIS VIEW</span><h3>{jobs.length ? "Try a wider search." : "The board is quiet for now."}</h3><p>{jobs.length ? "Remove a filter or try a broader title, company, or location." : "New open roles will appear here as employers publish them."}</p>{jobs.length > 0 && <button type="button" onClick={clearFilters}>Clear all filters</button>}</div>}
          {!loading && pages > 1 && <nav className="jobs-pagination" aria-label="Job result pages"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>← Previous</button><span>PAGE <strong>{page}</strong> OF {pages}</span><button type="button" onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page === pages}>Next →</button></nav>}
        </section>
      </div>
      <footer className="jobs-footer"><span>RECRUITFLOW · CANDIDATE SPACE</span><span>Curious minds find meaningful work.</span></footer>
    </main>
  );
}
