import { useEffect, useState, useCallback } from "react";
import API from "../../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const LANG_CONFIG = {
  javascript: { label: "JS",   color: "#f7df1e", bg: "rgba(247,223,30,0.1)" },
  typescript: { label: "TS",   color: "#3178c6", bg: "rgba(49,120,198,0.1)" },
  python:     { label: "PY",   color: "#4b8bbe", bg: "rgba(75,139,190,0.1)" },
  java:       { label: "JV",   color: "#f89820", bg: "rgba(248,152,32,0.1)" },
  c:          { label: "C",    color: "#a8b9cc", bg: "rgba(168,185,204,0.1)" },
  cpp:        { label: "C++",  color: "#659ad2", bg: "rgba(101,154,210,0.1)" },
  html:       { label: "HTML", color: "#e34c26", bg: "rgba(227,76,38,0.1)" },
  css:        { label: "CSS",  color: "#264de4", bg: "rgba(38,77,228,0.1)" },
  json:       { label: "JSON", color: "#95a5a6", bg: "rgba(149,165,166,0.1)" },
  markdown:   { label: "MD",   color: "#7f8c8d", bg: "rgba(127,140,141,0.1)" },
};
const SUPPORTED_LANGS = Object.keys(LANG_CONFIG);

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function LangBadge({ language }) {
  const cfg = LANG_CONFIG[language] || { label: (language || "?").slice(0, 3).toUpperCase(), color: "#888", bg: "rgba(136,136,136,0.1)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, letterSpacing: "0.3px" }}>
      {cfg.label}
    </span>
  );
}

function DocCard({ doc, isOwned, onOpen, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div
      style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px", transition: "border-color 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <LangBadge language={doc.language} />
        <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{relativeTime(doc.updatedAt)}</span>
      </div>

      <div style={{ flex: 1, cursor: "pointer" }} onClick={onOpen}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {doc.title}
        </h3>
        {!isOwned && doc.owner && (
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-3)" }}>by {doc.owner.name || doc.owner.email}</p>
        )}
      </div>

      <div style={{ display: "flex", gap: "6px" }} onClick={e => e.stopPropagation()}>
        <button onClick={onOpen} className="cc-btn cc-btn-ghost" style={{ flex: 1, padding: "6px 10px", fontSize: "12px" }}>Open →</button>
        {isOwned && (
          confirmDelete ? (
            <>
              <button onClick={() => onDelete(doc._id)} className="cc-btn" style={{ flex: 1, padding: "6px 10px", fontSize: "12px", background: "rgba(244,63,94,0.15)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: "8px" }}>Confirm</button>
              <button onClick={() => setConfirmDelete(false)} className="cc-btn cc-btn-ghost" style={{ padding: "6px 10px", fontSize: "12px" }}>✕</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="cc-btn cc-btn-danger" style={{ padding: "6px 12px", fontSize: "12px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
            </button>
          )
        )}
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [ownedDocs, setOwnedDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", language: "javascript" });
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await API.get("/documents");
      setOwnedDocs(res.data.ownedDocuments || []);
      setSharedDocs(res.data.sharedDocuments || []);
    } catch { addToast("Failed to load documents.", "error"); }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDelete = async (id) => {
    try {
      await API.delete(`/documents/${id}`);
      setOwnedDocs(p => p.filter(d => d._id !== id));
      addToast("Document deleted.", "info");
    } catch { addToast("Failed to delete document.", "error"); }
  };

  const handleCreate = async () => {
    if (!newDoc.title.trim()) { addToast("Please enter a title.", "warning"); return; }
    setCreating(true);
    try {
      const res = await API.post("/documents", { title: newDoc.title.trim(), language: newDoc.language, content: "" });
      navigate(`/documents/${res.data._id}`);
    } catch { addToast("Failed to create document.", "error"); setCreating(false); }
  };

  const filterFn = (docs) => !search.trim() ? docs : docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) || d.language.toLowerCase().includes(search.toLowerCase())
  );

  const GRID = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-1)" }}>
      {/* Navbar */}
      <header style={{ display: "flex", alignItems: "center", gap: "16px", padding: "0 28px", height: "58px", background: "var(--bg-2)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{"</>"}</div>
          <span style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-1)" }}>CodeCollab</span>
        </div>

        <div style={{ flex: 1, maxWidth: "360px", position: "relative" }}>
          <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…" className="cc-input" style={{ paddingLeft: "32px", height: "34px", fontSize: "13px" }} />
        </div>

        <div style={{ flex: 1 }} />

        <button onClick={() => { setNewDoc({ title: "", language: "javascript" }); setShowModal(true); }} className="cc-btn cc-btn-primary" style={{ padding: "7px 14px", fontSize: "13px", gap: "6px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Document
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--accent-d)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "var(--accent)" }}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <span style={{ fontSize: "13px", color: "var(--text-2)", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</span>
          <button onClick={logout} className="cc-btn cc-btn-ghost" style={{ padding: "5px 11px", fontSize: "12px" }}>Logout</button>
        </div>
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 28px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "80px" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "32px" }}>
              {[{ l: "My Documents", v: ownedDocs.length }, { l: "Shared With Me", v: sharedDocs.length }, { l: "Total", v: ownedDocs.length + sharedDocs.length }].map(s => (
                <div key={s.l} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 20px", minWidth: "130px" }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-1)", lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "4px" }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* My Documents */}
            <section style={{ marginBottom: "36px" }}>
              <h2 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: 600, color: "var(--text-1)" }}>
                My Documents <span style={{ color: "var(--text-3)", fontWeight: 400, fontSize: "13px" }}>({filterFn(ownedDocs).length})</span>
              </h2>
              <div style={GRID}>
                {filterFn(ownedDocs).length === 0 ? (
                  <div style={{ gridColumn: "1/-1", padding: "40px", textAlign: "center", color: "var(--text-3)", border: "1px dashed var(--border)", borderRadius: "12px", fontSize: "14px" }}>
                    {search ? "No results." : "No documents yet — create your first one!"}
                  </div>
                ) : filterFn(ownedDocs).map(doc => (
                  <DocCard key={doc._id} doc={doc} isOwned onOpen={() => navigate(`/documents/${doc._id}`)} onDelete={handleDelete} />
                ))}
              </div>
            </section>

            {/* Shared */}
            {sharedDocs.length > 0 && (
              <section>
                <h2 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: 600, color: "var(--text-1)" }}>
                  Shared With Me <span style={{ color: "var(--text-3)", fontWeight: 400, fontSize: "13px" }}>({filterFn(sharedDocs).length})</span>
                </h2>
                <div style={GRID}>
                  {filterFn(sharedDocs).length === 0 ? (
                    <div style={{ gridColumn: "1/-1", padding: "40px", textAlign: "center", color: "var(--text-3)", border: "1px dashed var(--border)", borderRadius: "12px", fontSize: "14px" }}>No results.</div>
                  ) : filterFn(sharedDocs).map(doc => (
                    <DocCard key={doc._id} doc={doc} isOwned={false} onOpen={() => navigate(`/documents/${doc._id}`)} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Create modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "28px", width: "420px", maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 600, color: "var(--text-1)" }}>New Document</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "20px" }}>×</button>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-2)", marginBottom: "6px" }}>Title</label>
              <input value={newDoc.title} onChange={e => setNewDoc(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleCreate()} placeholder="My project" className="cc-input" autoFocus />
            </div>
            <div style={{ marginBottom: "22px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text-2)", marginBottom: "6px" }}>Language</label>
              <select value={newDoc.language} onChange={e => setNewDoc(p => ({ ...p, language: e.target.value }))} className="cc-input" style={{ cursor: "pointer" }}>
                {SUPPORTED_LANGS.map(l => <option key={l} value={l} style={{ background: "#1e1e35" }}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowModal(false)} className="cc-btn cc-btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="cc-btn cc-btn-primary" style={{ flex: 1 }}>
                {creating ? "Creating..." : "Create Document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
