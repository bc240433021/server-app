import QuestionModel from "../models/question.model.js";
import SessionModel from "../models/session.model.js";

const SessionService = {
  /**
   * @param {String} id
   */
  async getAll(id) {
    const sessions = await SessionModel.find({
      $or: [{ institution: id }, { user: id }],
    }).sort({ createdAt: -1 });
    return sessions;
  },

  /**
   * @param {String} sessionId
   * @param {String} institutionId
   * @param {String} userId
   */
  async getById(sessionId, institutionId) {
    return await SessionModel.findOne({
      $and: [{ _id: sessionId }, { institution: institutionId }],
    });
  },

  async getByCode(code) {
    return await SessionModel.findOne({
      $and: [{ code }],
    });
  },

  /**
   * @param {Array} questionSets
   * @param {String} institutionId
   * @param {String} userId
   */
  async getQuestions(questionSets, institutionId, userId) {
    return await QuestionModel.find({
      $and: [{ questionSet: { $in: questionSets } }, { institution: institutionId }, { user: userId }],
    });
  },
};

export default SessionService;
