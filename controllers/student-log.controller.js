import StudentLogModel from "../models/student-log.model.js";

export async function handleRecordLog(req, res, next) {
  try {
    // const { timeSpent, date, startTime, endTime, questionSets } = req.body;
    const { sessions } = req.body;

    if (!sessions.length) {
      return res.json({ message: "empty record. no work" });
    }

    const newLog = new StudentLogModel({
      ...req.body,
      user: req.user._id,
    });

    await newLog.save();

    return res.json({ message: "Log recorded" });
  } catch (err) {
    next(err);
  }
}

export async function handleGetStudentLog(req, res, next) {
  try {
    const { studentId } = req.params;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // const formattedDate = `${thirtyDaysAgo.getMonth() + 1}/${thirtyDaysAgo.getDate()}/${thirtyDaysAgo.getFullYear()}`;

    const logs = await StudentLogModel.find({
      user: studentId,
      // date: {
      //   $gte: formattedDate, // Compare against "MM/DD/YYYY" format
      // },
    })
      .populate("sessions")
      .lean();

    const dates = [
      ...new Set(logs.map((log) => log.date)), // Extract and deduplicate dates
    ].sort((a, b) => new Date(b) - new Date(a)); // Sort in reverse chronological order

    return res.json({ logs, dates });
  } catch (err) {
    next(err);
  }
}
