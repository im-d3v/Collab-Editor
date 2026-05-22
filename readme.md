# CodeCollab

Real-time collaborative code editor built with React, Express, Socket.IO, and MongoDB.

Think Google Docs, but for code.

---

# Features

| Feature | Description |
|---|---|
| Real-time collaborative editing | Multiple users type simultaneously; changes propagate in under 100ms via Socket.IO |
| Persistent chat | Per-document chat rooms with history stored in MongoDB (last 100 messages) |
| Live cursor tracking | Remote users' cursor positions and text selections shown as Monaco decorations |
| Online presence | Collaborators panel shows who is currently in the document |
| Typing indicator | Chat shows `{name} is typing...` feedback |
| Document management | Create, rename, delete, and export documents |
| Access control | Share documents by email; owner controls access |
| Copy invite link | One-click clipboard copy for sharing editor URL |
| Language selector | 10 languages supported with live syntax switching |
| File export | Download current content with correct extension |
| Auto-save | Debounced save to MongoDB after typing stops |
| Toast notifications | Success/error/info/warning notifications |
| Dark theme | Full dark design system using CSS variables |

---

# Tech Stack

## Frontend
- React
- Vite
- Monaco Editor
- Socket.IO Client
- Axios
- Context API

## Backend
- Node.js
- Express 5
- Socket.IO
- MongoDB
- Mongoose 8
- JWT Authentication
- bcrypt

---

# Architecture

```text
┌──────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│ Dashboard → CodeEditor → MainEditor + Chat + Sidebar │
│                        │                             │
│              REST API  │  WebSocket (Socket.IO)      │
└────────────────────────┼─────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────┐
│             Express 5 + Socket.IO Server             │
│    /api/auth   /api/documents   socket.io namespace  │
└────────────────────────┬─────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────┐
│                MongoDB (Mongoose 8)                  │
│       Users collection + Documents collection        │
└──────────────────────────────────────────────────────┘
```

---

# Frontend Structure

```text
frontend/src/
├── App.jsx
├── index.css
├── api.js
├── apiCall/
│   └── apiCalls.js
├── context/
│   ├── AuthContext.jsx
│   └── ToastContext.jsx
├── socket/
│   ├── socket.js
│   └── useSocket.js
├── pages/
│   ├── Login.jsx
│   ├── Signup.jsx
│   ├── Dashboard/
│   │   └── Dashboard.jsx
│   └── Editor/
│       ├── CodeEditor.jsx
│       └── components/
│           ├── Editor.jsx
│           ├── Chat.jsx
│           └── Sidebar.jsx
├── components/
│   ├── Modal/
│   │   └── ShareModal.jsx
│   ├── PrivateRoute.jsx
│   └── NotFound.jsx
```

---

# Backend Structure

```text
backend/
├── app.js
├── server.js
├── models/
│   ├── User.js
│   └── Document.js
├── controllers/
│   ├── authController.js
│   └── documentController.js
├── routes/
│   ├── authRoutes.js
│   └── documentRoutes.js
├── socket/
│   └── socketHandler.js
└── middleware/
    └── authMiddleware.js
```

---

# Data Models

## User

```js
{
  name: String,
  email: String,
  password: String,
  createdAt,
  updatedAt
}
```

## Document

```js
{
  title: String,
  language: String,
  content: String,
  owner: ObjectId,
  sharedWith: [ObjectId],
  chatMessages: [{
    userId: String,
    username: String,
    message: String,
    timestamp: Date
  }],
  createdAt,
  updatedAt
}
```

---

# REST API Endpoints

All routes except auth require:

```http
Authorization: Bearer <token>
```

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/documents` | Get all accessible documents |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/:id` | Get single document |
| PUT | `/api/documents/:id` | Update document |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/documents/:id/share` | Share document |
| GET | `/api/documents/:id/chat` | Get chat history |
| GET | `/api/health` | Health check |

---

# Socket.IO Events

## Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_room` | `{ room, user }` | Join document room |
| `leave_room` | `{ room, user }` | Leave room |
| `send_code` | `{ room, code }` | Broadcast code |
| `user_editing` | `{ room, user }` | User editing status |
| `cursor_position` | `{ room, user, position }` | Cursor updates |
| `cursor_selection` | `{ room, user, selection }` | Text selection |
| `send_chat` | `{ documentId, userId, username, message }` | Send chat |
| `typing` | `{ documentId, user }` | Typing indicator |

## Server → Client

| Event | Payload | Description |
|---|---|---|
| `user_list` | `[{ _id, name }]` | Current users |
| `receive_code` | `code` | Incoming code |
| `receive_cursor_position` | `{ userId, position }` | Remote cursor |
| `receive_cursor_selection` | `{ userId, selection }` | Remote selection |
| `receive_chat` | `{ userId, username, message }` | Incoming chat |
| `user_typing` | `user` | Typing indicator |

---

# Environment Variables

## Backend (`backend/.env`)

```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/collab-editor
JWT_SECRET=your_super_secret_key_here
CLIENT_ORIGIN=http://localhost:5173
SOCKET_ORIGIN=http://localhost:5173
PORT=3000
```

## Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

---

# Local Development

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/codecollab.git
cd codecollab
```

## 2. Install Dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

---

## 3. Configure Environment Variables

Create `.env` files in both `backend/` and `frontend/`.

---

## 4. Start Backend

```bash
cd backend
npm run dev
```

Runs on:

```text
http://localhost:3000
```

---

## 5. Start Frontend

```bash
cd frontend
npm run dev
```

Runs on:

```text
http://localhost:5173
```

---

# Future Improvements

- Operational Transform / CRDT support
- Voice chat
- Multi-file projects
- Docker deployment
- Syntax-aware conflict resolution
- Presence avatars
- AI code assistant

---

# License

MIT
