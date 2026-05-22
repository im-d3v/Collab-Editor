import { useState, useEffect } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", color: "#fff", fontFamily: "monospace" }}>
      {"</>"}
    </div>
    <span style={{ fontWeight: 700, fontSize: "17px", color: "var(--text-1)" }}>CodeCollab</span>
  </div>
);

function getStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "var(--border)" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { label: "", color: "var(--border)" },
    { label: "Very weak", color: "#f43f5e" },
    { label: "Weak", color: "#f97316" },
    { label: "Fair", color: "#f59e0b" },
    { label: "Strong", color: "#22c55e" },
    { label: "Very strong", color: "#10b981" },
  ];
  return { score, ...levels[score] };
}

function getHints(pw) {
  if (!pw) return [];
  const hints = [];
  if (pw.length < 8) hints.push("At least 8 characters");
  if (!/[A-Z]/.test(pw)) hints.push("One uppercase letter");
  if (!/[a-z]/.test(pw)) hints.push("One lowercase letter");
  if (!/[0-9]/.test(pw)) hints.push("One number");
  if (!/[^A-Za-z0-9]/.test(pw)) hints.push("One special character (!@#$%^&*)");
  return hints;
}

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, isLoggedIn } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (isLoggedIn()) navigate("/", { replace: true });
  }, [navigate, isLoggedIn]);

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const strength = getStrength(form.password);
  const hints = getHints(form.password);
  const isPasswordValid = strength.score === 5;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError("Please meet all password requirements.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/auth/signup", form);
      login(res.data.token);
      addToast(`Account created! Welcome, ${res.data.user.name}`, "success");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--bg-0)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex" style={{ width: "44%", flexDirection: "column", justifyContent: "center", padding: "40px 48px", background: "linear-gradient(160deg, #0a0a14 0%, #12102e 60%, #0a0a14 100%)", borderRight: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-80px", left: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "var(--accent)", filter: "blur(90px)", opacity: 0.12 }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "#22d3ee", filter: "blur(90px)", opacity: 0.07 }} />
        <div style={{ position: "relative", zIndex: 1, marginBottom: "40px" }}><Logo /></div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: "34px", fontWeight: 700, lineHeight: 1.3, marginBottom: "14px", color: "var(--text-1)" }}>
            Start collaborating<br /><span style={{ color: "var(--accent)" }}>in seconds.</span>
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-2)", lineHeight: 1.65, margin: 0 }}>
            Create a free account and invite your team. No setup needed — open a document and start coding together instantly.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px", background: "var(--bg-1)", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <div className="lg:hidden" style={{ marginBottom: "32px" }}><Logo /></div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px", color: "var(--text-1)", marginTop: 0 }}>Create an account</h2>
          <p style={{ fontSize: "14px", color: "var(--text-2)", marginBottom: "28px", marginTop: 0 }}>Free forever. No credit card needed.</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-2)", marginBottom: "6px" }}>Full name</label>
              <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="John Doe" className="cc-input" required autoFocus />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-2)", marginBottom: "6px" }}>Email address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="cc-input" required />
            </div>

            {/* Password with toggle + strength */}
            <div style={{ marginBottom: "4px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-2)", marginBottom: "6px" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className="cc-input"
                  required
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: "2px", display: "flex" }}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>

              {/* Strength bar */}
              {form.password && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "5px" }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: "3px", borderRadius: "2px",
                        background: i <= strength.score ? strength.color : "var(--border)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {hints.map(hint => (
                        <span key={hint} style={{ fontSize: "11px", color: "var(--text-3)", background: "var(--bg-3)", borderRadius: "4px", padding: "2px 6px" }}>
                          {hint}
                        </span>
                      ))}
                    </div>
                    {strength.label && (
                      <span style={{ fontSize: "11px", fontWeight: 600, color: strength.color, flexShrink: 0, marginLeft: "6px" }}>
                        {strength.label}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && <p style={{ fontSize: "13px", color: "var(--danger)", margin: "10px 0 0" }}>{error}</p>}

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="cc-btn cc-btn-primary"
              style={{ width: "100%", marginTop: "20px", padding: "11px", opacity: (!isPasswordValid && form.password) ? 0.5 : 1 }}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p style={{ fontSize: "14px", textAlign: "center", marginTop: "24px", color: "var(--text-2)" }}>
            Already have an account?{" "}
            <button type="button" onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600, fontSize: "14px", padding: 0 }}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
