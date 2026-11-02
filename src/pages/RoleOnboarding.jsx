import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const initialCandidate = {
  headline: "", location: "", experience_years: "", employment_type: "Full-time",
  skills: "", summary: "", linkedin_url: "", portfolio_url: "", resume_url: "",
};
const initialEmployer = {
  company_name: "", website: "", industry: "", company_size: "", location: "",
  description: "", linkedin_url: "", phone: "", hiring_focus: "",
};

export default function RoleOnboarding({ user, onComplete }) {
  const [role, setRole] = useState("");
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || "");
  const [candidate, setCandidate] = useState(initialCandidate);
  const [employer, setEmployer] = useState(initialEmployer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(setter, key, value) {
    setter((current) => ({ ...current, [key]: value }));
  }

  function nextStep() {
    setError("");
    if (step === 1 && !role) return;
    if (step === 2) {
      if (!fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (role === "candidate" && !candidate.headline.trim()) {
        setError("Add a professional headline to continue.");
        return;
      }
      if (role === "employer" && !employer.company_name.trim()) {
        setError("Enter your company name to continue.");
        return;
      }
    }
    if (step === 3 && role === "candidate" && candidate.experience_years !== "") {
      const experience = Number(candidate.experience_years);
      if (!Number.isInteger(experience) || experience < 0 || experience > 60) {
        setError("Enter experience as a whole number from 0 to 60.");
        return;
      }
    }
    setStep((current) => Math.min(4, current + 1));
  }

  async function saveProfile() {
    setBusy(true);
    setError("");
    try {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        role,
        full_name: fullName.trim(),
      });
      if (profileError) throw profileError;

      if (role === "candidate") {
        const values = {
          user_id: user.id,
          ...candidate,
          experience_years: candidate.experience_years === "" ? null : Number(candidate.experience_years),
          skills: candidate.skills.split(",").map((item) => item.trim()).filter(Boolean),
        };
        const { error: detailError } = await supabase.from("candidate_profiles").upsert(values);
        if (detailError) throw detailError;
      } else {
        const { data: company, error: lookupError } = await supabase.from("companies").select("id").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (lookupError) throw lookupError;
        const { company_name, ...companyDetails } = employer;
        const companyValues = { ...companyDetails, name: company_name.trim(), description: employer.description || "" };
        const result = company
          ? await supabase.from("companies").update(companyValues).eq("id", company.id)
          : await supabase.from("companies").insert({ ...companyValues, owner_id: user.id });
        if (result.error) throw result.error;
      }
      onComplete({ role, full_name: fullName.trim(), ...(role === "candidate" ? candidate : employer) });
    } catch (err) {
      setError(err.message || "We couldn’t save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const stageLabels = ["Your role", "The essentials", "Your profile", "Review", "Dashboard"];
  const stageIndex = step - 1;
  const stageTitle = role === "candidate" ? "Candidate" : "Employer";
  const candidateSkills = candidate.skills.split(",").map((skill) => skill.trim()).filter(Boolean);

  return (
    <main className="onboard-page">
      <div className="onboard-top">
        <a className="brand-lockup" href="#home" onClick={(event) => event.preventDefault()}><span className="brand-mark">R</span> RecruitFlow</a>
        <span className="step-label">STAGE {step} OF 5 <span className="step-current">· {stageLabels[stageIndex]}</span></span>
      </div>
      <div className="stage-progress" aria-label={`Stage ${step} of 5`}>
        {stageLabels.map((label, index) => <div className={`stage-segment ${index < step ? "complete" : ""} ${index === step - 1 ? "current" : ""}`} key={label}><span /><small>{label}</small></div>)}
      </div>

      <div className="onboard-layout">
        <aside className="onboard-aside">
          <span className="eyebrow">YOUR WORKSPACE, YOUR WAY</span>
          <h1>{step === 1 ? "Start with the path that fits you." : step === 4 ? "One last look before you begin." : role === "candidate" ? "Make your next move easier." : "Build a stronger hiring presence."}</h1>
          <p>{step === 1 ? "We’ll shape your RecruitFlow workspace around what you’re here to do." : step === 4 ? "Check your details. You can refine your profile any time." : role === "candidate" ? "A clear profile helps teams understand your strengths and what you’re looking for." : "A thoughtful company profile gives candidates a better sense of your team."}</p>
          <div className="onboard-assurance"><span className="assurance-dot" /> Your profile stays in your control</div>
          <div className="onboard-stage-note"><strong>STAGE {step} / 5</strong><span>{stageLabels[stageIndex]}</span></div>
        </aside>

        <section className="onboard-card">
          {step === 1 && <>
            <div className="section-kicker">CHOOSE YOUR ACCOUNT TYPE</div>
            <h2>How will you use RecruitFlow?</h2>
            <p className="muted-copy">Choose the workspace that matches what you want to do.</p>
            <div className="role-options">
              <button type="button" className={`role-option ${role === "candidate" ? "selected" : ""}`} onClick={() => setRole("candidate")}>
                <span className="role-icon candidate-icon">↗</span><span><strong>I’m a candidate</strong><small>Discover roles and manage applications.</small></span><span className="radio-dot" />
              </button>
              <button type="button" className={`role-option ${role === "employer" ? "selected" : ""}`} onClick={() => setRole("employer")}>
                <span className="role-icon employer-icon">▦</span><span><strong>I’m an employer</strong><small>Represent a company and build a team.</small></span><span className="radio-dot" />
              </button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button full-button" disabled={!role} onClick={nextStep}>Continue <span>→</span></button>
          </>}

          {step === 2 && <>
            <button type="button" className="back-button" onClick={() => setStep(1)}>← Change account type</button>
            <div className="section-kicker">{stageTitle.toUpperCase()} · THE ESSENTIALS</div>
            <h2>Let’s start with the basics.</h2>
            <p className="muted-copy">This helps personalize your {role} workspace.</p>
            <div className="form-grid">
              <label className="field wide-field">Your full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" placeholder="e.g. Jordan Morgan" /></label>
              {role === "candidate" ? <label className="field wide-field">Professional headline<input value={candidate.headline} onChange={(e) => update(setCandidate, "headline", e.target.value)} required placeholder="e.g. Product designer focused on fintech" /><span className="field-hint">A short line about your work and strengths.</span></label> : <label className="field wide-field">Company name<input value={employer.company_name} onChange={(e) => update(setEmployer, "company_name", e.target.value)} required placeholder="Company or organization" /></label>}
              <div className="account-email wide-field"><span className="account-email-icon">@</span><span><small>ACCOUNT EMAIL</small><strong>{user.email}</strong></span><span className="verified-mark">✓</span></div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions"><button className="secondary-button" onClick={() => setStep(1)}>Back</button><button className="primary-button" onClick={nextStep}>Continue <span>→</span></button></div>
          </>}

          {step === 3 && <>
            <button type="button" className="back-button" onClick={() => setStep(2)}>← Edit essentials</button>
            <div className="section-kicker">{stageTitle.toUpperCase()} · PROFILE DETAILS</div>
            <h2>{role === "candidate" ? "Add the details teams look for." : "Tell candidates about your company."}</h2>
            <p className="muted-copy">Share the details that will make your workspace more useful. You can leave optional fields blank.</p>
            <div className="form-grid">
              {role === "candidate" ? <>
                <label className="field">Location<input value={candidate.location} onChange={(e) => update(setCandidate, "location", e.target.value)} placeholder="City, country or remote" /></label>
                <label className="field">Years of experience<input type="number" min="0" max="60" value={candidate.experience_years} onChange={(e) => update(setCandidate, "experience_years", e.target.value)} placeholder="e.g. 5" /></label>
                <label className="field">Work preference<select value={candidate.employment_type} onChange={(e) => update(setCandidate, "employment_type", e.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Flexible</option></select></label>
                <label className="field wide-field">Skills <span className="field-hint">Separate skills with commas</span><input value={candidate.skills} onChange={(e) => update(setCandidate, "skills", e.target.value)} placeholder="Product design, Figma, user research" /></label>
                <label className="field wide-field">Professional summary<textarea rows="3" value={candidate.summary} onChange={(e) => update(setCandidate, "summary", e.target.value)} placeholder="A short introduction and what you’re looking for" /></label>
                <label className="field">LinkedIn profile<input type="url" value={candidate.linkedin_url} onChange={(e) => update(setCandidate, "linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/…" /></label>
                <label className="field">Portfolio URL<input type="url" value={candidate.portfolio_url} onChange={(e) => update(setCandidate, "portfolio_url", e.target.value)} placeholder="https://…" /></label>
                <label className="field wide-field">Resume link <span className="field-hint">Optional URL; file upload is not enabled yet</span><input type="url" value={candidate.resume_url} onChange={(e) => update(setCandidate, "resume_url", e.target.value)} placeholder="Link to your resume" /></label>
              </> : <>
                <label className="field">Company website<input type="url" value={employer.website} onChange={(e) => update(setEmployer, "website", e.target.value)} placeholder="https://…" /></label>
                <label className="field">Industry<input value={employer.industry} onChange={(e) => update(setEmployer, "industry", e.target.value)} placeholder="e.g. Healthcare technology" /></label>
                <label className="field">Team size<select value={employer.company_size} onChange={(e) => update(setEmployer, "company_size", e.target.value)}><option value="">Select team size</option><option>1–10</option><option>11–50</option><option>51–200</option><option>201–500</option><option>501–1,000</option><option>1,000+</option></select></label>
                <label className="field">Headquarters / location<input value={employer.location} onChange={(e) => update(setEmployer, "location", e.target.value)} placeholder="City, country or remote" /></label>
                <label className="field wide-field">About the company<textarea rows="3" value={employer.description} onChange={(e) => update(setEmployer, "description", e.target.value)} placeholder="What does your company do? What makes it a great place to work?" /></label>
                <label className="field">LinkedIn company page<input type="url" value={employer.linkedin_url} onChange={(e) => update(setEmployer, "linkedin_url", e.target.value)} placeholder="https://linkedin.com/company/…" /></label>
                <label className="field">Contact phone<input type="tel" value={employer.phone} onChange={(e) => update(setEmployer, "phone", e.target.value)} placeholder="Optional" /></label>
                <label className="field wide-field">Hiring focus<input value={employer.hiring_focus} onChange={(e) => update(setEmployer, "hiring_focus", e.target.value)} placeholder="Roles, skills, or teams you’re building" /></label>
              </>}
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions"><button className="secondary-button" onClick={() => setStep(2)}>Back</button><button className="primary-button" onClick={nextStep}>Review profile <span>→</span></button></div>
          </>}

          {step === 4 && <>
            <button type="button" className="back-button" onClick={() => setStep(3)}>← Edit profile details</button>
            <div className="section-kicker">STAGE 4 · REVIEW & COMPLETE</div>
            <h2>Your {role} workspace is ready.</h2>
            <p className="muted-copy">Review your information below. We’ll save your profile and open your dedicated dashboard.</p>
            <div className="review-card"><div className="review-card-top"><div className={`review-avatar ${role}`}>{(role === "candidate" ? fullName : employer.company_name).trim().slice(0, 1).toUpperCase()}</div><div><strong>{role === "candidate" ? fullName : employer.company_name}</strong><span>{role === "candidate" ? candidate.headline : [employer.industry, employer.location].filter(Boolean).join(" · ") || "Employer account"}</span></div><button className="review-edit" type="button" onClick={() => setStep(role === "candidate" && !candidate.headline ? 2 : 3)}>Edit</button></div>
              <div className="review-divider" />
              <div className="review-grid"><div><small>ACCOUNT TYPE</small><strong>{stageTitle}</strong></div><div><small>EMAIL</small><strong>{user.email}</strong></div>{role === "candidate" ? <><div><small>LOCATION</small><strong>{candidate.location || "Not added"}</strong></div><div><small>EXPERIENCE</small><strong>{candidate.experience_years ? `${candidate.experience_years} years` : "Not added"}</strong></div><div className="review-wide"><small>SKILLS</small><div className="skill-chips">{candidateSkills.length ? candidateSkills.slice(0, 6).map((skill) => <span key={skill}>{skill}</span>) : <strong>Not added</strong>}</div></div></> : <><div><small>COMPANY SIZE</small><strong>{employer.company_size || "Not added"}</strong></div><div><small>WEBSITE</small><strong>{employer.website || "Not added"}</strong></div><div className="review-wide"><small>HIRING FOCUS</small><strong>{employer.hiring_focus || "Not added"}</strong></div></>}</div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="form-actions"><span className="save-note">Your details can be updated later.</span><button className="primary-button" type="button" onClick={saveProfile} disabled={busy}>{busy ? "Saving profile…" : "Complete and open dashboard"} <span>→</span></button></div>
          </>}
        </section>
      </div>
    </main>
  );
}
