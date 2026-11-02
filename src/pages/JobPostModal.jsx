import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const initialForm = {
  title: "", department: "", location: "", workplace: "Hybrid", employment_type: "Full-time",
  seniority: "Mid-level", experience_min: "", experience_max: "", openings: "1",
  summary: "", responsibilities: "", requirements: "", nice_to_have: "", benefits: "",
  salary_min: "", salary_max: "", salary_currency: "", salary_period: "Yearly", status: "open",
};
const STEPS = ["Role essentials", "The role brief", "Review & publish"];
const CURRENCIES = ["USD", "INR", "EUR", "GBP", "CAD", "AUD", "AED"];

function bullets(text) {
  return text.trim().split("\n").map((line) => line.trim()).filter(Boolean).map((line) => `• ${line.replace(/^[-•]\s*/, "")}`).join("\n");
}

function payDisplay(form) {
  if (!form.salary_min && !form.salary_max) return "Compensation not listed";
  if (!form.salary_currency) return "Choose a currency to preview pay";
  const currency = form.salary_currency;
  const format = (value) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value));
  const range = form.salary_min && form.salary_max
    ? `${format(form.salary_min)} – ${format(form.salary_max)}`
    : form.salary_min ? `${format(form.salary_min)}+` : `Up to ${format(form.salary_max)}`;
  return `${range} / ${form.salary_period.toLowerCase()}`;
}

export default function JobPostModal({ company, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showRequiredHints, setShowRequiredHints] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  }

  function continueToBrief() {
    if (!form.title.trim() || !form.department.trim() || !form.location.trim()) {
      setError("");
      setShowRequiredHints(true);
      return;
    }
    if (!Number.isInteger(Number(form.openings)) || Number(form.openings) < 1 || Number(form.openings) > 100) {
      setError("Enter a number of openings between 1 and 100.");
      return;
    }
    const experienceMin = form.experience_min === "" ? null : Number(form.experience_min);
    const experienceMax = form.experience_max === "" ? null : Number(form.experience_max);
    if ([experienceMin, experienceMax].some((value) => value !== null && (!Number.isInteger(value) || value < 0 || value > 60))) {
      setError("Experience must be a whole number between 0 and 60 years.");
      return;
    }
    if (experienceMin !== null && experienceMax !== null && experienceMin > experienceMax) {
      setError("The maximum experience must be at least the minimum experience.");
      return;
    }
    setError("");
    setShowRequiredHints(false);
    setStep(2);
  }

  function continueToReview() {
    if (!form.summary.trim() || !form.responsibilities.trim() || !form.requirements.trim()) {
      setError("");
      setShowRequiredHints(true);
      return;
    }
    setError("");
    setShowRequiredHints(false);
    setStep(3);
  }

  async function publish(event) {
    event.preventDefault();
    setError("");
    const min = form.salary_min === "" ? null : Number(form.salary_min);
    const max = form.salary_max === "" ? null : Number(form.salary_max);
    if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0))) {
      setError("Salary values must be valid non-negative numbers.");
      return;
    }
    if (min !== null && max !== null && min > max) {
      setError("The maximum salary must be at least the minimum salary.");
      return;
    }
    if ((min !== null || max !== null) && !form.salary_currency) {
      setError("Choose a currency for the salary range.");
      return;
    }
    if (form.experience_min && form.experience_max && Number(form.experience_min) > Number(form.experience_max)) {
      setError("The maximum experience must be at least the minimum experience.");
      return;
    }

    const experience = form.experience_min || form.experience_max
      ? `Experience: ${form.experience_min || "0"}–${form.experience_max || "Flexible"} years`
      : "";
    const details = [
      `Department: ${form.department.trim()}`,
      `Level: ${form.seniority}`,
      `Work arrangement: ${form.workplace}`,
      experience,
      `Openings: ${form.openings || "1"}`,
      min !== null || max !== null ? `Compensation currency: ${form.salary_currency}` : "",
      min !== null || max !== null ? `Compensation period: ${form.salary_period}` : "",
      "",
      "ABOUT THE ROLE",
      form.summary.trim(),
      "",
      "WHAT YOU'LL DO",
      bullets(form.responsibilities),
      "",
      "WHAT YOU BRING",
      bullets(form.requirements),
      form.nice_to_have.trim() ? "" : "",
      form.nice_to_have.trim() ? "NICE TO HAVE" : "",
      form.nice_to_have.trim() ? bullets(form.nice_to_have) : "",
      form.benefits.trim() ? "" : "",
      form.benefits.trim() ? "BENEFITS & SUPPORT" : "",
      form.benefits.trim() ? bullets(form.benefits) : "",
    ].filter((line, index, values) => line !== "" || (index > 0 && values[index - 1] !== "")).join("\n");

    setBusy(true);
    try {
      const { error: insertError } = await supabase.from("jobs").insert({
        company_id: company.id,
        title: form.title.trim(),
        description: details,
        location: form.location.trim(),
        employment_type: form.employment_type,
        salary_min: min,
        salary_max: max,
        status: form.status,
      });
      if (insertError) throw insertError;
      onCreated(form.status);
    } catch (insertError) {
      setError(insertError.message || "The role could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const companyName = company.name || "Your company";
  const currencyLabel = form.salary_currency || "Currency not selected";
  const experienceLabel = form.experience_min || form.experience_max
    ? `${form.experience_min || "0"}–${form.experience_max || "Flexible"} years’ experience`
    : "Experience flexible";

  return (
    <div className="post-job-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="post-job-modal job-composer" role="dialog" aria-modal="true" aria-labelledby="post-job-heading">
        <header className="post-job-heading">
          <div><span className="desk-overline">{companyName.toUpperCase()} · JOB COMPOSER</span><h2 id="post-job-heading">Create a role</h2><p>Build a clear, complete posting candidates can make a decision from.</p></div>
          <button type="button" className="post-job-close" onClick={() => !busy && onClose()} aria-label="Close job form">×</button>
        </header>
        <div className="composer-steps" aria-label={`Step ${step} of 3`}>
          {STEPS.map((label, index) => <div className={`composer-step ${index + 1 <= step ? "done" : ""} ${index + 1 === step ? "active" : ""}`} key={label}><i>{index + 1 < step ? "✓" : `0${index + 1}`}</i><span>{label}</span></div>)}
        </div>

        {step === 1 && <div className="composer-body">
          <div className="composer-section-heading"><span>01 / POSITION</span><h3>Define the opportunity.</h3><p>Start with the details candidates scan first.</p></div>
          <div className="composer-fields">
            <label className={`composer-field wide ${showRequiredHints && !form.title.trim() ? "needs-value" : ""}`}>Job title <b>*</b><input autoFocus maxLength={120} aria-invalid={showRequiredHints && !form.title.trim()} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Senior Product Designer" />{showRequiredHints && !form.title.trim() && <small className="composer-required-hint">Add the position title to continue.</small>}</label>
            <label className={`composer-field ${showRequiredHints && !form.department.trim() ? "needs-value" : ""}`}>Department <b>*</b><input aria-invalid={showRequiredHints && !form.department.trim()} value={form.department} onChange={(event) => update("department", event.target.value)} placeholder="e.g. Product & Design" />{showRequiredHints && !form.department.trim() && <small className="composer-required-hint">Choose a team or department.</small>}</label>
            <label className="composer-field">Seniority<select value={form.seniority} onChange={(event) => update("seniority", event.target.value)}><option>Entry-level</option><option>Junior</option><option>Mid-level</option><option>Senior</option><option>Lead</option><option>Manager</option><option>Director</option><option>Executive</option></select></label>
            <label className={`composer-field ${showRequiredHints && !form.location.trim() ? "needs-value" : ""}`}>Location <b>*</b><input aria-invalid={showRequiredHints && !form.location.trim()} value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="City, region, or Remote" />{showRequiredHints && !form.location.trim() && <small className="composer-required-hint">Add a city, region, or Remote.</small>}</label>
            <label className="composer-field">Work arrangement<select value={form.workplace} onChange={(event) => update("workplace", event.target.value)}><option>On-site</option><option>Hybrid</option><option>Remote</option></select></label>
            <label className="composer-field">Employment type<select value={form.employment_type} onChange={(event) => update("employment_type", event.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Flexible</option></select></label>
            <label className="composer-field">Number of openings<input type="number" min="1" max="100" value={form.openings} onChange={(event) => update("openings", event.target.value)} /></label>
            <label className="composer-field">Experience from <span>(years)</span><input type="number" min="0" max="60" value={form.experience_min} onChange={(event) => update("experience_min", event.target.value)} placeholder="e.g. 3" /></label>
            <label className="composer-field">Experience up to <span>(years)</span><input type="number" min="0" max="60" value={form.experience_max} onChange={(event) => update("experience_max", event.target.value)} placeholder="e.g. 6" /></label>
          </div>
          <div className="composer-footer"><span>Fields marked * are required.</span><button type="button" className="post-job-submit" onClick={continueToBrief}>Build the role brief <span>→</span></button></div>
        </div>}

        {step === 2 && <div className="composer-body">
          <div className="composer-section-heading"><span>02 / ROLE BRIEF</span><h3>Make the work tangible.</h3><p>Specific responsibilities and qualifications help candidates self-select.</p></div>
          <div className="composer-fields">
            <label className={`composer-field wide ${showRequiredHints && !form.summary.trim() ? "needs-value" : ""}`}>Role summary <b>*</b><textarea rows="3" maxLength={1800} aria-invalid={showRequiredHints && !form.summary.trim()} value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder="What is the purpose of this role? What will the person help the team achieve?" />{showRequiredHints && !form.summary.trim() ? <small className="composer-required-hint">Add a short introduction to the role.</small> : <small>2–4 sentences. Keep it direct and inclusive.</small>}</label>
            <label className={`composer-field wide ${showRequiredHints && !form.responsibilities.trim() ? "needs-value" : ""}`}>Key responsibilities <b>*</b><textarea rows="4" maxLength={3500} aria-invalid={showRequiredHints && !form.responsibilities.trim()} value={form.responsibilities} onChange={(event) => update("responsibilities", event.target.value)} placeholder="Own the product discovery process\nPartner with engineering and research\nPresent concepts to cross-functional teams" />{showRequiredHints && !form.responsibilities.trim() ? <small className="composer-required-hint">Add the main work this person will do.</small> : <small>Use one responsibility per line.</small>}</label>
            <label className={`composer-field wide ${showRequiredHints && !form.requirements.trim() ? "needs-value" : ""}`}>Required qualifications <b>*</b><textarea rows="4" maxLength={3500} aria-invalid={showRequiredHints && !form.requirements.trim()} value={form.requirements} onChange={(event) => update("requirements", event.target.value)} placeholder="4+ years in product design or a related field\nA portfolio showing end-to-end product work\nClear written and verbal communication" />{showRequiredHints && !form.requirements.trim() ? <small className="composer-required-hint">List the essential skills or experience.</small> : <small>Describe genuine requirements, not a wish list.</small>}</label>
            <label className="composer-field wide">Nice to have<textarea rows="3" maxLength={2200} value={form.nice_to_have} onChange={(event) => update("nice_to_have", event.target.value)} placeholder="Experience in an early-stage team\nFamiliarity with accessibility standards" /></label>
            <label className="composer-field wide">Benefits & support<textarea rows="3" maxLength={2200} value={form.benefits} onChange={(event) => update("benefits", event.target.value)} placeholder="Health and wellbeing support\nLearning budget\nFlexible working arrangements" /></label>
          </div>
          <div className="composer-footer"><button type="button" className="post-job-cancel" onClick={() => { setError(""); setStep(1); }}>← Back</button><span>Required fields: summary, responsibilities, qualifications.</span><button type="button" className="post-job-submit" onClick={continueToReview}>Review posting <span>→</span></button></div>
        </div>}

        {step === 3 && <form className="composer-body" onSubmit={publish}>
          <div className="composer-section-heading"><span>03 / FINAL CHECK</span><h3>Review before publishing.</h3><p>Check how the role will appear, then choose whether to publish now or save it as a draft.</p></div>
          <div className="composer-review-grid">
            <article className="role-live-preview"><div className="live-preview-top"><span className="preview-company-mark">{companyName.slice(0, 1).toUpperCase()}</span><div><strong>{companyName}</strong><small>{company.industry || "Company"}</small></div><span className="preview-live-badge">LIVE PREVIEW</span></div><span className="preview-department">{form.department} · {form.seniority}</span><h4>{form.title || "Untitled role"}</h4><p className="preview-company-meta">{form.location} · {form.workplace} · {form.employment_type}</p><div className="preview-tags"><span>{experienceLabel}</span><span>{form.openings || 1} opening{form.openings === "1" ? "" : "s"}</span></div><p className="preview-summary">{form.summary}</p><div className="preview-pay"><small>COMPENSATION</small><strong>{payDisplay(form)}</strong><span>{form.salary_currency ? `${currencyLabel} · ${form.salary_period.toLowerCase()}` : "Optional; not included in the job record."}</span></div></article>
            <aside className="publish-settings"><span className="desk-overline">COMPENSATION & VISIBILITY</span><div className="composer-fields salary-fields"><label className="composer-field">Minimum salary<input type="number" min="0" step="any" value={form.salary_min} onChange={(event) => update("salary_min", event.target.value)} placeholder="Optional" /></label><label className="composer-field">Maximum salary<input type="number" min="0" step="any" value={form.salary_max} onChange={(event) => update("salary_max", event.target.value)} placeholder="Optional" /></label><label className="composer-field">Currency<select value={form.salary_currency} onChange={(event) => update("salary_currency", event.target.value)}><option value="">Select currency</option>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></label><label className="composer-field">Pay period<select value={form.salary_period} onChange={(event) => update("salary_period", event.target.value)}><option>Yearly</option><option>Monthly</option><option>Hourly</option></select></label></div><div className="publish-choice"><button type="button" className={form.status === "open" ? "selected" : ""} onClick={() => update("status", "open")}><i /><span><strong>Publish now</strong><small>Visible on the Candidate jobs board.</small></span></button><button type="button" className={form.status === "draft" ? "selected" : ""} onClick={() => update("status", "draft")}><i /><span><strong>Save as draft</strong><small>Only visible to your company.</small></span></button></div></aside>
          </div>
          <div className="composer-footer"><button type="button" className="post-job-cancel" onClick={() => { setError(""); setStep(2); }}>← Edit role brief</button>{error && <div className="composer-validation compact" role="alert"><span>!</span><div><strong>One quick fix</strong><p>{error}</p></div></div>}<button type="submit" className="post-job-submit" disabled={busy}>{busy ? "Saving role…" : form.status === "open" ? "Publish open role" : "Save draft"}<span>{busy ? "…" : "↗"}</span></button></div>
        </form>}

        {error && step !== 3 && <div className="composer-validation composer-error" role="alert"><span>!</span><div><strong>One quick fix</strong><p>{error}</p></div></div>}
      </section>
    </div>
  );
}
