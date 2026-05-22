import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSocket from "../../socket/useSocket";
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import MainEditor from './components/Editor';
import { fetchDocument } from '../../apiCall/apiCalls';
import { useAuth } from '../../context/AuthContext';

function CodeEditor() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useSocket(id, user);

  useEffect(() => {
    fetchDocument(id)
      .then(res => { if (res?.data) setDocData(res.data); else setError("Document not found."); })
      .catch(err => setError(err?.message || "Failed to load."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-0)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "36px", height: "36px", border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <span style={{ color: "var(--text-2)", fontSize: "14px" }}>Loading document…</span>
        </div>
      </div>
    );
  }

  if (error || !docData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-0)", flexDirection: "column", gap: "14px" }}>
        <span style={{ color: "var(--danger)", fontSize: "16px" }}>{error || "Document not found."}</span>
        <button onClick={() => navigate("/")} className="cc-btn cc-btn-ghost">← Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-0)" }}>
      {sidebarOpen && (
        <Sidebar
          allCollaborators={[docData.owner, ...docData.sharedWith]}
          currentUserId={user?._id}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <MainEditor
          data={docData}
          sidebarOpen={sidebarOpen}
          chatOpen={chatOpen}
          onToggleSidebar={() => setSidebarOpen(p => !p)}
          onToggleChat={() => setChatOpen(p => !p)}
        />
      </div>

      {chatOpen && (
        <Chat onClose={() => setChatOpen(false)} documentId={id} />
      )}
    </div>
  );
}

export default CodeEditor;
