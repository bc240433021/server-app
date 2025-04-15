import mongoose from "mongoose";

const dataSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, ref: "People" },
    year: { type: Number, required: true }, // what was the user when saving this record
    month: { type: Number, required: true },
    week: { type: Number, required: true },
    day: { type: Number, required: true }, // the date
    rightQuestions: [{ type: mongoose.Types.ObjectId, ref: "Question" }],
    wrongQuestions: [{ type: mongoose.Types.ObjectId, ref: "Question" }],
    timeSpent: { type: Number, required: true, default: 0 }, // milliseconds - how much time he spent
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const AnalyticsModel = new mongoose.model("Analytics", dataSchema);

export default AnalyticsModel;
