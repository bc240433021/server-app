import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    /**
     * Student email and username would be the same.
     * Meaning he created an account with his email and this email would be considered as the username.
     */
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ["TEACHER", "ADMIN", "SCHOOL-ADMIN", "STUDENT"], default: "TEACHER" },

    c2lUserId: String,

    // stripe
    stripeCustomerId: { type: String, select: false },
    stripeSubscriptionId: { type: String, select: false },
    stripeCurrentPeriodEnd: { type: Date, select: false },
    stripeTrialEnd: { type: Date, selet: false },
    stripePriceId: { type: String, select: false },

    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution" },
  },
  { timestamps: true }
);

// hash the user's password before saving the user to the database
schema.pre("save", async function (next) {
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// generating a web token
schema.methods.generateWebToken = function () {
  return jwt.sign({ id: this._id.toString(), role: this.role, name: this.name }, process.env.JWT_SECRET);
};

/**
 * @type {import('mongoose').Model}
 */
const UserModel = new mongoose.model("Person", schema);

export default UserModel;
