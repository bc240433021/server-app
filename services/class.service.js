import createHttpError from "http-errors";
import ClassModel from "../models/class.model.js";

const ClassService = {
  async getAll(institutionId, userId) {
    const classes = await ClassModel.find({
      $and: [{ institution: institutionId }, { user: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("institution")
      .populate("user")
      .populate("students");
    return classes;
  },

  async getAllOfInstitution(institutionId) {
    const classes = await ClassModel.find({
      $and: [{ institution: institutionId }],
    })
      .sort({ createdAt: -1 })
      .populate("institution")
      .populate("user")
      .populate("students");
    return classes;
  },

  /**
   * @param {String} institutionId
   * @param {String} classId
   * @param {Array} studentIds
   */
  async addStudents(institutionId, classId, studentIds) {
    const classObj = await ClassModel.findOne({
      $and: [{ institution: institutionId }, { _id: classId }],
    });

    if (!classObj) throw createHttpError(404, "class-not-found-error");

    // The students ids that are not already in the class
    // Duplicate ids should not be possible
    const unavailableStudentIds = studentIds.filter(
      (id) => !classObj.students.map((studentObjectId) => studentObjectId.toString()).includes(id.toString())
    );

    classObj.students = [...classObj.students, ...unavailableStudentIds.map((studentId) => studentId)];

    await classObj.save();
  },

  /**
   * @param {String} classId
   * @param {String} institutionId
   */
  async getById(classId, institutionId) {
    return await ClassModel.findOne({
      $and: [{ _id: classId }, { institution: institutionId }],
    });
  },
};

export default ClassService;
