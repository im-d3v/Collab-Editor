import { useEffect, useState } from "react";
import socket from "../../../socket/socket";

function avatarColor(name) {
  if (!name) return "#7c6af7";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue},55%,50%)`;
}

function Avatar({ name }) {
  const initials = name
    ? name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div style={{
      width: "32px", height: "32px", borderRadius: "50%",
      background: avatarColor(name),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function EditingDots() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: "3px", height: "3px", borderRadius: "50%",
          background: "var(--accent)",
          display: "inline-block",
          animation: `editingPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes editingPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </span>
  );
}

function Sidebar({ allCollaborators = [], currentUserId, onClose }) {
  const [onlineIds, setOnlineIds] = useState(new Set());
  const [editingIds, setEditingIds] = useState(new Set());

  useEffect(() => {
    socket.on("user_list", (users) => {
      setOnlineIds(new Set(users.map(u => u._id)));
    });

    socket.on("user_editing_update", ({ userId, isEditing }) => {
      setEditingIds(prev => {
        const next = new Set(prev);
        if (isEditing) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.off("user_list");
      socket.off("user_editing_update");
    };
  }, []);

  const sorted = [...allCollaborators].sort((a, b) => {
    const aScore = (onlineIds.has(a._id) ? 2 : 0) + (editingIds.has(a._id) ? 1 : 0);
    const bScore = (onlineIds.has(b._id) ? 2 : 0) + (editingIds.has(b._id) ? 1 : 0);
    return bScore - aScore;
  });

  const onlineCount = sorted.filter(c => onlineIds.has(c._id)).length;

  return (
    <div style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--bg-1)", borderRight: "1px solid var(--border)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>Collaborators</span>
          {onlineCount > 0 && (
            <span style={{ fontSize: "11px", background: "var(--accent-d)", color: "var(--accent)", borderRadius: "10px", padding: "1px 7px", fontWeight: 600 }}>
              {onlineCount} online
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "2px" }}>×</button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: "4px" }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: "12px", paddingTop: "24px" }}>
            No collaborators yet.
          </div>
        ) : sorted.map(collab => {
          const isOnline = onlineIds.has(collab._id);
          const isEditing = editingIds.has(collab._id);
          const isMe = collab._id === currentUserId;

          return (
            <div key={collab._id} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 8px", borderRadius: "8px",
              background: isEditing ? "var(--accent-d2)" : isMe ? "rgba(255,255,255,0.02)" : "transparent",
              transition: "background 0.2s",
            }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar name={collab.name} />
                <span style={{
                  position: "absolute", bottom: "1px", right: "1px",
                  width: "9px", height: "9px", borderRadius: "50%",
                  background: isOnline ? "var(--success)" : "var(--text-3)",
                  border: "2px solid var(--bg-1)",
                  transition: "background 0.3s",
                }} />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {collab.name}
                  </span>
                  {isMe && (
                    <span style={{ fontSize: "10px", color: "var(--accent)", background: "var(--accent-d)", borderRadius: "4px", padding: "1px 5px", flexShrink: 0 }}>You</span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
                  {isEditing && !isMe ? (
                    <>
                      <span style={{ fontSize: "11px", color: "var(--accent)", fontStyle: "italic" }}>editing</span>
                      <EditingDots />
                    </>
                  ) : (
                    <span style={{ fontSize: "11px", color: isOnline ? "var(--success)" : "var(--text-3)" }}>
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Sidebar;
