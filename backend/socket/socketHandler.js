const Document = require('../models/Document');

const documentUsers = {};
const editingUsers = {};

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
    });

    socket.on("leave_room", (documentId) => {
      socket.leave(documentId);
      const userId = socket.data.user?._id;
      if (userId && documentUsers[documentId]) {
        documentUsers[documentId] = documentUsers[documentId].filter(u => u._id !== userId);
        io.to(documentId).emit("user_list", documentUsers[documentId]);
      }
    });

    socket.on("send_code", ({ code, room }) => {
      socket.to(room).emit("receive_code", code);
    });

    socket.on("send_chat", async ({ documentId, ...message }) => {
      socket.to(documentId).emit("receive_chat", message);
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
          socket.to(room).emit("user_editing_update", {
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
