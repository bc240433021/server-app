import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true },
    text: { type: String, trim: true },
    file: { name: String, url: String },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const ChatMessageModel = new mongoose.model("ChatMessage", schema);

export default ChatMessageModel;
