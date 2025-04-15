import { checkConceptual, differentiateQuestions } from "../ai_utils/analyze.js";
import analyzeText, { analyzeGrammarResponse } from "../ai_utils/grammar.js";
import AnalysisSchema from "../models/ai-analysis.model.js";
import QuestionModel from "../models/question.model.js";
import SessionModel from "../models/session.model.js";



export const getAnalysisbyQuestionId = async (req, res) => {
    try {
        const { questionId, sessionId } = req.params;
        console.log("questionId", questionId);
        console.log("sessionId", sessionId);

        if (!questionId || !sessionId) {
            return res.status(400).json({ error: "Missing required parameters." });
        }

        const foundSession = await SessionModel.findById(sessionId);

        const foundQuestion = foundSession?.questions.find((question) => question._id.toString() === questionId);
        if (!foundQuestion) {
            return res.status(404).json({ error: "Question not found in the session." });
        }


        const grammarAnalysis = await AnalysisSchema.findOne({ questionId: questionId, sessionId: sessionId });

        if (!grammarAnalysis) {
            return res.status(404).json({ error: "Grammar analysis not found." });
        }

        res.status(200).json({
            success: true,
            data: grammarAnalysis,
            message: "Grammar analysis retrieved successfully.",
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message || 'An error occurred while analyzing the text.',
        });

    }

}


export const checkAnswerController = async (req, res) => {
    try {
        const { questionId, sessionId } = req.params;

        if (!questionId || !sessionId) {
            return res.status(400).json({ error: "Missing questionId or sessionId." });
        }

        const foundSession = await SessionModel.findById(sessionId);
        if (!foundSession) {
            return res.status(404).json({ error: "Session not found." });
        }

        const foundQuestion = await QuestionModel.findById(questionId);
        if (!foundQuestion) {
            return res.status(404).json({ error: "Question not found." });
        }

        const submission = foundSession.submissions.find(
            (s) => s.questionId === questionId
        );

        if (!submission || !submission.answers?.length) {
            return res.status(404).json({ error: "Student submission not found." });
        }

        const studentAnswer = submission.answers[0];

        // Classify question type (conceptual or calculation)
        const classification = await differentiateQuestions(foundQuestion.question);
        if (!classification || !classification.type) {
            return res.status(500).json({ error: "Error classifying the question." });
        }

        console.log(`➡️ Classified as: ${classification.type} with confidence: ${classification.confidence}`);
        let result;

        if (classification.type === "conceptual" && classification.confidence >= 0.7) {
            console.log("🧠 Evaluating conceptual answers...");
            result = await checkConceptual({
                question: foundQuestion.question,
                studentAnswer,
            });
        } else if (classification.type === "calculation" && classification.confidence >= 0.7) {
            console.log("🧮 Evaluating calculation answers...");
            result = await checkMathematical({
                question: foundQuestion.question,
                studentAnswer,
            });
        } else {
            return res.status(400).json({ error: "Question classification confidence too low." });
        }

        // Save result to Analysis collection
        // Upsert analysis (update if exists, otherwise create new)
        const updateAction = await AnalysisSchema.findOneAndUpdate(
            { questionId, sessionId },
            {
                originalText: studentAnswer,
                answerAnalysis: [result],
            },
            {
                new: true,      
                upsert: true,    
            }
        );

        if (!updateAction) {
            return res.status(500).json({ error: "Error saving analysis result." });
        }

        console.log("🧪 Answer Analysis Result:", updateAction);


  
        res.status(200).json({
            success: true,
            message: "Answer analyzed successfully.",
            data: result,
            reviews: result?.evaluation,
        });
    } catch (error) {
        console.error("Error analyzing answer:", error);
        res.status(500).json({
            success: false,
            message: error.message || "An error occurred while analyzing the answer.",
        });
    }
};
