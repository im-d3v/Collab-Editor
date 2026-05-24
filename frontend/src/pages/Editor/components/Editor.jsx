import "../styles/Editor.css";
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ShareModal from '../../../components/Modal/ShareModal';
import API from '../../../api';
import socket from '../../../socket/socket';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

const LANGUAGES = ['javascript','python','java','c','cpp','typescript','html','css','json','markdown'];

const LANG_EXT = { javascript:'js', typescript:'ts', python:'py', java:'java', c:'c', cpp:'cpp', html:'html', css:'css', json:'json', markdown:'md' };

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function MainEditor({ data, sidebarOpen, chatOpen, onToggleSidebar, onToggleChat }) {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [content, setContent] = useState('');
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [remoteCursors, setRemoteCursors] = useState({});
  const [connected, setConnected] = useState(socket.connected);

  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const titleRef = useRef(title);
  const languageRef = useRef(language);
  const editorRef = useRef(null);
  // Concurrent-edit tracking
  const serverVersionRef = useRef(0);   // last version confirmed by the server
  const isRemoteUpdateRef = useRef(false); // prevent echo-loop when setting content from socket

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { languageRef.current = language; }, [language]);

  useEffect(() => {
    if (data) {
      setTitle(data.title || 'Untitled');
      setLanguage(data.language || 'javascript');
      setContent(data.content || '');
      serverVersionRef.current = 0; // reset on document load
    }
  }, [data]);

  const saveToServer = useRef(
    debounce(async (newContent) => {
      setSaveStatus('saving');
      try {
        await API.put(`/documents/${id}`, {
          title: titleRef.current || 'Untitled',
          language: languageRef.current || 'javascript',
          content: newContent,
        });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, 1200)
  ).current;

  const handleEditorChange = (value) => {
    if (isRemoteUpdateRef.current) return; // ignore programmatic updates
    setContent(value);
    setSaveStatus('unsaved');
    saveToServer(value);
    socket.emit("send_code", { code: value, room: id, baseVersion: serverVersionRef.current });
    socket.emit("user_editing", { room: id, user });
  };

  const handleTitleSave = async () => {
    setIsTitleEditing(false);
    try {
      await API.put(`/documents/${id}`, { title, language });
      addToast("Title saved.", "success");
    } catch {
      addToast("Failed to save title.", "error");
    }
  };

  const handleLanguageChange = async (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    try {
      await API.put(`/documents/${id}`, { title, language: lang });
    } catch {
      addToast("Failed to update language.", "error");
    }
  };

  const handleExport = () => {
    const ext = LANG_EXT[language] || 'txt';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'untitled'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported as ${title}.${ext}`, "success");
  };

  // Remote cursor decorations
  useEffect(() => {
    if (!editorRef.current) return;
    const decorations = [];
    Object.entries(remoteCursors).forEach(([uid, data]) => {
      if (uid === user?._id) return;
      if (data.position) {
        decorations.push({
          range: new window.monaco.Range(data.position.lineNumber, data.position.column, data.position.lineNumber, data.position.column),
          options: { className: 'remote-cursor', afterContentClassName: 'remote-cursor-label' },
        });
      }
      if (data.selection) {
        decorations.push({
          range: new window.monaco.Range(data.selection.startLineNumber, data.selection.startColumn, data.selection.endLineNumber, data.selection.endColumn),
          options: { className: 'remote-selection', isWholeLine: false },
        });
      }
    });
    const prev = editorRef.current.__remoteDecorations || [];
    editorRef.current.__remoteDecorations = editorRef.current.deltaDecorations(prev, decorations);
  }, [remoteCursors, user?._id]);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    const onReceiveCode = ({ code, version }) => {
      isRemoteUpdateRef.current = true;
      setContent(code);
      serverVersionRef.current = version;
      // Reset flag after React has flushed the state update
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 0);
    };

    const onCodeAccepted = ({ version }) => {
      serverVersionRef.current = version;
    };

    // Server rejected our edit because another user already changed the document.
    // Restore the authoritative content and notify the user.
    const onCodeConflict = ({ code, version }) => {
      isRemoteUpdateRef.current = true;
      setContent(code);
      serverVersionRef.current = version;
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 0);
      addToast("Edit conflict: another user's changes took priority. Your editor has been updated.", "warning");
    };

    const onCursorPos = ({ userId, position }) =>
      setRemoteCursors(p => ({ ...p, [userId]: { ...(p[userId] || {}), position } }));
    const onCursorSel = ({ userId, selection }) =>
      setRemoteCursors(p => ({ ...p, [userId]: { ...(p[userId] || {}), selection } }));

    socket.on("receive_code", onReceiveCode);
    socket.on("code_accepted", onCodeAccepted);
    socket.on("code_conflict", onCodeConflict);
    socket.on("receive_cursor_position", onCursorPos);
    socket.on("receive_cursor_selection", onCursorSel);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receive_code", onReceiveCode);
      socket.off("code_accepted", onCodeAccepted);
      socket.off("code_conflict", onCodeConflict);
      socket.off("receive_cursor_position", onCursorPos);
      socket.off("receive_cursor_selection", onCursorSel);
    };
  }, []);

  const SAVE_COLOR = { saved: "var(--success)", saving: "var(--warning)", unsaved: "var(--text-3)" };
  const SAVE_LABEL = { saved: "Saved", saving: "Saving…", unsaved: "Unsaved" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-0)" }}>
      {showShareModal && <ShareModal documentId={id} onClose={() => setShowShareModal(false)} />}

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 14px", height: "48px", background: "var(--bg-2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="cc-btn cc-btn-ghost"
          style={{ padding: "5px 10px", fontSize: "12px", gap: "5px", flexShrink: 0 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Dashboard
        </button>

        <div style={{ width: "1px", height: "20px", background: "var(--border)", flexShrink: 0 }} />

        {/* Title */}
        {isTitleEditing ? (
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={e => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") setIsTitleEditing(false); }}
            autoFocus
            className="cc-input"
            style={{ maxWidth: "220px", height: "30px", fontSize: "13px", padding: "4px 10px" }}
          />
        ) : (
          <button
            onClick={() => setIsTitleEditing(true)}
            style={{ background: "none", border: "none", color: "var(--text-1)", fontSize: "14px", fontWeight: 600, cursor: "pointer", padding: "4px 6px", borderRadius: "5px", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            title="Click to rename"
          >
            {title}
          </button>
        )}

        {/* Language selector */}
        <select
          value={language}
          onChange={handleLanguageChange}
          style={{ background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-2)", fontSize: "12px", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", outline: "none" }}
        >
          {LANGUAGES.map(l => <option key={l} value={l} style={{ background: "var(--bg-3)" }}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
        </select>

        {/* Save status */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: SAVE_COLOR[saveStatus] }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: SAVE_COLOR[saveStatus], display: "inline-block" }} />
          {SAVE_LABEL[saveStatus]}
        </div>

        <div style={{ flex: 1 }} />

        {/* Panel toggles */}
        <button
          onClick={onToggleSidebar}
          className="cc-btn cc-btn-ghost"
          style={{ padding: "5px 10px", fontSize: "12px", color: sidebarOpen ? "var(--accent)" : "var(--text-2)" }}
          title={sidebarOpen ? "Hide collaborators" : "Show collaborators"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        </button>

        <button
          onClick={onToggleChat}
          className="cc-btn cc-btn-ghost"
          style={{ padding: "5px 10px", fontSize: "12px", color: chatOpen ? "var(--accent)" : "var(--text-2)" }}
          title={chatOpen ? "Hide chat" : "Show chat"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </button>

        <button onClick={handleExport} className="cc-btn cc-btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }} title="Export file">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>

        <button onClick={() => setShowShareModal(true)} className="cc-btn cc-btn-primary" style={{ padding: "6px 14px", fontSize: "12px" }}>
          Share
        </button>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Editor
          theme="vs-dark"
          height="100%"
          width="100%"
          language={language}
          value={content}
          onChange={handleEditorChange}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            lineNumbers: "on",
            wordWrap: "on",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 12 },
          }}
          onMount={(editor) => {
            editorRef.current = editor;
            editor.onDidChangeCursorPosition(() => {
              const pos = editor.getPosition();
              if (pos) setCursorPos({ line: pos.lineNumber, col: pos.column });
              socket.emit("cursor_position", { room: id, user, position: pos });
            });
            editor.onDidChangeCursorSelection(() => {
              const sel = editor.getSelection();
              socket.emit("cursor_selection", { room: id, user, selection: sel });
            });
          }}
        />
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "0 14px", height: "24px", background: "var(--accent)", flexShrink: 0 }}>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}>{language.charAt(0).toUpperCase() + language.slice(1)}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: connected ? "#4ade80" : "#f43f5e", display: "inline-block" }} />
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
    </div>
  );
}

export default MainEditor;
