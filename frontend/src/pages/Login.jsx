import { useEffect, useState } from "react";
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

const FEATURES = [
  "Real-time cursor sync across all collaborators",
  "Persistent chat history saved to the document",
  "10 languages with full syntax highlighting",
  "Share documents instantly via invite link",
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, isLoggedIn } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (isLoggedIn()) navigate("/", { replace: true });
  }, [navigate, isLoggedIn]);

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/auth/login", form);
      login(res.data.token);
      addToast(`Welcome back, ${res.data.user.name}!`, "success");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--bg-0)" }}>
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex" style={{ width: "44%", flexDirection: "column", justifyContent: "space-between", padding: "40px 48px", background: "linear-gradient(160deg, #0a0a14 0%, #12102e 60%, #0a0a14 100%)", borderRight: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-80px", left: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "var(--accent)", filter: "blur(90px)", opacity: 0.12 }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "#22d3ee", filter: "blur(90px)", opacity: 0.07 }} />
        <div style={{ position: "relative", zIndex: 1 }}><Logo /></div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: "34px", fontWeight: 700, lineHeight: 1.3, marginBottom: "14px", color: "var(--text-1)" }}>
            Code together,<br /><span style={{ color: "var(--accent)" }}>build faster.</span>
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-2)", marginBottom: "28px", lineHeight: 1.65 }}>
            A real-time collaborative code editor for teams. Write, review, and ship — together.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--accent-d)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--accent)" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <span style={{ fontSize: "13px", color: "var(--text-2)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ position: "relative", zIndex: 1, fontSize: "12px", color: "var(--text-3)", margin: 0 }}>© 2025 CodeCollab — Built for developers</p>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px", background: "var(--bg-1)" }}>
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <div className="lg:hidden" style={{ marginBottom: "32px" }}><Logo /></div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px", color: "var(--text-1)", marginTop: 0 }}>Welcome back</h2>
          <p style={{ fontSize: "14px", color: "var(--text-2)", marginBottom: "28px", marginTop: 0 }}>Sign in to your account</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-2)", marginBottom: "6px" }}>Email address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="cc-input" required autoFocus />
            </div>
            <div style={{ marginBottom: "4px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-2)", marginBottom: "6px" }}>Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" className="cc-input" required />
            </div>
            {error && <p style={{ fontSize: "13px", color: "var(--danger)", margin: "8px 0 0" }}>{error}</p>}
            <button type="submit" disabled={loading} className="cc-btn cc-btn-primary" style={{ width: "100%", marginTop: "20px", padding: "11px" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p style={{ fontSize: "14px", textAlign: "center", marginTop: "24px", color: "var(--text-2)" }}>
            Don&apos;t have an account?{" "}
            <button type="button" onClick={() => navigate("/signup")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600, fontSize: "14px", padding: 0 }}>
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
