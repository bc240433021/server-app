import mongoose from 'mongoose';

const GrammarResultSchema = new mongoose.Schema({
    sentence: {
        type: String,
        required: true,
    },
    corrected_sentence: {
        type: String,
        required: true,
    },
    errors: {
        type: [String], // Array of string descriptions of grammar errors
        default: [],
    },
}, { _id: false }); // Prevent creating a new _id for each subdocument

const IncorrectAnswerSchema = new mongoose.Schema({
    statement: {
        type: String,
        required: true,
    },
    explanation: {
        type: String,
        required: true,
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
    },
});

const CheckAnswerSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['calculation', 'conceptual'],
        required: true,
    },
    evaluation: {
        type: String,
        required: true,
    },
    incorrectAnswers: {
        type: [IncorrectAnswerSchema],
        default: [],
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 5, // Optional: if you're enforcing a 0–5 scale
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
    },
});
const AnalysisSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
    },
    originalText: {
        type: String,
        required: true,
    },
    language: {
        name: { type: String },
        code: { type: String },
        confidence: { type: Number },
    },
    grammarAnalysis: {
        type: [GrammarResultSchema], // Array of sentence-by-sentence analysis
        default: [],
    },
    grammarReviews: {
        type: String,
    },
    AnswerReviews: {
        type: String,
    },
    answerAnalysis: {
        type: [CheckAnswerSchema], // Array of strings for answer analysis
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('AnalysisSchema', AnalysisSchema);
