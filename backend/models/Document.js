const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  username:  { type: String, required: true },
  message:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const documentSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true, default: "Untitled" },
    language:     { type: String, default: "javascript" },
    content:      { type: String, default: "" },
    owner:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sharedWith:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    chatMessages: { type: [chatMessageSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
