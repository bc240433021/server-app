import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    postalCodeAndCity: { type: String, required: true },
    province: { type: String, required: true },
    phone: { type: String, required: true },
    type: { type: String, required: true },
    employeeName: { type: String, required: true },
    employeePosition: { type: String, required: true },

    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],

    isApproved: { type: Boolean, default: false },

    // stripe
    stripeCustomerId: { type: String, select: false },
    stripeSubscriptionId: { type: String, select: false },
    stripeCurrentPeriodEnd: { type: Date, select: false },
    stripePriceId: { type: String, select: false },
  },
  { timestamps: true }
);

/**
 * @type {import('mongoose').Model}
 */
const InstitutionModel = new mongoose.model("Institution", schema);

export default InstitutionModel;
