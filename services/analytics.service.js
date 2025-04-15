import { getWeekOfMonth } from "date-fns";
import Analytics from "../models/analytics.model.js";

export default async function checkAnalyticsExistence(userId) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentWeek = getWeekOfMonth(new Date());
  const currentDay = new Date().getDay();

  const analytics = await Analytics.findOne({
    $and: [
      { user: userId },
      { year: currentYear },
      { month: currentMonth },
      { week: currentWeek },
      { day: currentDay },
    ],
  });

  return { exists: !!analytics, data: analytics ?? null };
}

export const AnalyticsService = {
  async create(userId) {
    const newAnalytics = new Analytics({
      user: userId,
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      week: getWeekOfMonth(new Date()),
      day: new Date().getDay(),
    });
    await newAnalytics.save();
    return newAnalytics;
  },

  /**
   * @param {String} userId
   * @param {Number} week
   * @param {Number} customMonth
   */
  async getWeeklyReport(userId, week, customMonth, customYear) {
    const currentWeek = week ?? getWeekOfMonth(new Date());
    const month = customMonth || new Date().getMonth();
    const year = customYear || new Date().getFullYear();
    const weeklyAnalytics = await Analytics.find({
      $and: [{ user: userId }, { week: currentWeek, month, year }],
    });
    return weeklyAnalytics;
  },

  async getMonthlyReport(userId) {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const monthlyAnalytics = await Analytics.find({
      $and: [{ user: userId }, { month, year }],
    });
    return monthlyAnalytics;
  },
};
