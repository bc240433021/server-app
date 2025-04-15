import createHttpError from "http-errors";
import QuestionSetConfigModel from "../models/question-set-config.model.js";
import QuestionSetModel from "../models/question-set.model.js";
import QuestionModel from "../models/question.model.js";
import QuestionSetService from "../services/question-set.service.js";

export async function handleGetQuestionSets(req, res, next) {
  try {
    const { institution: institutionId } = req.user;

    const questionSets = await QuestionSetService.getAll(institutionId, req.user._id);

    res.json({ questionSets });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateQuestionSet(req, res, next) {
  try {
    const { name } = req.body;
    const { institution: institutionId } = req.user;

    const questionSet = new QuestionSetModel({ name, institution: institutionId, user: req.user._id });

    await questionSet.save();

    res.status(201).json({ message: "question-set-created-message", questionSet });
  } catch (err) {
    next(err);
  }
}

export async function handleEditQuestionSet(req, res, next) {
  try {
    const { questionSetId, ...update } = req.body;

    const existingQuestionSet = await QuestionSetModel.findOne({
      $and: [{ _id: questionSetId }, { institution: req.user.institution }, { user: req.user._id }],
    });

    if (!existingQuestionSet) {
      throw createHttpError(404, "question-set-not-found");
    }

    await QuestionSetModel.updateOne({ _id: questionSetId }, { ...update });

    return res.json({ message: "question-set-update-successful" });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteQuestionSet(req, res, next) {
  try {
    const { questionSetId } = req.params;

    const existingQuestionSet = await QuestionSetModel.findOne({
      $and: [{ _id: questionSetId }, { institution: req.user.institution }, { user: req.user._id }],
    });

    if (!existingQuestionSet) {
      throw createHttpError(404, "question-set-not-found");
    }

    await QuestionSetModel.deleteOne({ _id: questionSetId });

    res.json({ message: "question-set-deleted-message" });
  } catch (err) {
    next(err);
  }
}

export async function handleGetQuestions(req, res, next) {
  try {
    const { questionSetId } = req.params;

    const { questions, questionSetName } = await QuestionSetService.getQuestions(
      questionSetId,
      req.user.institution,
      req.user._id
    );

    res.json({ questions, questionSetName });
  } catch (err) {
    next(err);
  }
}

export async function handleGetQuestionById(req, res, next) {
  try {
    const { questionId } = req.params;

    const question = await QuestionSetService.getQuestionById(questionId, req.user.institution, req.user._id);

    if (!question) throw createHttpError(404, "question-not-found");

    res.json({ question });
  } catch (err) {
    next(err);
  }
}

export async function handleAddQuestion(req, res, next) {
  try {
    const { questionSetId } = req.params;

    const newQuestion = new QuestionModel({
      ...req.body,
      questionSet: questionSetId,
      institution: req.user.institution,
      user: req.user._id,
    });

    await newQuestion.save();

    await QuestionSetModel.updateOne({ _id: questionSetId }, { $push: { questions: newQuestion } });

    res.status(201).json({ message: "question-added-message", question: newQuestion });
  } catch (err) {
    next(err);
  }
}

export async function handleImportQuestions(req, res, next) {
  try {
    const { questionSetId, targetQuestionSetId } = req.params;

    const questions = await QuestionModel.find({ questionSet: targetQuestionSetId });

    const newQuestions = questions.map((questionSnap) => {
      // eslint-disable-next-line no-unused-vars
      const { _id, ...question } = questionSnap._doc;
      return {
        ...question,
        questionSet: questionSetId,
        user: req.user._id,
        institution: req.user.institution,
      };
    });

    for (const newQuestion of newQuestions) {
      const question = new QuestionModel(newQuestion);
      await question.save();
      await QuestionSetModel.updateOne({ _id: questionSetId }, { $push: { questions: question } });
    }

    return res.json({ message: "questions-imported" });
  } catch (err) {
    next(err);
  }
}

export async function handleEditQuestion(req, res, next) {
  try {
    const { questionId, isComplementary, activateImmediately, activationRepeatCountLimit, ...update } = req.body;

    if (isComplementary) {
      const question = await QuestionModel.findOne({ _id: questionId });

      question.activateImmediately = activateImmediately;
      question.activationRepeatCountLimit = activationRepeatCountLimit;

      if (!question.hasComplementaryQuestion) {
        question.complementaryQuestion = {
          ...update,
        };
        question.hasComplementaryQuestion = true;
      } else {
        question.complementaryQuestion = {
          ...update,
        };
      }

      await question.save();
    } else {
      await QuestionModel.findByIdAndUpdate(questionId, { ...update }, { new: true });
    }

    res.json({ message: "question-updated" });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteQuestion(req, res, next) {
  try {
    const { questionId } = req.params;

    const deletedQuestion = await QuestionModel.findByIdAndDelete(questionId);

    await QuestionSetModel.updateOne(
      { _id: deletedQuestion.questionSet },
      { $pull: { questions: deletedQuestion._id } }
    );

    res.json({ message: "question-deleted" });
  } catch (err) {
    next(err);
  }
}

export async function handleGetQuestionSetConfig(req, res, next) {
  try {
    const { questionSetId } = req.params;

    const questionSetConfig = await QuestionSetConfigModel.findOne({ questionSetId });

    return res.json({ settings: questionSetConfig });
  } catch (err) {
    next(err);
  }
}

export async function handleEditQuestionSetConfig(req, res, next) {
  try {
    const { questionSetId } = req.params;

    await QuestionSetConfigModel.findOneAndUpdate({ questionSetId }, { ...req.body }, { new: true, upsert: true });

    return res.json({ message: "question-set-config-updated" });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteComplementaryQuestion(req, res, next) {
  try {
    const { questionId } = req.params;

    const question = await QuestionModel.findOne({ _id: questionId });

    question.hasComplementaryQuestion = false;
    question.complementaryQuestion = {
      question: "",
      details: "",
      type: "MCQ",
      options: [],
      answers: [],
      explanation: "",
      duration: 10,
      textQuestionHtml: "",
      fileLink: "",
      score: 10, // point the student will get if he gives correct answer

      videoExplanationLinks: [],
      pdfExplanationLinks: [],
      youtubeEmbedCodes: [],
    };

    await question.save();

    return res.json({ message: "question-deleted" });
  } catch (err) {
    next(err);
  }
}
