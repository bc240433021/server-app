import createHttpError from "http-errors";
import QuestionSetModel from "../models/question-set.model.js";
import QuestionModel from "../models/question.model.js";

const QuestionSetService = {
  async getAll(institutionId, userId) {
    return await QuestionSetModel.find({
      $and: [{ institution: institutionId }, { user: userId }],
    }).sort({ createdAt: -1 });
  },

  async getQuestions(questionSetId, institutionId, userId) {
    const questionSet = await QuestionSetModel.findOne({
      $and: [{ _id: questionSetId }, { institution: institutionId }, { user: userId }],
    });

    if (!questionSet) throw createHttpError(404, "question-set-not-found-error");

    const questions = await QuestionModel.find({ questionSet: questionSet._id });

    return { questions, questionSetName: questionSet.name };
  },

  async getQuestionById(questionId, institutionId, userId) {
    return await QuestionModel.findOne({
      $and: [{ _id: questionId }, { institution: institutionId }, { user: userId }],
    });
  },
};

export default QuestionSetService;
