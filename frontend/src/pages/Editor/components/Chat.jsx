import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import socket from "../../../socket/socket";
import { getChatHistory } from "../../../apiCall/apiCalls";

function Chat({ onClose, documentId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    getChatHistory(documentId)
      .then(res => { if (res?.data) setMessages(res.data); })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [documentId]);

  useEffect(() => {
    socket.on("receive_chat", msg => setMessages(prev => [...prev, msg]));
    socket.on("user_typing", u => {
      if (u._id !== user._id) {
        setTypingUser(u.name);
        setTimeout(() => setTypingUser(null), 2000);
      }
    });
    return () => { socket.off("receive_chat"); socket.off("user_typing"); };
  }, [user._id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const msg = { userId: user._id, username: user.name, message: text };
    setMessages(prev => [...prev, msg]);
    socket.emit("send_chat", { documentId, ...msg });
    setInput("");
  };

  const handleKeyDown = (e) => {
    socket.emit("typing", { documentId, user });
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  function formatTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const isMe = (msg) => msg.userId === user._id;

  return (
    <div style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--bg-1)", borderLeft: "1px solid var(--border)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-1)" }}>Chat</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "2px" }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {loadingHistory ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "20px" }}>
            <div style={{ width: "20px", height: "20px", border: "2px solid var(--border)", borderTop: "2px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: "13px", paddingTop: "30px" }}>
            No messages yet.<br />Say hello! 👋
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg._id || i} style={{ display: "flex", flexDirection: "column", alignItems: isMe(msg) ? "flex-end" : "flex-start" }}>
              {!isMe(msg) && (
                <span style={{ fontSize: "11px", color: "var(--text-3)", marginBottom: "3px", paddingLeft: "4px" }}>{msg.username}</span>
              )}
              <div style={{
                maxWidth: "200px",
                padding: "8px 11px",
                borderRadius: isMe(msg) ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                fontSize: "13px",
                lineHeight: 1.45,
                background: isMe(msg) ? "var(--accent)" : "var(--bg-3)",
                color: isMe(msg) ? "#fff" : "var(--text-1)",
                wordBreak: "break-word",
              }}>
                {msg.message}
              </div>
              {msg.timestamp && (
                <span style={{ fontSize: "10px", color: "var(--text-3)", marginTop: "2px", paddingLeft: "4px" }}>
                  {formatTime(msg.timestamp)}
                </span>
              )}
            </div>
          ))
        )}

        {typingUser && (
          <div style={{ fontSize: "11px", color: "var(--text-3)", fontStyle: "italic", padding: "0 4px" }}>
            {typingUser} is typing…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", gap: "6px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          className="cc-input"
          style={{ flex: 1, height: "34px", fontSize: "13px", padding: "6px 10px" }}
        />
        <button onClick={sendMessage} disabled={!input.trim()} className="cc-btn cc-btn-primary" style={{ padding: "6px 12px", fontSize: "12px", flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default Chat;
