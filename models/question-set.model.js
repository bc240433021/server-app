import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true },
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const QuestionSetModel = new mongoose.model("QuestionSet", schema);

export default QuestionSetModel;
