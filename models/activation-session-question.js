import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    questionObj: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Person" },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    correctAnsweredCount: { type: Number, default: 0 },
    lastAnsweredCorrect: { type: Date, default: new Date() },
  },
  { timestamps: true }
);

schema.statics.findOneOrCreate = function (condition, callback) {
  const self = this;
  self.findOne(condition, (err, result) => {
    return result
      ? callback(err, result)
      : self.create(condition, (err, result) => {
          return callback(err, result);
        });
  });
};

/**
 * @type {import('mongoose').Model}
 */
const ActivationSessionQuestionModel = new mongoose.model("ActivationSessionQuestion", schema);

export default ActivationSessionQuestionModel;
