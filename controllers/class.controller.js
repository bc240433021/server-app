import createHttpError from "http-errors";
import { sendEmail } from "../lib/nodemailer.js";
import ClassModel from "../models/class.model.js";
import InstitutionModel from "../models/institution.model.js";
import InviteModel from "../models/invite.model.js";
import UserModel from "../models/user.model.js";
import ClassService from "../services/class.service.js";
import { getSettings } from "../utils/settings.cjs";

export async function handleGetAllClasses(req, res, next) {
  try {
    const { institution: institutionId } = req.user;
    let classes;
    if (req.user.role === "SCHOOL-ADMIN") {
      classes = await ClassService.getAllOfInstitution(institutionId);
    } else {
      classes = await ClassService.getAll(institutionId, req.user._id);
    }
    res.json({ classes });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateClass(req, res, next) {
  try {
    const { name, subject } = req.body;

    const newClass = new ClassModel({
      name,
      subject,
      institution: req.user.institution,
      user: req.user._id,
    });

    await newClass.save();

    res.status(201).json({ class: newClass });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteClass(req, res, next) {
  try {
    const { classId } = req.params;

    const deletedSession = await ClassModel.findOneAndDelete({
      $and: [{ _id: classId }, { institution: req.user.institution }],
    });

    res.json({ class: deletedSession, message: "class-deleted-message" });
  } catch (err) {
    next(err);
  }
}

export async function handleGetClassById(req, res, next) {
  try {
    const { classId } = req.params;

    const classObj = await ClassModel.findOne({ _id: classId }).populate("students");

    if (!classObj) throw createHttpError(404, "class-not-found-error");

    res.json({ class: classObj });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateInvitation(req, res, next) {
  try {
    const { classId } = req.params;
    const { emails, selectedProducts } = req.body;
    const institutionId = req.user.institution;

    const classObj = await ClassModel.findOne({
      $and: [{ institution: institutionId }, { _id: classId }],
    });

    if (!classObj) throw createHttpError(404, "class-not-found-error");

    const newInvitation = new InviteModel({
      emails,
      class: classObj._id,
      institution: institutionId,
    });

    let invitationLink = `${process.env.REGISTRATION_PLATFORM_URL}?invitationId=${newInvitation._id}`;

    if (selectedProducts.length > 0) {
      invitationLink += `&selectedProducts=${selectedProducts}`;
    }

    newInvitation.link = invitationLink;

    await newInvitation.save();

    // if users with the email already exist, then add them to the class
    // * An array of emails of the available students
    const availableStudents = await UserModel.find({
      $and: [{ role: "STUDENT" }, { email: { $in: emails } }],
    });

    if (availableStudents.length) {
      await ClassService.addStudents(
        institutionId,
        classId,
        availableStudents.map((student) => student._id)
      );

      // Count them in for the institution
      await UserModel.updateMany(
        { _id: { $in: availableStudents.map((student) => student._id) } },
        { $set: { institution: institutionId } }
      );
    }

    const emailsUnavailable = emails.filter(
      (email) => !availableStudents.map((student) => student.email).includes(email)
    );

    // send emails to those emails that are not registered
    if (emailsUnavailable.length > 0) {
      const { classInvitationEmailMessage, classInvitationEmailSubject } = await getSettings();

      await sendEmail({
        bcc: emailsUnavailable,
        subject: classInvitationEmailSubject,
        content: classInvitationEmailMessage.replace(/{{link}}/g, invitationLink),
      });
    }

    res.status(201).json({ message: "invitations-sent-message", invitation: newInvitation });
  } catch (err) {
    next(err);
  }
}

export async function handleGetInviterClass(req, res, next) {
  try {
    const { inviteId } = req.params;

    const invite = await InviteModel.findOne({ _id: inviteId }).populate("class", "name subject");

    if (!invite) throw createHttpError(404, "invite-not-found-error");

    res.status(200).json({ class: invite.class });
  } catch (err) {
    next(err);
  }
}

export async function handleRemoveStudentFromClass(req, res, next) {
  try {
    const { studentId, classId } = req.params;

    const classObj = await ClassModel.findOne({
      $and: [{ _id: classId }, { institution: req.user.institution }],
    });

    if (!classObj) throw createHttpError(404, "class-not-found-error");

    await ClassModel.updateOne(
      { $and: [{ _id: classId }, { institution: req.user.institution }] },
      { $pull: { students: studentId } }
    );

    res.json({ message: "Estudiante borrado" });
  } catch (err) {
    next(err);
  }
}

export async function handleGetStudentClasses(req, res, next) {
  try {
    const { user } = req;

    const classes = await ClassModel.find({
      students: { $in: [user._id] },
    })
      .populate("institution")
      .sort({ createdAt: -1 });

    return res.json({ classes });
  } catch (err) {
    next(err);
  }
}

export async function handleSendEmail(req, res, next) {
  try {
    const { classId } = req.params;
    const { subject, message } = req.body;

    const classObj = await ClassModel.findOne({
      $and: [{ _id: classId }, { institution: req.user.institution }],
    }).populate("students");

    if (!classObj) throw createHttpError(404, "class-not-found");

    const recipientEmails = classObj.students.map((student) => student.email);

    await sendEmail({
      bcc: recipientEmails,
      contentType: "text",
      subject,
      content: message,
    });

    return res.json({ message: "email-sent-to-students" });
  } catch (err) {
    next(err);
  }
}

export async function handleAssignTeacher(req, res, next) {
  try {
    const { classId } = req.params;
    const { teacherId } = req.body;

    const classObj = await ClassModel.findOne({
      $and: [{ _id: classId }, { institution: req.user.institution }],
    });

    if (!classObj) throw createHttpError(404, "class-not-found");

    const institution = await InstitutionModel.findOne({ _id: req.user.institution });

    if (!institution) throw createHttpError(404, "institution-not-found");

    const teacher = await UserModel.findOne({ _id: teacherId });

    if (!teacher) throw createHttpError(404, "teacher-not-found");

    institution.teachers = institution.teachers.map((teacherObjId) => teacherObjId.toString());

    if (!institution.teachers.includes(teacherId)) throw createHttpError(403, "not-allowed");

    classObj.user = teacherId;

    await classObj.save();

    await classObj.populate("user");

    const settings = await getSettings();

    settings.classAssignmentEmailSubject = settings.classAssignmentEmailSubject
      .replace(/{{name}}/g, teacher.name)
      .replace(/{{class}}/g, classObj.name)
      .replace(/{{subject}}/g, classObj.subject);
    settings.classAssignmentEmailMessage = settings.classAssignmentEmailMessage
      .replace(/{{name}}/g, teacher.name)
      .replace(/{{class}}/g, classObj.name)
      .replace(/{{subject}}/g, classObj.subject);

    // await sendEmail({
    //   to: teacher.email,
    //   contentType: "html",
    //   subject: settings.classAssignmentEmailSubject,
    //   content: settings.classAssignmentEmailMessage,
    // });

    return res.json({ message: "teacher-assigned" });
  } catch (err) {
    console.log(err);
    next(err);

  }
}
