const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/documentRoutes.js");
const socketHandler = require('./socket/socketHandler');

require("dotenv").config();

const app = express();

// ── Allowed origins ────────────────────────────────────────────────────────
// Hard-coded dev origins + anything listed in CLIENT_ORIGIN / SOCKET_ORIGIN
// (both env vars support comma-separated values, e.g. "https://a.com,https://b.com")
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:4173",
]);

const addOrigins = (envVal) => {
  if (!envVal) return;
  envVal.split(",").forEach((o) => {
    const trimmed = o.trim();
    if (trimmed) allowedOrigins.add(trimmed);
  });
};
addOrigins(process.env.CLIENT_ORIGIN);
addOrigins(process.env.SOCKET_ORIGIN);

// Log resolved origins once at startup so they're visible in Render logs
console.log("Allowed CORS origins:", [...allowedOrigins]);

// ── CORS ───────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: (origin, cb) => {
    // Allow same-origin / server-to-server (no Origin header) or listed origins
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

// cors() handles preflight OPTIONS automatically and sets the correct headers
app.use(cors(corsOptions));

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
