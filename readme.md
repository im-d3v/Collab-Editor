  ---
  # CodeCollab — Project Documentation

  # Overview

  CodeCollab is a real-time collaborative code editor that lets multiple users simultaneously edit the same document, chat, see each other's
  cursors, and manage access — all in the browser. Think Google Docs, but for code.

  ---
  # Features

  ┌─────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────┐
  │             Feature             │                                        Description                                        │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Real-time collaborative editing │ Multiple users type simultaneously; changes propagate in < 100ms via Socket.IO            │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Persistent chat                 │ Per-document chat rooms with history stored in MongoDB (last 100 messages)                │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Live cursor tracking            │ Remote users' cursor positions and text selections shown as colored decorations in Monaco │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Online presence                 │ Collaborators panel shows who is currently in the document (green/gray status dots)       │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Typing indicator                │ Chat shows "{name} is typing…" feedback                                                   │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Document management             │ Create, rename, delete, and export documents                                              │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Access control                  │ Share documents by email; owner controls who can access                                   │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Copy invite link                │ One-click clipboard copy for sharing the editor URL                                       │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Language selector               │ 10 languages supported; syntax highlighting switches live                                 │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ File export                     │ Download current content as a file with the correct extension                             │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Auto-save                       │ Document content debounced-saved to MongoDB 1.2s after you stop typing                    │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Toast notifications             │ Non-blocking success/error/info/warning toasts for all user actions                       │
  ├─────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ Dark theme                      │ Full dark design system using CSS custom properties                                       │
  └─────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────┘

  ---
  # Architecture

  ┌──────────────────────────────────────────────────────┐
  │                    Browser (React)                   │
  │  Dashboard → CodeEditor → MainEditor + Chat + Sidebar│
  │                        │                             │
  │              REST API  │  WebSocket (Socket.IO)      │
  └────────────────────────┼─────────────────────────────┘
                           │
  ┌───────────────────────▼──────────────────────────────┐
  │              Express 5 + Socket.IO Server            │
  │   /api/auth   /api/documents   socket.io namespace   │
  └───────────────────────┬──────────────────────────────┘
                           │
  ┌───────────────────────▼──────────────────────────────┐
  │                  MongoDB (Mongoose 8)                │
  │          Users collection  +  Documents collection   │
  └──────────────────────────────────────────────────────┘

  # Frontend Structure

  frontend/src/
    App.jsx                  # Routes + providers
    index.css                # Design system (CSS vars, shared classes)
    api.js                   # Axios instance with JWT interceptor
    apiCall/apiCalls.js      # Typed API helper functions
    context/
      AuthContext.jsx         # JWT decode, login/logout
      ToastContext.jsx        # Global toast notifications
    socket/
      socket.js               # Socket.IO client singleton
      useSocket.js            # Hook: join_room / leave_room lifecycle
    pages/
      Login.jsx / Signup.jsx  # Auth pages
      Dashboard/Dashboard.jsx # Document list, create, delete, search
      Editor/
        CodeEditor.jsx        # Layout controller (sidebar/chat state)
        components/
          Editor.jsx           # Monaco editor + toolbar + status bar
          Chat.jsx             # Persistent chat panel
          Sidebar.jsx          # Collaborators panel with online presence
    components/
      Modal/ShareModal.jsx    # Share by email + copy link
      PrivateRoute.jsx        # Auth guard
      NotFound.jsx

  # Backend Structure

  backend/
    app.js                   # Express setup, CORS, routes mount
    server.js                # HTTP + Socket.IO init
    models/
      User.js                 # { name, email (normalized), password (bcrypt) }
      Document.js             # { title, language, content, owner, sharedWith[], chatMessages[] }
    controllers/
      authController.js       # signup, login (JWT)
      documentController.js   # CRUD + share + getChatHistory
    routes/
      authRoutes.js
      documentRoutes.js
    socket/
      socketHandler.js        # All socket events
    middleware/
      authMiddleware.js        # JWT verify → req.user

  ---
  # Data Models

  ## User

  {
    name: String,
    email: String,        // stored lowercase-trimmed
    password: String,     // bcrypt hash
    createdAt, updatedAt  // Mongoose timestamps
  }

  ## Document

  {
    title: String,
    language: String,     // javascript | python | java | c | cpp | typescript | html | css | json | markdown
    content: String,
    owner: ObjectId,      // ref: User
    sharedWith: [ObjectId], // ref: User
    chatMessages: [{
      userId: String,
      username: String,
      message: String,
      timestamp: Date
    }],                   // capped at 100 via $slice on insert
    createdAt, updatedAt
  }

  ---
  # REST API Endpoints

  All routes except auth require Authorization: Bearer <token> header.

  ┌────────┬──────────────────────────┬───────────────────────────────────────────────┐
  │ Method │          Route           │                  Description                  │
  ├────────┼──────────────────────────┼───────────────────────────────────────────────┤
  │ POST   │ /api/auth/signup         │ Create account → returns { token, user }      │
  ├────────┼──────────────────────────┼───────────────────────────────────────────────┤
  │ POST   │ /api/auth/login          │ Sign in → returns { token, user }             │
  ├────────┼──────────────────────────┼───────────────────────────────────────────────┤
  │ GET    │ /api/documents           │ List all docs owned or shared with caller     │
  ├────────┼──────────────────────────┼───────────────────────────────────────────────┤
  │ POST   │ /api/documents           │ Create new document                           │
  ├────────┼──────────────────────────┼───────────────────────────────────────────────┤
  │ GET    │ /api/documents/:id       │ Get single document (must be owner or shared) │
  ├────────┼──────────────────────────┼───────────────────────────────────────────────┤
  │ PUT    │ /api/documents/:id       │ Update title/language/content                 │
  ├────────┼──────────────────────────┼───────────────────────────────────────────────┤
  │ DELETE │ /api/documents/:id       │ Delete (owner only)                           │
  ├────────┼──────────────────────────┼───────────────────────────────────────────────┤
  │ POST   │ /api/documents/:id/share │ Share with email address                      │
  ├────────┼──────────────────────────┼───────────────────────────────────────────────┤
  │ GET    │ /api/documents/:id/chat  │ Get last 100 chat messages                    │
  ├────────┼──────────────────────────┼───────────────────────────────────────────────┤
  │ GET    │ /api/health              │ Health check → { status: "ok" }               │
  └────────┴──────────────────────────┴───────────────────────────────────────────────┘

  ---
  # Socket.IO Events

  ## Client → Server

  ┌──────────────────┬───────────────────────────────────────────┬──────────────────────────────────────────────────┐
  │      Event       │                  Payload                  │                   Description                    │
  ├──────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ join_room        │ { room, user }                            │ Join document room; triggers user_list broadcast │
  ├──────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ leave_room       │ { room, user }                            │ Leave room gracefully                            │
  ├──────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ send_code        │ { room, code }                            │ Broadcast code change to room                    │
  ├──────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ user_editing     │ { room, user }                            │ Notify room user is editing                      │
  ├──────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ cursor_position  │ { room, user, position }                  │ Broadcast cursor line/col                        │
  ├──────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ cursor_selection │ { room, user, selection }                 │ Broadcast text selection range                   │
  ├──────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ send_chat        │ { documentId, userId, username, message } │ Send chat message + persist to DB                │
  ├──────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────────────┤
  │ typing           │ { documentId, user }                      │ Broadcast typing indicator                       │
  └──────────────────┴───────────────────────────────────────────┴──────────────────────────────────────────────────┘

  ## Server → Client

  ┌──────────────────────────┬───────────────────────────────────────────┬──────────────────────────────────────────┐
  │          Event           │                  Payload                  │               Description                │
  ├──────────────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────┤
  │ user_list                │ [{ _id, name }]                           │ Current users in room (after join/leave) │
  ├──────────────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────┤
  │ receive_code             │ code                                      │ Incoming code change                     │
  ├──────────────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────┤
  │ receive_cursor_position  │ { userId, position }                      │ Remote cursor position                   │
  ├──────────────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────┤
  │ receive_cursor_selection │ { userId, selection }                     │ Remote selection range                   │
  ├──────────────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────┤
  │ receive_chat             │ { userId, username, message, timestamp? } │ Incoming chat message                    │
  ├──────────────────────────┼───────────────────────────────────────────┼──────────────────────────────────────────┤
  │ user_typing              │ user                                      │ Someone is typing in chat                │
  └──────────────────────────┴───────────────────────────────────────────┴──────────────────────────────────────────┘

  ---
  # Environment Variables

  Backend (backend/.env)

  MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/collab-editor
  JWT_SECRET=your_super_secret_key_here
  CLIENT_ORIGIN=http://localhost:5173
  SOCKET_ORIGIN=http://localhost:5173
  PORT=3000

  Frontend (frontend/.env)

  VITE_API_URL=http://localhost:3000/api
  VITE_SOCKET_URL=http://localhost:3000

  ---
  Local Development

  # 1. Install dependencies
  cd backend && npm install
  cd ../frontend && npm install

  # 2. Create .env files (see above)

  # 3. Start backend
  cd backend && npm run dev    # nodemon, port 3000

  # 4. Start frontend
  cd frontend && npm run dev   # Vite, port 5173

  ---