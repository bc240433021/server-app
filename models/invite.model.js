import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    emails: [String],
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    link: String,
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true },
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const InviteModel = new mongoose.model("Invite", schema);

export default InviteModel;
