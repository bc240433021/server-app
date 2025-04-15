import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Person" },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ActivationSessionQuestion",
      },
    ],
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const ActivationSessionModel = new mongoose.model("ActivationSession", schema);

export default ActivationSessionModel;
