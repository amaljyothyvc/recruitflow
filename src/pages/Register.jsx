import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formActive, setFormActive] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const [isLogin, setIsLogin] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError) throw loginError;
      if (!data.session) throw new Error("Unable to create a session.");
    } catch {
      setError("Invalid credentials. Please check your email and password and try again.");
    } finally {
      setLoading(false);
    }
  }

  function switchForm(loginMode) {
    setIsLogin(loginMode);
    setError("");
    setMessage("");
    setDuplicateEmail(false);
    setPassword("");
    setShowPassword(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setDuplicateEmail(false);

    if (password.length < 6) {
      setError("Your password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) throw signUpError;

      if (!data.session) {
        setError("Your account was created, but email confirmation is still enabled. Turn off Confirm email in Supabase Authentication settings to sign in immediately.");
        return;
      }

      return;
    } catch (err) {
      const isDuplicate = /already registered|already exists|user exists|email address.*taken/i.test(err.message || "") || ["user_already_exists", "email_exists"].includes(err.code);
      setDuplicateEmail(isDuplicate);
      setError(isDuplicate ? "There’s already an account with this email. Please sign in instead." : (err.message || "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="rf-page">
      <style>{styles}</style>
      <header className="rf-nav">
        <span className="rf-brand-spacer" aria-hidden="true" />
        <div className="rf-nav-right">
          <span className="rf-nav-prompt">{isLogin ? "New to RecruitFlow?" : "Already have an account?"}</span>
          <a className="rf-signin" href={isLogin ? "#register" : "#signin"} onClick={(e) => { e.preventDefault(); switchForm(!isLogin); }}>{isLogin ? "Create account" : "Sign in"}</a>
        </div>
      </header>

      <section className={`rf-content${formActive ? " rf-form-active" : ""}`} id="top">
        <div className="rf-intro">
          <div className="rf-eyebrow"><span className="rf-eyebrow-dot" /> A BETTER WAY TO FIND YOUR NEXT ROLE</div>
          <h1>Find work that <span>feels right.</span></h1>
          <p className="rf-lede">Tell us a little about yourself, then find roles that match what you’re looking for.</p>

          <div className="rf-benefits">
            <div className="rf-benefit">
              <span className="rf-benefit-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="8" r="3.5"/><path d="M4 20v-1.5a6.5 6.5 0 0 1 13 0V20M17 5.2a3.5 3.5 0 0 1 0 6.6M19 15a5 5 0 0 1 2 4v1"/></svg></span>
              <span><strong>Meet the right teams</strong><small>Get to know the people behind the roles.</small></span>
            </div>
            <div className="rf-benefit">
              <span className="rf-benefit-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg></span>
              <span><strong>Find a role that fits</strong><small>Browse jobs that match your experience and interests.</small></span>
            </div>
            <div className="rf-benefit">
              <span className="rf-benefit-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h14v18l-7-4-7 4z"/><path d="m9 10 2 2 4-4"/></svg></span>
              <span><strong>Keep track as you go</strong><small>Save roles and keep your applications together.</small></span>
            </div>
          </div>

          <div className="rf-quote">
            <div className="rf-quote-avatars" aria-hidden="true"><span>JM</span><span>AK</span><span>SL</span></div>
            <p><strong>Make your job search simpler.</strong><br />Find a role worth applying for.</p>
          </div>
        </div>

        <div className="rf-card-wrap">
          <div className="rf-card" onMouseEnter={() => setFormActive(true)} onMouseLeave={() => setFormActive(false)} onFocus={() => setFormActive(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFormActive(false); }}>
            <div className="rf-card-heading">
              <div className="rf-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20v-1.5a6.5 6.5 0 0 1 13 0V20M10.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 8h5m-2.5-2.5v5"/></svg></div>
              <div><p className="rf-card-kicker">{isLogin ? "WELCOME BACK" : "CREATE YOUR ACCOUNT"}</p><h2>{isLogin ? "Sign in to RecruitFlow" : "Create your account"}</h2></div>
            </div>
            <p className="rf-card-subtitle">{isLogin ? "Enter your email and password to access your account." : "It only takes a minute to get started."}</p>

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="rf-form">
              {!isLogin && <>
                <label htmlFor="rf-name">Full name</label>
                <input id="rf-name" type="text" autoComplete="name" placeholder="e.g. Jordan Morgan" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </>}
              <label htmlFor="rf-email">Email address</label>
              <input id="rf-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label htmlFor="rf-password">Password</label>
              <div className="rf-password-wrap">
                <input id="rf-password" type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? "Your password" : "At least 6 characters"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={isLogin ? undefined : 6} required />
                <button className="rf-show-password" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
              </div>
              {!isLogin && <p className="rf-terms">By creating an account, you agree to our <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a> and <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.</p>}
              <button className="rf-submit" type="submit" disabled={loading}>{loading ? <><span className="rf-spinner" /> {isLogin ? "Signing in…" : "Creating your account…"}</> : <>{isLogin ? "Sign in" : "Create my account"} <span aria-hidden="true">→</span></>}</button>
              {message && <p className="rf-alert rf-success" role="status">{message}</p>}
              {error && <p className="rf-alert rf-error" role="alert">{error}{duplicateEmail && !isLogin && <> <a href="#signin" className="rf-error-link" onClick={(e) => { e.preventDefault(); switchForm(true); }}>Sign in</a></>}</p>}
              <p className="rf-terms" style={{textAlign:"center", marginTop:16}}>{isLogin ? "Don't have an account? " : "Already have an account? "}<a href={isLogin ? "#register" : "#signin"} onClick={(e) => { e.preventDefault(); switchForm(!isLogin); }}>{isLogin ? "Create an account" : "Sign in"}</a></p>
            </form>
            <div className="rf-card-footer"><span className="rf-shield" aria-hidden="true">✓</span> Your details are only used for your account</div>
          </div>
          <p className="rf-mobile-note">{isLogin ? "New to RecruitFlow? " : "Already have an account? "}<a href={isLogin ? "#register" : "#signin"} onClick={(e) => { e.preventDefault(); switchForm(!isLogin); }}>{isLogin ? "Create an account" : "Sign in"}</a></p>
        </div>
      </section>
      <footer className="rf-footer"><span>© {new Date().getFullYear()} RecruitFlow</span><span></span></footer>
    </main>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
html,body,#root{width:100%!important;min-width:0!important;min-height:100%!important;margin:0!important;padding:0!important;max-width:none!important}body{display:block!important;background:#f6f8fb!important}.rf-page{width:100vw;max-width:none!important;margin:0!important;--ink:#172b4d;--muted:#64748b;--blue:#1264a3;--line:#dce5ee;min-height:100vh;height:100vh;overflow-x:hidden;background:linear-gradient(135deg,#f8fafc 0%,#f1f6fa 55%,#f7f9fc 100%);color:var(--ink);font-family:'DM Sans',Arial,sans-serif;display:flex;flex-direction:column;box-sizing:border-box}.rf-page *{box-sizing:border-box}.rf-nav{width:100%;height:76px;padding:0 max(6.2vw,32px);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.92);border-bottom:1px solid #e7edf3}.rf-brand-spacer{display:block;min-width:1px}.rf-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#183b62;font:800 22px Manrope,sans-serif;letter-spacing:-1px}.rf-brand-mark{width:31px;height:31px;border-radius:9px;background:#1469a8;color:white;display:grid;place-items:center;font:800 23px Manrope,sans-serif;letter-spacing:-2px;padding:0 2px 3px 0}.rf-brand-light{font-weight:500;color:#52718e}.rf-nav-right{display:flex;align-items:center;gap:17px;font-size:14px;color:#61758b}.rf-signin{color:#1264a3;text-decoration:none;font-weight:700;padding:9px 17px;border:1px solid #1264a3;border-radius:22px;transition:.18s}.rf-signin:hover{background:#eaf4fb}.rf-content{flex:1;width:min(1320px,92%);margin:auto;display:grid;grid-template-columns:1.02fr .88fr;gap:clamp(48px,8vw,112px);align-items:center;padding:clamp(30px,5vh,70px) 0;min-height:0}.rf-intro{padding:7px 0}.rf-eyebrow{display:flex;align-items:center;gap:9px;color:#3979a6;font-size:11px;font-weight:700;letter-spacing:1.6px}.rf-eyebrow-dot{width:8px;height:8px;background:#35a184;border-radius:50%;box-shadow:0 0 0 4px #e1f4ee}.rf-intro h1{font:800 clamp(40px,5vw,59px)/1.12 Manrope,Arial,sans-serif;letter-spacing:-2.7px;margin:24px 0 18px;color:#153657;max-width:560px;opacity:0;transform:translateY(30px);animation:rf-rise .9s cubic-bezier(.2,.75,.25,1) .15s forwards}.rf-intro h1 span{color:#2175aa}.rf-lede{font-size:17px;line-height:1.72;color:#62748a;max-width:490px;margin:0;opacity:0;transform:translateY(18px);animation:rf-rise .75s cubic-bezier(.2,.75,.25,1) .8s forwards}.rf-benefits{display:grid;gap:21px;margin:37px 0 32px;opacity:0;transform:translateY(15px);animation:rf-rise .7s cubic-bezier(.2,.75,.25,1) 1.25s forwards}.rf-benefit{display:flex;align-items:center;gap:15px}.rf-benefit-icon{width:43px;height:43px;flex:none;border-radius:13px;background:#e8f2f8;display:grid;place-items:center;color:#2675a8}.rf-benefit-icon svg,.rf-card-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.rf-benefit strong,.rf-benefit small{display:block}.rf-benefit strong{font-size:14px;color:#27445f;margin-bottom:4px}.rf-benefit small{font-size:13px;color:#738398}.rf-quote{display:flex;align-items:center;gap:13px;padding-top:21px;border-top:1px solid #e0e8ef}.rf-quote-avatars{display:flex;padding-left:3px}.rf-quote-avatars span{width:31px;height:31px;border-radius:50%;display:grid;place-items:center;border:2px solid #f6f8fb;margin-left:-4px;background:#d6e8f1;color:#315d7b;font-size:9px;font-weight:700}.rf-quote-avatars span:nth-child(2){background:#f3dfd0;color:#805b48}.rf-quote-avatars span:nth-child(3){background:#dce9d8;color:#4b6d4d}.rf-quote p{font-size:12px;line-height:1.55;color:#78899b;margin:0}.rf-quote strong{font-size:13px;color:#36536b}.rf-card-wrap{width:100%}.rf-card{background:#fff;border:1px solid #e8edf2;border-radius:17px;padding:32px 34px 0;box-shadow:0 14px 44px rgba(36,68,94,.09);opacity:0;transform:translateY(28px) scale(.985);animation:rf-card-in .8s cubic-bezier(.2,.75,.25,1) .45s forwards;transition:box-shadow .45s ease,transform .45s ease,border-color .45s ease;position:relative;z-index:1}.rf-card:hover,.rf-card:focus-within{box-shadow:0 24px 70px rgba(31,83,119,.18);transform:translateY(-5px) scale(1.01);border-color:#c9dce9}.rf-form-active .rf-intro{opacity:.23;filter:grayscale(.35);transform:scale(.985)}.rf-intro{transition:opacity .55s ease,filter .55s ease,transform .55s ease}.rf-card-heading{display:flex;align-items:center;gap:13px}.rf-card-icon{width:43px;height:43px;border-radius:13px;background:#e9f3f9;color:#176a9f;display:grid;place-items:center}.rf-card-icon svg{width:23px;height:23px}.rf-card-kicker{font-size:9px;font-weight:700;letter-spacing:1.2px;color:#4380a5;margin:0 0 4px}.rf-card h2{font:700 24px Manrope,sans-serif;letter-spacing:-.6px;margin:0;color:#1d3b58}.rf-card-subtitle{font-size:13px;color:#77889b;margin:14px 0 24px}.rf-form{display:flex;flex-direction:column}.rf-form label{font-size:12px;font-weight:700;color:#344e67;margin:0 0 7px}.rf-form input{height:45px;width:100%;border:1px solid #d7e0e8;border-radius:8px;background:#fff;color:#1d354c;padding:0 13px;font:14px 'DM Sans',sans-serif;outline:none;transition:border-color .15s,box-shadow .15s;margin-bottom:17px}.rf-form input::placeholder{color:#a0adba}.rf-form input:focus{border-color:#3180b0;box-shadow:0 0 0 3px rgba(49,128,176,.12)}.rf-password-wrap{position:relative}.rf-password-wrap input{padding-right:58px}.rf-show-password{position:absolute;right:10px;top:12px;background:none;border:0;color:#2673a1;font:700 11px 'DM Sans',sans-serif;cursor:pointer;padding:4px}.rf-terms{font-size:10.5px;line-height:1.6;color:#8492a2;margin:0 0 17px}.rf-terms a,.rf-mobile-note a{color:#176da3;text-decoration:none;font-weight:600}.rf-terms a:hover,.rf-mobile-note a:hover{text-decoration:underline}.rf-submit{height:47px;border:0;border-radius:8px;background:#176da3;color:white;font:700 14px 'DM Sans',sans-serif;cursor:pointer;transition:background .15s,transform .15s;display:flex;align-items:center;justify-content:center;gap:10px}.rf-submit:hover:not(:disabled){background:#105783;transform:translateY(-1px)}.rf-submit:disabled{opacity:.7;cursor:wait}.rf-submit span:last-child{font-size:18px}.rf-spinner{width:15px;height:15px;border:2px solid rgba(255,255,255,.4);border-top-color:white;border-radius:50%;animation:rf-spin .7s linear infinite}@keyframes rf-spin{to{transform:rotate(360deg)}}@keyframes rf-rise{to{opacity:1;transform:translateY(0)}}@keyframes rf-card-in{to{opacity:1;transform:translateY(0) scale(1)}}.rf-alert{font-size:12px;line-height:1.5;border-radius:7px;padding:10px 12px;margin:13px 0 0}.rf-success{background:#edf8f1;color:#267044}.rf-error{background:#fff1f0;color:#aa3832}.rf-card-footer{margin:22px -34px 0;padding:16px 20px;border-top:1px solid #edf1f4;text-align:center;color:#8190a0;font-size:10.5px}.rf-shield{color:#34876a;font-weight:800;margin-right:5px}.rf-mobile-note{display:none}.rf-footer{display:flex;justify-content:flex-start;width:min(1080px,88%);margin:0 auto;padding:18px 0 23px;border-top:1px solid #e4eaf0;color:#8897a6;font-size:11px}.rf-footer span:last-child{color:#71869a}@media(max-width:800px){.rf-page{height:auto;min-height:100vh;overflow:auto}.rf-content{width:min(560px,90%);grid-template-columns:1fr;gap:35px;padding:47px 0}.rf-intro h1{font-size:47px;max-width:520px}.rf-benefits{grid-template-columns:1fr 1fr;gap:19px 12px;margin:27px 0}.rf-benefit{align-items:flex-start}.rf-benefit-icon{width:38px;height:38px}.rf-benefit small{line-height:1.45}.rf-quote{display:none}.rf-card{padding:27px 28px 0}.rf-card-footer{margin-left:-28px;margin-right:-28px}.rf-footer{width:90%}}@media(max-width:520px){.rf-nav{height:65px;padding:0 20px}.rf-brand{font-size:19px}.rf-brand-mark{width:28px;height:28px;font-size:21px}.rf-nav-prompt{display:none}.rf-nav-right{gap:0}.rf-content{width:calc(100% - 36px);padding:34px 0 35px;gap:24px}.rf-eyebrow{font-size:9px;letter-spacing:1.25px}.rf-intro h1{font-size:39px;letter-spacing:-1.8px;margin:19px 0 12px}.rf-lede{font-size:14px;line-height:1.6}.rf-benefits{grid-template-columns:1fr;gap:14px;margin:22px 0 0}.rf-benefit strong{font-size:13px}.rf-benefit small{font-size:11.5px}.rf-card{padding:23px 20px 0;border-radius:13px}.rf-card h2{font-size:21px}.rf-card-subtitle{margin:11px 0 20px}.rf-card-footer{margin-left:-20px;margin-right:-20px}.rf-mobile-note{display:block;text-align:center;font-size:12px;color:#718296;margin:15px 0 0}.rf-footer{width:calc(100% - 36px);padding:15px 0;font-size:10px}}
`;

export default Register;
