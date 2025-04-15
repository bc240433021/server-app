import { getWeekOfMonth, getWeeksInMonth, millisecondsToMinutes } from "date-fns";
import createHttpError from "http-errors";
import lodash from "lodash";
import AnalyticsModel from "../models/analytics.model.js";
import ClassModel from "../models/class.model.js";
import SessionModel from "../models/session.model.js";
import checkAnalyticsExistence, { AnalyticsService } from "../services/analytics.service.js";

export async function handleAddScreenTime(req, res, next) {
  try {
    const { screenTime, userId } = req.body;
    const { exists, data } = await checkAnalyticsExistence(userId);

    if (exists) {
      const analytics = await AnalyticsModel.findOneAndUpdate(
        { _id: data?._id },
        { timeSpent: (data.timeSpent += parseInt(screenTime)) },
        { new: true }
      );
      res.status(200).json(analytics);
      return;
    }

    const analytics = await AnalyticsService.create(userId);
    analytics.timeSpent = parseInt(screenTime);
    await analytics.save();

    res.status(200).json(analytics);
  } catch (err) {
    next(err);
  }
}

export async function handleGetWeeklyReport(req, res, next) {
  try {
    const { userId } = req.params;
    const analyticsInThisWeek = await AnalyticsService.getWeeklyReport(userId);
    const daysStudied = analyticsInThisWeek.map(({ day }) => day);
    res.status(200).json(daysStudied);
  } catch (err) {
    next();
  }
}

export async function handleGetMonthlyTimeSpentReport(req, res, next) {
  try {
    const { userId } = req.params;
    const weeksThisMonth = getWeeksInMonth(new Date());
    const currentWeek = getWeekOfMonth(new Date());
    const monthlyTimeSpentReport = {
      labels: [],
      data: [],
    };
    for (let i = 1; i <= weeksThisMonth; i++) {
      const weekNumber = i;
      const weeklyReport = await AnalyticsService.getWeeklyReport(userId, weekNumber);
      let totalTimeSpentThisWeek = 0;
      if (!lodash.isEmpty(weeklyReport)) {
        weeklyReport.map((dailyReport) => (totalTimeSpentThisWeek += dailyReport.timeSpent));
      }
      const label = weekNumber === currentWeek ? "This Week" : `Week ${weekNumber}`;
      monthlyTimeSpentReport.labels.push(label);
      monthlyTimeSpentReport.data.push(millisecondsToMinutes(totalTimeSpentThisWeek));
    }
    res.status(200).json({ report: monthlyTimeSpentReport });
  } catch (err) {
    next(err);
  }
}

export async function handleGetStudentEvaluation(req, res, next) {
  try {
    const { studentId } = req.params;

    const studentClasses = await ClassModel.find({ students: { $in: [studentId] } }).populate("institution");

    const results = [];

    for (const studentClass of studentClasses) {
      const classSessions = await SessionModel.find({
        $and: [{ invitedClass: studentClass._id }, { students: { $in: [studentId] } }],
      }).sort({ createdAt: -1 });

      const studentSessions = [];

      for (const classSession of classSessions) {
        const session = {
          name: classSession.name,
          correctAnswers: [],
          wrongAnswers: [],
        };

        for (const submission of classSession.submissions) {
          if (submission.studentId === studentId) {
            if (submission.status === "CORRECT") {
              session.correctAnswers.push(submission.questionId);
            } else if (submission.status === "WRONG") {
              session.wrongAnswers.push(submission.questionId);
            }
          }
        }

        if (session.correctAnswers.length === 0 && session.wrongAnswers.length === 0) {
          continue;
        }

        studentSessions.push(session);
      }

      results.push({
        className: studentClass.name,
        subject: studentClass.subject,
        sessions: studentSessions,
      });
    }

    // const analytics = await AnalyticsService.getWeeklyReport(studentId);

    // const results = analytics.map((report) => {
    //   const exactDate = addDays(
    //     addWeeks(
    //       startOfMonth(new Date(report.year, report.month)), // Start of the given month
    //       report.week - 1 // Add the (week number - 1)
    //     ),
    //     report.day // Add the weekday offset
    //   );
    //   return {
    //     day: report.day,
    //     date: dayjs(exactDate).toDate(),
    //     rightAnswers: report.rightQuestions?.length || 0,
    //     wrongAnswers: report.wrongQuestions?.length || 0,
    //   };
    // });

    return res.json({ results });
  } catch (err) {
    next(err);
  }
}

export async function handleGetClassEvaluation(req, res, next) {
  try {
    const { classId } = req.params;

    const classObj = await ClassModel.findOne({ _id: classId }).populate("students");

    if (!classObj) throw createHttpError(404, "class-not-found");

    const results = [];

    for (const student of classObj.students) {
      const classSessions = await SessionModel.find({
        $and: [{ invitedClass: classObj._id }, { students: { $in: [student._id] } }],
      }).sort({ createdAt: -1 });

      const studentSessions = [];

      for (const classSession of classSessions) {
        const session = {
          name: classSession.name,
          correctAnswers: [],
          wrongAnswers: [],
        };

        for (const submission of classSession.submissions) {
          if (submission.studentId === student._id.toString()) {
            if (submission.status === "CORRECT") {
              session.correctAnswers.push(submission.questionId);
            } else if (submission.status === "WRONG") {
              session.wrongAnswers.push(submission.questionId);
            }
          }
        }

        if (session.correctAnswers.length === 0 && session.wrongAnswers.length === 0) {
          continue;
        }

        studentSessions.push(session);
      }

      const totalCorrectAnswers = studentSessions.reduce((total, session) => total + session.correctAnswers.length, 0);
      const totalWrongAnswers = studentSessions.reduce((total, session) => total + session.wrongAnswers.length, 0);

      results.push({
        studentName: student.name,
        correctAnswers: totalCorrectAnswers,
        wrongAnswers: totalWrongAnswers,
      });
    }

    return res.json({ results: results.sort((a, b) => b.correctAnswers - a.correctAnswers) });
  } catch (err) {
    next(err);
  }
}
