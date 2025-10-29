// index.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const connectDb = require("./db/connectDb");
const { authLimiter } = require("./utils/rateLimit");
const { scheduleInvitationCleanup } = require("./utils/cleanupTasks");
const logger = require("./utils/logger");
const http = require("http");
const { Server } = require("socket.io");
const socketBus = require("./socket");
const fs = require("fs");

// Routes
const verRoute = require("./routes/ver.route");
const adminRoute = require("./routes/admin.route");
const adsRoute = require("./routes/advertisement.route");
const jobRoute = require("./routes/job.route");
const workerRoute = require("./routes/worker.route");
const skillsRoute = require("./routes/skill.route");
const profileRoute = require("./routes/profile.route");
const clientManagementRoute = require("./routes/clientManagement.route");
const workerManagementRoute = require("./routes/workerManagement.route");
const userIDVerificationRoute = require("./routes/userIDVerification.route");
const messageRoute = require("./routes/message.route");
const dashboardRoutes = require("./routes/dashboard.route");

// Hiring system routes
const applicationRoute = require("./routes/jobApplication.route");
const invitationRoute = require("./routes/workerInvitation.route");
const contractRoute = require("./routes/workContract.route");

// Admin routes
const jobManagementRoute = require("./routes/jobManagement.route");

const allowedOrigins = [
  process.env.NODE_ENV === "production"
    ? process.env.PRODUCTION_FRONTEND_URL
    : process.env.DEVELOPMENT_FRONTEND_URL,
];

const app = express();
const PORT = process.env.PORT || 5000;

// Behind a proxy (e.g., Render, Heroku) so Express should trust X-Forwarded-* headers
// This prevents express-rate-limit from throwing when X-Forwarded-For is present
app.set("trust proxy", 1);

// 1) Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// 2) CORS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// 3) Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());

// 4) Rate limiting
app.use(authLimiter);

// 5) Health check
app.get("/healthz", (req, res) => res.sendStatus(200));

// 6) Routes
app.use("/ver", verRoute);
app.use("/admin", adminRoute);
app.use("/advertisement", adsRoute);
app.use("/jobs", jobRoute);
app.use("/workers", workerRoute);
app.use("/skills", skillsRoute);
app.use("/profile", profileRoute);
app.use("/id-verification", userIDVerificationRoute);
app.use("/client-management", clientManagementRoute);
app.use("/worker-management", workerManagementRoute);
app.use("/messages", messageRoute);
app.use("/api/dashboard", dashboardRoutes);

// Hiring system routes
app.use("/applications", applicationRoute);
app.use("/invitations", invitationRoute);
app.use("/contracts", contractRoute);

// Admin management routes
app.use("/job-management", jobManagementRoute);

// =====================
// Serve SPA in production (optional)
// Set SERVE_FRONTEND=true and deploy with frontend built to ../frontend/dist
// This will serve the Vite build and fall back to index.html for client routes
// while preserving API routes above.
// =====================
if (process.env.SERVE_FRONTEND === "true") {
  const frontendDist = path.resolve(__dirname, "../frontend/dist");
  if (!fs.existsSync(frontendDist)) {
    console.warn(
      `⚠️  SERVE_FRONTEND is true, but frontend build folder does not exist: ${frontendDist}`
    );
    console.warn(
      "   Ensure you run the frontend build during deployment so index.html and assets are available."
    );
  } else {
    console.log(`🗂️  Serving frontend from: ${frontendDist}`);
  }
  app.use(express.static(frontendDist));

  // SPA fallback for client-side routes
  // Serve index.html for any GET/HEAD that is not an API path and doesn't look like a file
  app.use((req, res, next) => {
    if (!(req.method === "GET" || req.method === "HEAD")) return next();

    // Ignore URLs that point to actual files like /assets/app.js, /favicon.ico, etc.
    const hasFileExtension = path.extname(req.path) !== "";

    // Known API route prefixes to exclude from SPA fallback
    const isApiRoute = /^\/(ver|admin|advertisement|jobs|workers|skills|profile|id-verification|client-management|worker-management|messages|api\/dashboard|applications|invitations|contracts|job-management)(\/|$)/.test(
      req.path
    );

    if (!hasFileExtension && !isApiRoute) {
      console.log(`🎯 [SPA] Fallback to index.html for path: ${req.method} ${req.path}`);
      return res.sendFile(path.join(frontendDist, "index.html"));
    }
    return next();
  });
}

// 7) 404 handler with diagnostics
app.use((req, res) => {
  console.warn(
    `⚠️  404 Not Found: ${req.method} ${req.path} | accept=${req.headers["accept"] || ""}`
  );
  res.status(404).json({ success: false, message: "Not Found" });
});

// 8) Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Create HTTP server
const server = http.createServer(app);

// =====================
// Socket.IO Setup
// =====================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Make io available globally to controllers
app.set("io", io);
socketBus.init(io);

// Track online users: Map<credentialId, Set<socketId>>
const userSockets = new Map();

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Register a credentialId for this socket (client must emit after login)
  socket.on("registerUser", (credentialId) => {
    if (!credentialId) return;
    const cred = String(credentialId);
    if (!userSockets.has(cred)) userSockets.set(cred, new Set());
    userSockets.get(cred).add(socket.id);
    socket.data.credentialId = cred;
    // Also join a personal room for user-targeted events
    const userRoom = `user:${cred}`;
    socket.join(userRoom);
    console.log(`✅ Registered user ${cred} on socket ${socket.id}`);
  });

  // Join a conversation room
  socket.on("joinConversation", (conversationId) => {
    if (!conversationId) return;
    const room = `conversation:${conversationId}`;
    socket.join(room);
    console.log(`📥 ${socket.id} joined room ${room}`);
  });

  // Optional: leave conversation
  socket.on("leaveConversation", (conversationId) => {
    if (!conversationId) return;
    const room = `conversation:${conversationId}`;
    socket.leave(room);
    console.log(`📤 ${socket.id} left room ${room}`);
  });

  // When client emits a sent message, broadcast it
  socket.on("sendMessage", (msg) => {
    try {
      const convId = msg.conversationId;
      if (!convId) return;

      const room = `conversation:${convId}`;
      console.log(`💬 Message in ${room}:`, msg);

      // Broadcast to everyone in the room except sender
      socket.to(room).emit("receiveMessage", msg);

      // Also send to recipient if they’re online but not currently in room
      const recipientCred = msg.toCredentialId
        ? String(msg.toCredentialId)
        : null;
      if (recipientCred && userSockets.has(recipientCred)) {
        userSockets.get(recipientCred).forEach((sockId) => {
          if (sockId !== socket.id) {
            io.to(sockId).emit("receiveMessage", msg);
          }
        });
      }
    } catch (err) {
      console.error("socket sendMessage error:", err);
    }
  });

  // Edit message
  socket.on("editMessage", (updatedMsg) => {
    try {
      const convId = updatedMsg.conversationId;
      if (!convId) return;
      const room = `conversation:${convId}`;
      console.log(`✏️ Edited message in ${room}:`, updatedMsg);

      // Broadcast to everyone in the room
      socket.to(room).emit("editMessage", updatedMsg);

      // Optional: also send to sender so the echo updates if needed
      socket.emit("editMessage", updatedMsg);
    } catch (err) {
      console.error("socket editMessage error:", err);
    }
  });

  // Delete message
  socket.on("deleteMessage", (deletedMsg) => {
    try {
      const convId = deletedMsg.conversationId;
      if (!convId) return;
      const room = `conversation:${convId}`;
      console.log(`🗑️ Deleted message in ${room}:`, deletedMsg);

      // Broadcast to everyone in the room
      socket.to(room).emit("deleteMessage", deletedMsg);

      // Optional: also send to sender so the UI updates immediately
      socket.emit("deleteMessage", deletedMsg);
    } catch (err) {
      console.error("socket deleteMessage error:", err);
    }
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    const cred = socket.data?.credentialId;
    if (cred && userSockets.has(cred)) {
      const set = userSockets.get(cred);
      set.delete(socket.id);
      if (set.size === 0) userSockets.delete(cred);
    }
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// =====================
// Start after DB connect
// =====================
connectDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);

      // Initialize cleanup tasks
      scheduleInvitationCleanup();
      console.log(
        "📧 Invitation cleanup scheduler initialized - runs every hour"
      );
      logger.info("Invitation cleanup scheduler started", {
        schedule: "every hour (0 * * * *)",
        timestamp: new Date().toISOString(),
      });
    });

    const shutdown = () => {
      console.log("👋 Shutting down...");
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
      io.close();
      setTimeout(() => process.exit(1), 10000);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  })
  .catch((err) => {
    console.error("❌ Failed to connect to DB:", err);
    process.exit(1);
  });
