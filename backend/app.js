const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");          // kept only for Socket.IO internal use
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/documentRoutes.js");
const socketHandler = require('./socket/socketHandler');

require("dotenv").config();

const app = express();

// ── Allowed origins ────────────────────────────────────────────────────────
// Comma-separated values supported: CLIENT_ORIGIN=https://a.com,https://b.com
const allowedOrigins = new Set([
  // Local dev
  "http://localhost:5173",
  "http://localhost:4173",
  // Production (hardcoded so it works even if the env var is missing)
  "https://collab-editor-d7mh.onrender.com",
]);

const addOrigins = (envVal) => {
  if (!envVal) return;
  envVal.split(",").forEach((o) => {
    const t = o.trim();
    if (t) allowedOrigins.add(t);
  });
};
addOrigins(process.env.CLIENT_ORIGIN);
addOrigins(process.env.SOCKET_ORIGIN);

console.log("✅ Allowed CORS origins:", [...allowedOrigins]);

// ── Raw CORS middleware (Express-v5 safe) ──────────────────────────────────
// The cors npm package uses res.end() in a way that conflicts with Express v5.
// This hand-rolled version is explicit and has no external dependencies.
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const isAllowed = !origin || allowedOrigins.has(origin);

  res.setHeader("Vary", "Origin");

  if (isAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    console.log(`[CORS preflight] origin="${origin}" allowed=${isAllowed}`);
    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Max-Age", "86400");
      res.statusCode = 204;
      res.end();
      return;
    }
    // Unknown origin – end with 403 (no CORS header → browser blocks the real request)
    res.statusCode = 403;
    res.end();
    return;
  }

  next();
});

// corsOptions is only used for Socket.IO's built-in CORS handler
const corsOptions = {
  origin: (origin, cb) =>
    !origin || allowedOrigins.has(origin) ? cb(null, true) : cb(new Error(`CORS blocked: ${origin}`)),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(express.json({ limit: "50kb" }));
app.use((req, _res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitize(obj[key]);
      }
    }
  };
  sanitize(req.body);
  sanitize(req.params);
  // req.query is a getter-only property in Express v5 — mutate in-place, never reassign
  sanitize(req.query);
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/documents", documentRoutes);

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

const server = http.createServer(app);

const io = new Server(server, { cors: corsOptions });

socketHandler(io);

connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
