import { useCallback, useEffect, useState } from "react";
import Register from "./pages/Register";
import RoleOnboarding from "./pages/RoleOnboarding";
import Dashboard from "./pages/Dashboard";
import JobsPage from "./pages/JobsPage";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("loading");
  const [setupError, setSetupError] = useState("");

  const loadAccount = useCallback(async (user) => {
    if (!user) {
      setSession(null);
      setProfile(null);
      setSetupError("");
      setScreen("auth");
      return;
    }
    setSession({ user });
    setScreen("loading");
    setSetupError("");
    const { data, error } = await supabase.from("profiles").select("id, role, full_name").eq("id", user.id).maybeSingle();
    if (error) {
      setSetupError(error.message);
      setScreen("schema-error");
      return;
    }
    if (!data?.role) {
      setProfile(null);
      window.history.replaceState(null, "", "/setup");
      setScreen("onboarding");
      return;
    }
    const isCandidate = data.role === "candidate";
    const table = isCandidate ? "candidate_profiles" : "companies";
    const ownerColumn = isCandidate ? "user_id" : "owner_id";
    const detailQuery = supabase.from(table).select("*").eq(ownerColumn, user.id);
    const { data: details, error: detailError } = isCandidate
      ? await detailQuery.maybeSingle()
      : await detailQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (detailError) {
      setSetupError(detailError.message);
      setScreen("schema-error");
      return;
    }
    if (!details) {
      setProfile(null);
      window.history.replaceState(null, "", "/setup");
      setScreen("onboarding");
      return;
    }
    setProfile({ ...data, details });
    const isCandidateJobsRoute = data.role === "candidate" && window.location.pathname === "/candidate/jobs";
    const destination = isCandidateJobsRoute ? "/candidate/jobs" : data.role === "candidate" ? "/candidate/dashboard" : "/employer/dashboard";
    window.history.replaceState(null, "", destination);
    setScreen(isCandidateJobsRoute ? "jobs" : "dashboard");
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setSetupError(error.message);
        setScreen("schema-error");
        return;
      }
      loadAccount(data.session?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      queueMicrotask(() => {
        if (active) loadAccount(currentSession?.user || null);
      });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAccount]);

  useEffect(() => {
    function handlePopState() {
      if (!session || !profile) return;
      if (profile.role === "candidate") setScreen(window.location.pathname === "/candidate/jobs" ? "jobs" : "dashboard");
      else setScreen("dashboard");
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [session, profile]);

  function openJobs() {
    if (profile?.role !== "candidate") return;
    window.history.pushState(null, "", "/candidate/jobs");
    setScreen("jobs");
  }

  function openDashboard() {
    const destination = profile?.role === "candidate" ? "/candidate/dashboard" : "/employer/dashboard";
    window.history.pushState(null, "", destination);
    setScreen("dashboard");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.history.replaceState(null, "", "/");
    setSession(null);
    setProfile(null);
    setScreen("auth");
  }

  if (screen === "auth") return <Register />;
  if (screen === "loading") return <div className="app-loading"><span className="loading-mark">R</span><p>Preparing your RecruitFlow workspace…</p></div>;
  if (screen === "schema-error") return (
    <main className="setup-error-page"><div className="setup-error-card"><span className="section-kicker">ONE-TIME DATABASE SETUP</span><h1>Your workspace schema needs setup</h1><p>The application can’t load your RecruitFlow profile tables yet. Apply the included Supabase migration, then refresh.</p><code>{setupError}</code><p className="setup-file-hint">Migration file: <strong>supabase/migrations/001_role_profiles_and_recruitment.sql</strong></p><button className="primary-button" onClick={() => loadAccount(session?.user)}>Try again</button></div></main>
  );
  if (screen === "onboarding" && session) return <RoleOnboarding user={session.user} onComplete={() => loadAccount(session.user)} />;
  if (screen === "jobs" && session && profile?.role === "candidate") return <JobsPage profile={profile} onBack={openDashboard} onSignOut={signOut} />;
  if (screen === "dashboard" && session && profile) return <Dashboard user={session.user} profile={profile} onSignOut={signOut} onBrowseJobs={openJobs} />;
  return <div className="app-loading"><p>Loading your workspace…</p></div>;
}
