const express = require("express");
const http = require("http");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/documentRoutes.js");
const socketHandler = require('./socket/socketHandler');

require("dotenv").config();

const app = express();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:4173",
]);
if (process.env.CLIENT_ORIGIN) allowedOrigins.add(process.env.CLIENT_ORIGIN.trim());
if (process.env.SOCKET_ORIGIN) allowedOrigins.add(process.env.SOCKET_ORIGIN.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const corsOptions = {
  origin: (origin, cb) => (!origin || allowedOrigins.has(origin) ? cb(null, true) : cb(new Error("CORS blocked"))),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
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
