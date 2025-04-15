import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Person", required: true },
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const ClassModel = new mongoose.model("Class", schema);

export default ClassModel;
