import analyzeText, { analyzeGrammarResponse } from "../ai_utils/grammar.js";
import index from "../config/pinecone.js";
import AnalysisSchema from "../models/ai-analysis.model.js";
import SessionModel from "../models/session.model.js";

export const checkGrammarController = async (req, res) => {
    try {
        const { questionId, sessionId } = req.params;

        const foundSession = await SessionModel.findById(sessionId);

        const foundQuestion = foundSession?.questions.find((question) => question._id.toString() === questionId);
        if (!foundQuestion) {
            return res.status(404).json({ error: "Question not found in the session." });
        }

        const submission = foundSession.submissions.find(
            (s) => s.questionId === questionId
        );

        if (!submission || !submission.answers?.length) {
            return res.status(404).json({ error: "Student submission not found." });
        }

        const studentAnswer = submission.answers[0];

        const result = await analyzeText(studentAnswer);
        const summary = await analyzeGrammarResponse(result);

        const updateAction = await AnalysisSchema.findOneAndUpdate(
            { questionId, sessionId },
            {
                originalText: studentAnswer,
                grammarAnalysis: result.map(item => ({
                    sentence: item.sentence,
                    corrected_sentence: item.corrected_sentence,
                    errors: item.errors,
                })),
                grammarReviews: summary,
            },
            {
                new: true, // Return the updated document
                upsert: true, // Create a new document if no match is found
            }
        );

        if (!updateAction) {
            return res.status(500).json({ error: "Failed to save grammar analysis." });
        }





        res.status(200).json({
            success: true,
            data: result,
            reviews: summary,
            message: "Grammar analysis completed successfully.",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message || 'An error occurred while analyzing the text.',
        });
    }
};


export const updateGrammarReviewController = async (req, res) => {
    try {
        const { questionId, sessionId } = req.params;
        const { review } = req.body;

        // Check at least one field is being updated
        if (!review) {
            return res.status(400).json({ error: "No valid fields provided for update." });
        }

        // Find existing analysis
        const analysis = await AnalysisSchema.findOne({ questionId, sessionId });
        if (!analysis) {
            return res.status(404).json({ error: "Grammar analysis not found." });
        }

        analysis.grammarReviews = review;

        const updated = await analysis.save();

        res.status(200).json({
            success: true,
            message: "Grammar review updated successfully.",
            data: updated.grammarReviews,
        });
    } catch (error) {
        console.error("Error updating grammar review:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update grammar review.",
        });
    }
};


