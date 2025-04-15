import mongoose from "mongoose";
import { z } from "zod";

export const questionTypes = ["MCQ", "CHECKBOXES", "TRUE-OR-FALSE", "FREE-TEXT", "SORTER", "FILL-IN-THE-GAPS"];

export const questionSchema = z.object({
  question: z.string().optional(),
  details: z.string().optional(),
  type: z.enum(questionTypes),
  score: z.number().min(1),
  explanation: z.string().optional(),
  options: z.string().array(),
  duration: z.number(),
  answers: z.string().array(),
  textQuestionHtml: z.string().optional(),
  fileLink: z.string().optional(),
  activationRepeatCountLimit: z.number().optional(),
});

const schema = new mongoose.Schema(
  {
    question: { type: String },
    details: String,
    type: {
      type: String,
      enum: questionTypes,
      required: true,
    },

    options: [String],
    answers: Array,
    textQuestionHtml: String,

    activationRepeatCountLimit: { type: Number, default: 0 },
    activateImmediately: { type: Boolean, default: true },

    complementaryQuestion: {
      question: String,
      details: String,
      type: {
        type: String,
        enum: questionTypes,
      },
      options: [String],
      answers: [String],
      explanation: String,
      duration: { type: Number, default: 10 },
      textQuestionHtml: String,
      fileLink: String,
      score: Number, // point the student will get if he gives correct answer

      videoExplanationLinks: { type: [String], default: [] },
      pdfExplanationLinks: { type: [String], default: [] },
      youtubeEmbedCodes: { type: [String], default: [] },
    },

    hasComplementaryQuestion: { type: Boolean, default: false },

    videoExplanationLinks: { type: [String], default: [] },
    pdfExplanationLinks: { type: [String], default: [] },
    youtubeEmbedCodes: { type: [String], default: [] },

    explanation: String,
    score: Number, // point the student will get if he gives correct answer
    fileLink: String,
    duration: { type: Number, default: 10 }, // number of seconds the student will get for answering this question
    questionSet: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionSet", required: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true },
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const QuestionModel = new mongoose.model("Question", schema);

export default QuestionModel;
