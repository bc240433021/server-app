import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" }],
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const ChatRoomModel = new mongoose.model("ChatRoom", schema);

export default ChatRoomModel;
