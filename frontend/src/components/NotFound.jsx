import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "16px",
        background: "var(--bg-1)",
      }}
    >
      <div style={{ fontSize: "80px", fontWeight: 700, color: "var(--border-2)", lineHeight: 1 }}>
        404
      </div>
      <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-1)", margin: 0 }}>
        Page not found
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: "14px", margin: 0 }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <button
        onClick={() => navigate("/")}
        className="cc-btn cc-btn-primary"
        style={{ marginTop: "8px" }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

export default NotFound;
