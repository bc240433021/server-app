import cors from "cors";
import express from "express";
import http from "http";
import passport from "passport";
import { Server } from "socket.io";
import "./config/passport.js";
import { errorHandler, notFoundHandler } from "./middlewares/common/error-handlers.js";

import authenticateUser from "./middlewares/auth/authenticate-user.js";
import { uploadFile, uploadMultipleFiles } from "./middlewares/common/uploadFile.js";
import analyticsRouter from "./routes/analytics.route.js";
import authRouter from "./routes/auth.route.js";
import chatRouter from "./routes/chat.route.js";
import classRouter from "./routes/class.route.js";
import questionSetRouter from "./routes/question-set.route.js";
import sessionRouter from "./routes/session.route.js";
import settingsRouter from "./routes/settings.route.js";
import stripeRouter from "./routes/stripe.route.js";
import studentLogRouter from "./routes/student-log.route.js";
import libraryRouter from "./routes/library.route.js"
import questionAIRouter from "./routes/question-ai.route.js";
import grammarAIRouter from "./routes/grammar.route.js";
const app = express();

const server = http.createServer(app);

export const io = new Server(server);

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:4173",
      "https://lms-test-00-test-checker.vercel.app",
      process.env.CLIENT_URL,
      process.env.REGISTRATION_PLATFORM_URL,
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// initialize passport
app.use(passport.initialize());

// routes
app.use("/auth", authRouter);
app.use("/stripe", stripeRouter);
app.use("/settings", settingsRouter);
app.use("/question-set", questionSetRouter);
app.use("/session", sessionRouter);
app.use("/class", classRouter);
app.use("/chat", chatRouter);
app.use("/analytics", analyticsRouter);
app.use("/logbook", studentLogRouter);
app.use("/library", libraryRouter);
app.use("/question", questionAIRouter);
app.use("/grammar", grammarAIRouter);

app.post("/upload-file", authenticateUser, uploadFile("testchecker-question-files"), (req, res, next) => {
  try {
    const { file } = req;
    console.log("file", file)
    res.json({
      url: file.location,
    });
  } catch (error) {
    next(error);
  }
});


// error-handling
app.use(notFoundHandler);
app.use(errorHandler);

server.listen(process.env.PORT, () => {
  console.log(`Listening to port [${process.env.PORT}]`);
});

export default app;
