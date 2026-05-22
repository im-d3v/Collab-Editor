import { useState } from "react";
import API from "../../api";
import { useToast } from "../../context/ToastContext";

const ShareModal = ({ onClose, documentId }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleShare = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await API.post(`/documents/share/${documentId}`, { email: email.trim() });
      addToast("Document shared successfully!", "success");
      setEmail("");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to share document.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/documents/${documentId}`);
    addToast("Link copied to clipboard!", "success");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "28px",
          width: "420px",
          maxWidth: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--text-1)" }}>
            Share Document
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-3)",
              cursor: "pointer",
              fontSize: "20px",
              lineHeight: 1,
              padding: "4px",
            }}
          >
            ×
          </button>
        </div>

        <p style={{ color: "var(--text-2)", fontSize: "13px", marginBottom: "16px", marginTop: 0 }}>
          Invite collaborators by email. They&apos;ll get full read and write access.
        </p>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleShare()}
            className="cc-input"
            style={{ flex: 1 }}
            autoFocus
          />
          <button
            onClick={handleShare}
            disabled={loading || !email.trim()}
            className="cc-btn cc-btn-primary"
            style={{ flexShrink: 0 }}
          >
            {loading ? "..." : "Invite"}
          </button>
        </div>

        <div
          style={{
            background: "var(--bg-3)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "3px" }}>Share link</div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-2)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {`${window.location.origin}/documents/${documentId}`}
            </div>
          </div>
          <button onClick={handleCopyLink} className="cc-btn cc-btn-ghost" style={{ padding: "6px 12px", fontSize: "13px" }}>
            Copy
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
