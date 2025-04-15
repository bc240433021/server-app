import createHttpError from "http-errors";
import { nanoid } from "nanoid";
import { io } from "../app.js";
import checkSubmissionStatus from "../helpers/test/check-submission-status.js";
import ActivationSessionQuestionModel from "../models/activation-session-question.js";
import ActivationSessionModel from "../models/activation-session.model.js";
import AnalyticsModel from "../models/analytics.model.js";
import QuestionSetModel from "../models/question-set.model.js";
import SessionModel from "../models/session.model.js";
import UserModel from "../models/user.model.js";
import ActivationSessionService from "../services/activation-session.service.js";
import checkAnalyticsExistence, { AnalyticsService } from "../services/analytics.service.js";
import ClassService from "../services/class.service.js";
import QuestionSetService from "../services/question-set.service.js";
import SessionService from "../services/session.service.js";

const ONE_DAY_MS = 86_400_000;

export async function handleGetAllSessions(req, res, next) {
  try {
    const sessions = await SessionService.getAll(req.user._id);

    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateSession(req, res, next) {
  try {
    const { questionSets } = req.body;

    if (!questionSets.length) throw createHttpError(403, "no-question-sets-included");

    const questionSetId1 = questionSets[0];

    const questionSet1 = await QuestionSetModel.findOne({ _id: questionSetId1 });

    const questions = await SessionService.getQuestions(questionSets, req.user.institution, req.user._id);

    const newSession = new SessionModel({
      code: nanoid(6),
      name: questionSet1?.name || "Untitled",
      questions,
      institution: req.user.institution,
      user: req.user._id,
    });

    await newSession.save();

    res.status(201).json({ session: newSession });
  } catch (err) {
    next(err);
  }
}

export async function handleEditSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const update = req.body;

    const session = await SessionService.getById(sessionId, req.user.institution, req.user._id);

    if (!session) throw createHttpError(404, "session-not-found");

    const updatedSession = await SessionModel.findOneAndUpdate({ _id: session._id }, { ...update }, { new: true });

    res.json({ message: "session-updated", session: updatedSession });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteSession(req, res, next) {
  try {
    const { sessionId } = req.params;

    const deletedSession = await SessionModel.findOneAndDelete({
      $and: [{ _id: sessionId }, { institution: req.user.institution }, { user: req.user._id }],
    });

    io.emit("SESSION_UPDATE", { code: deletedSession.code });

    res.json({ session: deletedSession, message: "session-deleted-message" });
  } catch (err) {
    next(err);
  }
}

export async function handleGetSessionByCode(req, res, next) {
  try {
    const { sessionCode } = req.params;

    const session = await SessionModel.findOne({ code: sessionCode }).populate("questions students");

    if (!session) throw createHttpError(404, "session-not-found-error");

    res.json({ session });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateSessionSettings(req, res, next) {
  try {
    const { sessionId } = req.params;
    const update = req.body;

    const session = await SessionService.getById(sessionId, req.user.institution, req.user._id);

    if (!session) throw createHttpError(404, "session-not-found-error");

    const updatedSession = await SessionModel.findByIdAndUpdate(sessionId, { settings: { ...update } }, { new: true });

    io.emit("SESSION_UPDATE", { code: session.code });

    res.json({ settings: updatedSession.settings, message: "session-settings-updated-message" });
  } catch (err) {
    next(err);
  }
}

export async function handleEndSession(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = await SessionModel.findOneAndUpdate(
      { $and: [{ _id: sessionId }, { institution: req.user.institution }, { user: req.user._id }] },
      { ended: true },
      { new: true }
    );

    if (!session) throw createHttpError(404, "session-not-found-error");

    io.emit("SESSION_UPDATE", { code: session.code });

    res.json({ message: "session-ended", session });
  } catch (err) {
    next(err);
  }
}

export async function handleReactivateSession(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = await SessionModel.findOneAndUpdate(
      { $and: [{ _id: sessionId }, { institution: req.user.institution }, { user: req.user._id }] },
      { ended: false },
      { new: true }
    );

    if (!session) throw createHttpError(404, "session-not-found-error");

    io.emit("SESSION_UPDATE", { code: session.code });

    res.json({ message: "session-reactivated", session });
  } catch (err) {
    next(err);
  }
}

export async function handleJoin(req, res, next) {
  try {
    const { studentId } = req.body;
    const { code } = req.params;

    const student = await UserModel.findOne({ _id: studentId });
    const session = await SessionService.getByCode(code);

    if (!session) throw createHttpError(400, "session-not-found-or-ended");

    /**
     * If the teacher has assigned a class to this session,
     * Then check if he has allowed guest students who might not be in the class
     * But still can join. If so let them join, else don't.
     * If the teacher has not assigned any class, by default anyone can join.
     */
    if (session.hasInvitedAClass) {
      session.students = session.students.map((studentObjectId) => studentObjectId.toString());
      const isStudentInTheClass = session.students.includes(studentId.toString());

      if (!isStudentInTheClass && session.settings.allowGuestStudents) {
        session.students.push(student.id);
      } else {
        throw new createHttpError(403, "No estás invitad@");
      }
    } else {
      session.students.push(student.id);
    }

    await session.save();

    io.emit("TEST_UPDATE", { code });

    res.json({ student });
  } catch (err) {
    next(err);
  }
}

export async function handleGetJoinStatus(req, res, next) {
  try {
    const { code, studentId } = req.params;

    const session = await SessionService.getByCode(code);

    if (!session) throw createHttpError(400, "session-not-found-or-ended");

    await session.populate("students");

    const student = await session.students.find((student) => student._id.toString() === studentId);

    if (!student) throw createHttpError(401, "student-not-joined");

    res.json({ student });
  } catch (err) {
    next(err);
  }
}

export async function handleGetQuestions(req, res, next) {
  try {
    const { code } = req.params;
    const { activation } = req.query;
    const isActivation = activation === "true";

    const session = await SessionService.getByCode(code);
    const activationSession = await ActivationSessionService.get(req.user._id, session._id);

    if (!session) throw createHttpError(400, "session-not-found-or-ended");

    // ! Don't have the answers populated!
    await session.populate("questions");
    if (activationSession) {
      await activationSession.populate({
        path: "questions",
        populate: {
          path: "questionObj",
          model: "Question",
        },
      });
    }

    // Only populate the specified ones
    await session.populate("institution", "name email employeeName employeePosition");

    let questions = [];

    if (isActivation) {
      if (activationSession) {
        questions = activationSession.questions.filter((question) => {
          const { lastAnsweredCorrect } = question;
          const currentDate = new Date();

          if (!question.questionObj.hasComplementaryQuestion) return false;

          if (question.questionObj.activateImmediately) {
            return true;
          }

          return currentDate.getTime() - lastAnsweredCorrect.getTime() >= ONE_DAY_MS;
        });

        questions = questions.filter((question) => {
          const { correctAnsweredCount } = question;
          if (
            question.questionObj.activationRepeatCountLimit &&
            Number(question.questionObj.activationRepeatCountLimit) > 0
          ) {
            return correctAnsweredCount < Number(question.questionObj.activationRepeatCountLimit);
          }
          return correctAnsweredCount === 0;
        });

        questions = questions.map((question) => {
          return question.questionObj;
        });
      }
    } else {
      questions = session.questions;
    }

    if (session.settings.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    if (session.settings.shuffleAnswerOptions) {
      questions = questions.map((question) => {
        if (question.options && question.options.length) {
          question.options.sort(() => Math.random() - 0.5);
        }
        return question;
      });
    }

    res.json({
      questions,
      settings: session.settings,
      submissions: isActivation ? [] : session.submissions,
      session,
      institution: session.institution,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleSubmitAnswer(req, res, next) {
  try {
    const { code } = req.params;

    const session = await SessionService.getByCode(code);

    await session.populate("students");

    if (!session) throw createHttpError(400, "session-not-found-or-ended");

    const { studentId, answers, questionId, isActivation } = req.body;

    const student = session.students.find((student) => student._id.toString() === studentId);

    if (!student) throw createHttpError(403, "student-not-signed-in");

    if (!isActivation) {
      const previousSubmission = session.submissions.find(
        (submission) => submission.studentId === student._id.toString() && submission.questionId === questionId
      );

      if (previousSubmission) throw createHttpError(409, "question-already-answered");
    }

    const { status, score, correctAnswers } = await checkSubmissionStatus(questionId, answers, isActivation);

    if (!isActivation) {
      const newSubmission = {
        studentId,
        questionId,
        score,
        answers,
        status,
        correctAnswers,
      };

      session.submissions.push(newSubmission);

      await session.save();
    }

    if (isActivation) {
      const existingActivationSessionQuestionObj = await ActivationSessionQuestionModel.findOne({
        $and: [{ questionObj: questionId }, { user: studentId }, { session: session._id }],
      });

      let isCorrectAnswer = false;

      if (status === "CORRECT") {
        isCorrectAnswer = true;

        existingActivationSessionQuestionObj.lastAnsweredCorrect = new Date();
        existingActivationSessionQuestionObj.correctAnsweredCount =
          existingActivationSessionQuestionObj.correctAnsweredCount + 1;

        // await ActivationSessionModel.findOneAndUpdate(
        //   { $and: [{ student: studentId }, { session: session._id }] },
        //   { $pull: { questions: existingActivationSessionQuestionObj._id } },
        //   { upsert: true, new: true }
        // );
      }

      if (status === "WRONG") {
        isCorrectAnswer = false;

        // await ActivationSessionQuestionModel.updateOne(
        //   { _id: existingActivationSessionQuestionObj._id },
        //   { correctAnsweredCount: existingActivationSessionQuestionObj.correctAnsweredCount + 1 }
        // );
        // existingActivationSessionQuestionObj.correctAnsweredCount = existingActivationSessionQuestionObj.correctAnsweredCount + 1;
      }

      await existingActivationSessionQuestionObj.save();

      io.emit("TEST_UPDATE", { code });

      return res.json({ activation: true, isCorrectAnswer });
    }

    // If the question was answered wrong, move it for activation
    if (!isActivation && status === "WRONG") {
      const newActivationSessionQuestionObj = new ActivationSessionQuestionModel({
        questionObj: questionId,
        session: session._id,
        correctAnsweredCount: 0,
        user: studentId,
      });

      await newActivationSessionQuestionObj.save();

      await ActivationSessionModel.findOneAndUpdate(
        { student: studentId, session: session._id },
        { $addToSet: { questions: newActivationSessionQuestionObj } },
        { upsert: true, new: true }
      );
    }

    io.emit("TEST_UPDATE", { code });

    if (!isActivation) {
      const { exists, data } = await checkAnalyticsExistence(studentId);

      if (exists) {
        await AnalyticsModel.findOneAndUpdate(
          { _id: data?._id },
          { $addToSet: { [status === "CORRECT" ? "rightQuestions" : "wrongQuestions"]: questionId } },
          { new: true }
        );
      } else {
        const analytics = await AnalyticsService.create(studentId);
        analytics[status === "CORRECT" ? "rightQuestions" : "wrongQuestions"] = [questionId];
        await analytics.save();
      }
    }

    res.json({ session, status, score });
  } catch (err) {
    next(err);
  }
}

export async function handleReviewSubmission(req, res, next) {
  try {
    const { submissionId } = req.params;
    const { questionId, sessionId, status } = req.body;

    const session = await SessionService.getById(sessionId, req.user.institution, req.user._id);

    if (!session) throw createHttpError(404, "session-not-found");

    const question = await QuestionSetService.getQuestionById(questionId, req.user.institution, req.user._id);

    if (!question) throw createHttpError(404, "question-not-found");

    if (question.type !== "FREE-TEXT") throw createHttpError(403, "not-free-text-question");

    session.submissions = session.submissions.map((submission) => {
      if (submission._id.toString() === submissionId) {
        submission.status = status;
        submission.score = status === "CORRECT" ? question.score : 0;
      }
      return submission;
    });

    await session.save();

    io.emit("SESSION_UPDATE", { code: session.code });

    res.json({ message: "answer-validated" });
  } catch (err) {
    next(err);
  }
}

export async function handleInviteClass(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { classId } = req.body;

    const session = await SessionService.getById(sessionId, req.user.institution);

    if (!session) throw createHttpError(404, "session-not-found");

    const classObj = await ClassService.getById(classId, req.user.institution);

    if (!classObj) throw createHttpError(404, "class-not-found");

    await SessionModel.updateOne(
      { _id: sessionId },
      {
        $addToSet: { students: { $each: classObj.students } },
        $set: { hasInvitedAClass: true, invitedClass: classId },
      }
    );

    res.json({ message: "class-invited" });
  } catch (err) {
    next(err);
  }
}

export async function handleGetAllActiveSessionsOfStudent(req, res, next) {
  try {
    const activeSessions = await SessionModel.find({
      $and: [{ students: { $in: [req.user._id] } }, { ended: false }],
    })
      .populate("invitedClass questions")
      .sort({ createdAt: -1 });

    return res.json(activeSessions);
  } catch (err) {
    next(err);
  }
}

export async function handleGetActivationSessions(req, res, next) {
  try {
    let activationSessions = await ActivationSessionModel.find({
      student: req.user._id,
    })
      .populate({
        path: "session",
        populate: {
          path: "invitedClass",
        },
      })
      .populate({
        path: "questions",
        populate: {
          path: "questionObj",
          model: "Question",
        },
      })
      .sort({ createdAt: -1 })
      .exec();

    activationSessions = activationSessions
      .filter((activationSession) => {
        let questions = [];

        questions = activationSession.questions.filter((question) => {
          const { lastAnsweredCorrect } = question;
          const currentDate = new Date();

          if (!question.questionObj.hasComplementaryQuestion) return false;

          if (question.questionObj.activateImmediately) {
            return true;
          }

          return currentDate.getTime() - lastAnsweredCorrect.getTime() >= ONE_DAY_MS;
        });

        questions = questions.filter((question) => {
          const { correctAnsweredCount } = question;
          if (
            question.questionObj.activationRepeatCountLimit &&
            Number(question.questionObj.activationRepeatCountLimit) > 0
          ) {
            return correctAnsweredCount < Number(question.questionObj.activationRepeatCountLimit);
          }
          return correctAnsweredCount === 0;
        });

        questions = questions.map((question) => {
          return question.questionObj;
        });

        activationSession.questions = questions;

        return questions.length > 0;
      })
      .filter((activation) => activation.session !== null);

    return res.json(activationSessions);
  } catch (err) {
    next(err);
  }
}

export async function handleDoneStudentSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    await SessionModel.updateOne(
      {
        _id: sessionId,
      },
      { $addToSet: { doneStudents: userId } }
    );

    res.send(`Done user: ${userId}, session: ${sessionId}`);
  } catch (err) {
    next(err);
  }
}
