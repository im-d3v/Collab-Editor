const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
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

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: "50kb" }));
app.use(mongoSanitize());

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
