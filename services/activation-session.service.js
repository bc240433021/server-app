import ActivationSessionModel from "../models/activation-session.model.js";

const ActivationSessionService = {
  async get(studentId, sessionId) {
    const doc = await ActivationSessionModel.findOne({ $and: [{ student: studentId }, { session: sessionId }] });
    return doc;
  },
};

export default ActivationSessionService;
