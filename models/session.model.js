import mongoose from "mongoose";
import { nanoid } from "nanoid";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, default: nanoid(6) },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    ended: { type: Boolean, required: true, default: false },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true },
    settings: {
      showSolutions: { type: Boolean, default: true },
      shuffleQuestions: { type: Boolean, default: false },
      shuffleAnswerOptions: { type: Boolean, default: true },
      allowGuestStudents: { type: Boolean, default: false },
      startsAt: Date,
      endsAt: Date,
      totalDurationMinutes: Number,
    },
    hasInvitedAClass: Boolean,
    invitedClass: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
    doneStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
    submissions: [
      {
        studentId: String,
        questionId: String,
        score: String,
        status: { type: String, enum: ["CORRECT", "WRONG", "REVIEWING"] },
        answers: Array, // answers the student has given
        correctAnswers: Array, // correct answers to the question
      },
    ],
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const SessionModel = new mongoose.model("Session", schema);

export default SessionModel;
