const Document = require('../models/Document');

const documentUsers = {};
const editingUsers = {};
// Server-authoritative state for conflict detection
const documentVersion = {};   // roomId -> current version number
const documentContent = {};   // roomId -> latest content string (in-memory for active sessions)

function socketHandler(io) {
  io.on("connection", (socket) => {

    socket.on("join_room", ({ documentId, user }) => {
      socket.join(documentId);
      socket.data.documentId = documentId;
      socket.data.user = user;

      if (!documentUsers[documentId]) documentUsers[documentId] = [];
      if (!documentUsers[documentId].some(u => u._id === user._id)) {
        documentUsers[documentId].push(user);
      }
      io.to(documentId).emit("user_list", documentUsers[documentId]);

      // If this room already has in-memory content (other users are active),
      // push it to the newly-joined socket so everyone stays in sync.
      if (documentContent[documentId] !== undefined) {
        socket.emit("receive_code", {
          code: documentContent[documentId],
          version: documentVersion[documentId] || 0,
        });
      }
    });

    socket.on("leave_room", (documentId) => {
      socket.leave(documentId);
      const userId = socket.data.user?._id;
      if (userId && documentUsers[documentId]) {
        documentUsers[documentId] = documentUsers[documentId].filter(u => u._id !== userId);
        io.to(documentId).emit("user_list", documentUsers[documentId]);
      }
    });

    socket.on("send_code", ({ code, room, baseVersion }) => {
      // Initialise version tracking for this room on first edit
      if (documentVersion[room] === undefined) {
        documentVersion[room] = 0;
      }

      // --- Conflict detection ---
      // baseVersion is the version the client last received from the server.
      // If it differs from the current room version, this edit was based on
      // stale content — reject it and send the authoritative state back.
      if (baseVersion !== undefined && baseVersion !== documentVersion[room]) {
        socket.emit("code_conflict", {
          code: documentContent[room],
          version: documentVersion[room],
        });
        return;
      }

      // Accept the edit: advance version and cache content
      documentVersion[room]++;
      documentContent[room] = code;

      // Tell the sender what the new server version is
      socket.emit("code_accepted", { version: documentVersion[room] });

      // Broadcast the new content+version to every other client in the room
      socket.to(room).emit("receive_code", { code, version: documentVersion[room] });
    });

    socket.on("send_chat", async ({ documentId, ...message }) => {
      const outgoing = { ...message, timestamp: message.timestamp || new Date().toISOString() };
      socket.to(documentId).emit("receive_chat", outgoing);
      try {
        await Document.updateOne(
          { _id: documentId },
          {
            $push: {
              chatMessages: {
                $each: [{ userId: message.userId, username: message.username, message: message.message }],
                $slice: -100,
              },
            },
          }
        );
      } catch (err) {
        console.error("Chat persist error:", err.message);
      }
    });

    socket.on("typing", ({ documentId, user }) => {
      socket.to(documentId).emit("user_typing", user);
    });

    socket.on("user_editing", ({ room, user }) => {
      if (!editingUsers[room]) editingUsers[room] = {};
      editingUsers[room][user._id] = Date.now();

      io.to(room).emit("user_editing_update", {
        userId: user._id,
        name: user.name,
        isEditing: true,
      });

      setTimeout(() => {
        const lastEdit = editingUsers[room]?.[user._id];
        if (lastEdit && Date.now() - lastEdit >= 3000) {
          delete editingUsers[room][user._id];
          io.to(room).emit("user_editing_update", {
            userId: user._id,
            name: user.name,
            isEditing: false,
          });
        }
      }, 3500);
    });

    socket.on("cursor_position", ({ room, user, position }) => {
      socket.to(room).emit("receive_cursor_position", { userId: user._id, position });
    });

    socket.on("cursor_selection", ({ room, user, selection }) => {
      socket.to(room).emit("receive_cursor_selection", { userId: user._id, selection });
    });

    socket.on("disconnect", () => {
      const documentId = socket.data.documentId;
      const userId = socket.data.user?._id;
      if (documentId && userId && documentUsers[documentId]) {
        documentUsers[documentId] = documentUsers[documentId].filter(u => u._id !== userId);
        io.to(documentId).emit("user_list", documentUsers[documentId]);
      }
    });
  });
}

module.exports = socketHandler;
