import createHttpError from "http-errors";
import QuestionModel from "../../models/question.model.js";

const calculateScore = (status, question, answers) => {
  if (question.type === "FILL-IN-THE-GAPS") {
    const correctAnswers = question.answers.map((answer) => answer.trim());
    const userAnswers = answers.map((answer) => answer.trim());
    let correctCount = 0;

    // Count correct answers
    correctAnswers.forEach((correctAnswer, index) => {
      if (userAnswers[index] === correctAnswer) {
        correctCount++;
      }
    });

    // Calculate the score proportionally
    const maxScore = question.score;
    const score = (correctCount / correctAnswers.length) * maxScore;

    return score;
  } else {
    const scores = {
      CORRECT: `${question.score}`,
      WRONG: "0",
      REVIEWING: "?",
    };
    return scores[status];
  }
};

/**
 * @param {String} questionId
 * @param {Array} answers
 */
export default async function checkSubmissionStatus(questionId, answers, isActivation = false) {
  let question = await QuestionModel.findOne({ _id: questionId });

  if (!question) throw createHttpError(404, "question-not-found");

  if (isActivation && question.hasComplementaryQuestion) {
    question = question.complementaryQuestion;
  }

  let status = "";

  switch (question.type) {
    case "MCQ": {
      status = question.answers.includes(answers[0]) ? "CORRECT" : "WRONG";
      break;
    }
    case "CHECKBOXES": {
      const isCorrect =
        question.answers.every((answer) => answers.includes(answer)) && answers.length === question.answers.length;
      status = isCorrect ? "CORRECT" : "WRONG";
      break;
    }
    case "TRUE-OR-FALSE": {
      status = question.answers.includes(answers[0]) ? "CORRECT" : "WRONG";
      break;
    }
    case "FREE-TEXT": {
      status = "REVIEWING";
      break;
    }
    case "SORTER": {
      const correctOrder = question.answers.join("");
      const userOrder = answers.join("");
      if (correctOrder === userOrder) {
        status = "CORRECT";
      } else {
        status = "WRONG";
      }
      break;
    }
    case "FILL-IN-THE-GAPS": {
      const correctOrder = question.answers.map((answer) => answer.trim()).join("");
      const userOrder = answers.map((answer) => answer.trim()).join("");
      if (correctOrder === userOrder) {
        status = "CORRECT";
      } else {
        status = "WRONG";
      }
      break;
    }
    default: {
      status = "REVIEWING";
      break;
    }
  }

  const score = calculateScore(status, question, answers);

  return { status, score, correctAnswers: question.answers };
}
