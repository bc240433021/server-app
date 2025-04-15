import axios, { AxiosError } from "axios";
import bcrypt from "bcryptjs";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { sendEmail } from "../lib/nodemailer.js";
import ClassModel from "../models/class.model.js";
import Institution from "../models/institution.model.js";
import InviteModel from "../models/invite.model.js";
import { default as User, default as UserModel } from "../models/user.model.js";
import ClassService from "../services/class.service.js";
import { getSettings } from "../utils/settings.cjs";

export async function handleGetAuthStatus(req, res) {
  let user = req.user;

  if (user.role === "SCHOOL-ADMIN" || user.role === "TEACHER") {
    const dbUser = await User.findById(user.id).populate("institution");
    console.log("dbUser [in status]", dbUser);
    
    user = dbUser;
  }
  
  console.log("user [in status]", user);
  res.json({ user: user, token: req.headers["authorization"] });
}

export async function handleLoginUser(req, res, next) {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ $or: [{ email: username }, { username }] })
      .populate("institution")
      .select("+password");

    if (!user) throw createHttpError(403, "invalid-credentials");

    const passwordMatched = await bcrypt.compare(password, user.password);

    if (!passwordMatched) throw createHttpError(403, "invalid-credentials");

    const token = "Bearer " + (await user.generateWebToken());

    res.status(200).json({ token, message: "welcome-back-message", user });
  } catch (err) {
    next(err);
  }
}

export async function handleRegisterInstitution(req, res, next) {
  try {
    const {
      institutionName,
      email,
      address,
      postalCodeAndCity,
      province,
      phone,
      type,
      employeeName,
      employeePosition,
      userEmail,
      username,
      password,
    } = req.body;

    const prevInstitution = await Institution.findOne({ email });

    if (prevInstitution) throw createHttpError(409, "email-taken");

    const institution = new Institution({
      name: institutionName,
      email,
      address,
      postalCodeAndCity,
      province,
      phone,
      type,
      employeeName,
      employeePosition,
    });

    const prevUser = await User.findOne({ $or: [{ username }, { email }] });

    if (prevUser) throw createHttpError(409, "email-or-username-taken");

    const user = new User({
      name: employeeName,
      email: userEmail,
      username,
      password,
      role: "SCHOOL-ADMIN",
      institution: institution._id,
    });

    await user.save();

    institution.teachers.push(user._id);

    await institution.save();

    const token = "Bearer " + (await user.generateWebToken());

    res.status(201).json({ institution, user, token, message: "welcome-message" });
  } catch (err) {
    next(err);
  }
}

export async function handleRegisterStudent(req, res, next) {
  try {
    const { name, email, password, registerOnVocab21, classRef, inviteRef } = req.body;

    const prevUser = await User.findOne({
      $or: [{ email }, { username: email }],
    });

    if (prevUser) throw createHttpError(409, "email-or-username-taken");

    const newStudent = new User({
      name,
      email,
      password,
      role: "STUDENT",
      username: email,
    });

    const token = "Bearer " + (await newStudent.generateWebToken());

    // If the student was invited to a class, add him to the class
    if (classRef && mongoose.isValidObjectId(classRef)) {
      const classRoom = await ClassModel.findOne({ _id: classRef });
      const invitation = await InviteModel.findOne({ _id: inviteRef });

      if (!classRoom) throw createHttpError(404, "classroom-not-found");
      if (!invitation) throw createHttpError(404, "invitation-not-found");

      // Count this student in the institution
      newStudent.institution = invitation.institution.toString();

      if (invitation.emails.includes(email)) {
        classRoom.students = [...classRoom.students, newStudent._id];
        await classRoom.save();
      } else {
        throw createHttpError(403, "not-invited-in-class");
      }
    }

    // Copy the user to Check2Learn
    if (registerOnVocab21) {
      try {
        const {
          data: { user },
        } = await axios.post(
          "https://app.check2learn.com/get_auth/register",
          {
            firstName: name.split(" ")[0] || name,
            lastName: name.split(" ")[name.split(" ").length - 1] || name,
            email,
            password,
          },
          { headers: { "Content-Type": "application/json", Accept: "application/json" } }
        );

        newStudent.c2lUserId = user._id;
      } catch (err) {
        console.log(err);
      }
    }

    await newStudent.save();

    res.json({ user: newStudent, message: "welcome-message", token });
  } catch (err) {
    next(err);
  }
}

export async function handleForgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      throw createHttpError(404, "user-not-found");
    }

    let { resetPasswordEmailSubject, resetPasswordEmailMessage } = await getSettings();

    const session = jwt.sign({ userId: existingUser._id }, process.env.PASSWORD_RESET_SECRET, {
      expiresIn: 60 * 60 * 1000, // 1 hr
    });

    const resetPasswordLink = `${process.env.CLIENT_URL}/auth/reset-password?session=${session}`;

    resetPasswordEmailSubject = resetPasswordEmailSubject.replace(/{{name}}/g, existingUser.name);
    resetPasswordEmailMessage = resetPasswordEmailMessage
      .replace(/{{name}}/g, existingUser.name)
      .replace(/{{link}}/g, resetPasswordLink);

    const { accepted } = await sendEmail({
      to: existingUser.email,
      subject: resetPasswordEmailSubject,
      contentType: "html",
      content: resetPasswordEmailMessage,
    });

    if (!accepted.includes(existingUser.email)) {
      throw createHttpError(422, "email-was-not-sent");
    }

    return res.json({ message: "email-instructions-sent" });
  } catch (err) {
    next(err);
  }
}

export async function handleResetPassword(req, res, next) {
  try {
    const { newPassword, session } = req.body;

    const payload = jwt.verify(session, process.env.PASSWORD_RESET_SECRET);

    if (!payload.userId) {
      throw createHttpError(403, "invalid-or-expired-session");
    }

    const { userId } = payload;

    const existingUser = await User.findOne({ _id: userId });

    if (!existingUser) {
      throw createHttpError(404, "user-not-found");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.updateOne({ _id: existingUser._id }, { password: hashedPassword });

    return res.json({ message: "Tu contraseña ha sido actualizada" });
  } catch (err) {
    next(err);
  }
}

export async function handleGetTeachers(req, res, next) {
  try {
    const { institution: institutionId } = req.user;

    const institution = await Institution.findOne({ _id: institutionId })
      .lean()
      .populate({
        path: "teachers",
        options: { sort: { name: 1 } }, // Sort by createdAt in descending order
      });

    if (!institution) throw createHttpError(404, "institution-not-found");

    const { teachers } = institution;

    const teachersWithoutAdmin = teachers.filter((teacher) => teacher._id.toString() !== req.user._id.toString());

    const teachersWithClasses = [];

    for (const teacher of teachersWithoutAdmin) {
      const classes = await ClassService.getAll(institutionId, teacher._id);
      teachersWithClasses.push({ ...teacher, classes });
    }

    res.json({ teachers: teachersWithClasses });
  } catch (err) {
    next(err);
  }
}

export async function handleAddTeacher(req, res, next) {
  try {
    const { institution: institutionId } = req.user;
    const { name, username, password, email } = req.body;

    const institution = await Institution.findOne({ _id: institutionId });

    if (!institution) throw createHttpError(404, "institution-not-found");

    const prevUser = await User.findOne({ $or: [{ email }, { username }] });

    if (prevUser) throw createHttpError(409, "El correo electrónico ya existe");

    const user = new User({
      name: name.trim(),
      email: email.trim(),
      username: username.trim(),
      password,
      institution: institution._id,
      role: "TEACHER",
    });

    await user.save();

    institution.teachers.push(user._id);

    await institution.save();

    res.status(201).json({ message: "teacher-added-successfully" });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteTeacher(req, res, next) {
  try {
    const { teacherId } = req.params;

    const user = await User.findByIdAndDelete(teacherId);

    if (!user) throw createHttpError(404, "teacher-not-found");

    res.status(200).json({ message: "teacher-deleted-successfully" });
  } catch (err) {
    next(err);
  }
}

export async function handleGetAllUsers(req, res, next) {
  try {
    const { type } = req.query;
    const users = await User.find({})
      .lean()
      .sort({ name: 1 })
      .select("name email username role institution")
      .populate("institution");

    if (type === "student") {
      for (const user of users) {
        if (user.role !== "STUDENT") {
          continue;
        }

        const classObj = await ClassModel.findOne({ students: { $in: [user._id] } }).lean();

        const institution = await Institution.findOne({ _id: classObj?.institution?.toString() }).lean();

        user.institution = institution?.name || "";
      }
    }

    if (type === "teacher") {
      for (const user of users) {
        if (user.role !== "TEACHER") {
          continue;
        }

        const classes = await ClassModel.find({ user: user._id.toString() }).lean();

        user.classes = classes;
      }
    }

    return res.json({ users: users.filter((user) => user.role === (type === "teacher" ? "TEACHER" : "STUDENT")) });
  } catch (err) {
    next(err);
  }
}

export async function getAllStudents(_req, res, next) {
  try {
    const users = await User.find({ role: "STUDENT" })
      .lean()
      .sort({ name: 1 })
      .select("name email username role institution")
      .populate("institution");

    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteUser(req, res, next) {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    return res.json({ message: "User was deleted successfully", user });
  } catch (err) {
    next(err);
  }
}

export async function handleGetAllInstitutions(_req, res, next) {
  try {
    let institutions = await Institution.find({})
      .populate("teachers")
      .lean()
      .sort({ createdAt: -1 })
      .select("name email phone type teachers isApproved postalCodeAndCity province");

    for (const institution of institutions) {
      const allStudentsInThatInstitution = await UserModel.find({
        $and: [{ role: "STUDENT" }, { institution: institution._id }],
      });

      institution.students = allStudentsInThatInstitution || [];
    }

    return res.json({ institutions });
  } catch (err) {
    next(err);
  }
}

export async function handleApproveInstitution(req, res, next) {
  try {
    const { institutionId } = req.params;

    const institution = await Institution.findOne({ _id: institutionId });

    if (!institution) throw createHttpError(404, "institution-not-found");

    institution.isApproved = !institution.isApproved;

    await institution.save();

    return res.json({ message: institution.isApproved ? "institution-approved" : "institution-unapproved" });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteInstitution(req, res, next) {
  try {
    const { institutionId } = req.params;

    const institution = await Institution.findByIdAndDelete(institutionId);

    await User.deleteMany({ institution: institution._id });

    return res.json({ message: "Institution deleted successfully" });
  } catch (err) {
    next(err);
  }
}

export async function handleRegistrationPlatformRegister(req, res, next) {
  try {
    const { name, email, password, age, selectedProducts, classRef, inviteRef } = req.body;

    let check2learnUser;
    let vocab21User;

    if (selectedProducts.includes("check2learn")) {
      const {
        data: { user },
      } = await axios.post(`${process.env.CHECK2LEARN_API_URL}/auth/register-student`, {
        name,
        email,
        password,
        classRef,
        inviteRef,
      });
      check2learnUser = user;
    }

    if (selectedProducts.includes("vocab21")) {
      const {
        data: { user },
      } = await axios.post(`${process.env.VOCAB21_API_URL}/get_auth/register`, {
        firstName: name.split(" ")[0] || name,
        lastName: name.split(" ")[1] || name,
        email,
        age,
        password,
      });
      vocab21User = user;
    }

    return res.json({
      message: "registration-platform-registration-successful-message",
      users: { check2learn: check2learnUser, vocab21: vocab21User },
    });
  } catch (err) {
    if (err instanceof AxiosError) {
      return res.status(err?.response?.status || 500).json(err?.response?.data || {});
    }
    next(err);
  }
}
