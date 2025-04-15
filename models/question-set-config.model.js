import mongoose from "mongoose";
import { questionTypes } from "./question.model.js";

const schema = new mongoose.Schema(
  {
    score: Number,
    duration: Number,
    type: { type: String, enum: questionTypes },
    complementaryType: { type: String, enum: questionTypes },
    activationRepeatCountLimit: Number,
    questionSetId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const QuestionSetConfigModel = new mongoose.model("QuestionSetConfig", schema);

export default QuestionSetConfigModel;
