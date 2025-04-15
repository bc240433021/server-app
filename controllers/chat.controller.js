import createHttpError from "http-errors";
import { io } from "../app.js";
import ChatMessageModel from "../models/chat-message.model.js";
import ChatRoomModel from "../models/chat-room.model.js";
import ClassModel from "../models/class.model.js";

export async function handleFindOrCreateRoom(req, res, next) {
  try {
    const { joinerId, creatorId } = req.body;

    const existingRoom = await ChatRoomModel.findOne({
      $or: [
        { $and: [{ creator: creatorId }, { joiner: joinerId }] },
        { $and: [{ joiner: creatorId }, { creator: joinerId }] },
      ],
    });

    let room = existingRoom;

    if (!existingRoom) {
      const newRoom = new ChatRoomModel({
        creator: creatorId,
        joiner: joinerId,
      });

      await newRoom.save();

      room = newRoom;
    }

    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export async function handleGetRoomMessages(req, res, next) {
  try {
    const { roomId } = req.params;

    const messages = await ChatMessageModel.find({
      room: roomId,
    })
      .sort({ createdAt: 1 })
      .populate("sender receiver room");

    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

export async function handleSendMessageToRoom(req, res, next) {
  try {
    const { classId } = req.params;
    const { text } = req.body;
    const { user, file } = req;

    const classObj = await ClassModel.findOne({ _id: classId });

    if (!classObj) throw createHttpError(404, "class-not-found");

    const existingRoom = await ChatRoomModel.findOne({ class: classObj._id }).populate("class messages");

    let chatRoom = existingRoom;

    if (!existingRoom) {
      const newRoom = new ChatRoomModel({
        class: classObj._id,
      });

      await newRoom.save();
      await newRoom.populate("class messages");

      chatRoom = newRoom;
    }

    const newMessage = new ChatMessageModel({
      sender: user._id,
      text,
      file: file
        ? {
            name: file.originalname,
            url: file.location,
          }
        : undefined,
      room: chatRoom._id,
    });

    await newMessage.save();

    await ChatRoomModel.updateOne({ _id: chatRoom._id }, { $push: { messages: newMessage } });

    io.emit("NEW_MESSAGE", { classId });

    res.json({ message: newMessage });
  } catch (err) {
    next(err);
  }
}

export async function handleGetClassGroupChat(req, res, next) {
  try {
    const { classId } = req.params;

    const classObj = await ClassModel.findOne({ _id: classId });

    if (!classObj) throw createHttpError(404, "class-not-found");

    const existingRoom = await ChatRoomModel.findOne({ class: classObj._id })
      .populate("class")
      .populate({
        path: "messages",
        populate: {
          path: "sender",
        },
      });

    let chatRoom = existingRoom;

    if (!existingRoom) {
      const newRoom = new ChatRoomModel({
        class: classObj._id,
      });

      await newRoom.save();
      await newRoom.populate("class", {
        path: "messages",
        populate: {
          path: "sender",
        },
      });

      chatRoom = newRoom;
    }

    return res.json({ class: chatRoom.class, messages: chatRoom.messages });
  } catch (err) {
    next(err);
  }
}
