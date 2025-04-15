import mongoose from "mongoose";

const dataSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, ref: "People" },
    timeSpent: { type: Number, required: true, default: 0 }, // milliseconds - how much time he spent
    date: { type: String, required: true }, // DD/MM/YY format
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    sessions: [{ type: mongoose.Types.ObjectId, ref: "Session" }],
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const StudentLogModel = new mongoose.model("StudentLog", dataSchema);

export default StudentLogModel;
