import { generate } from "../ai_utils/questions.js";
import ClassModel from "../models/class.model.js";
import QuestionSetModel from "../models/question-set.model.js";
import QuestionModel from "../models/question.model.js";
import {
  buildQuestionsPrompt
} from '../ai_utils/prompts.js';
import { getEmbeddings } from "../utils/embeddings-procesors.js";
import client from "../config/openai.js";
import index from "../config/pinecone.js";
import { context } from "@pinecone-database/pinecone/dist/assistant/data/context.js";

export const generateQuestionsHandler = async (req, res) => {
  try {
    const {
      topic,
      learningObjective,
      bloomLevel,
      difficultyLevels,
      questionsPerLevel,
      questionType,
      files
    } = req.body;

    const institutionId = req.user.institution 
    console.log("Institution ID:", institutionId);
    // || "67f29b2919bde99c8e0d4189";
    const userID = req.user._id 
    console.log("User ID:", userID);
    // || "67f2a8a719bde99c8e0d41c5";

    let { questionSetId } = req.params;
   
    // If questionSetId is the literal "undefined", convert it to undefined.
    if (questionSetId === "undefined") {
      questionSetId = undefined;
    }

    // Validate required fields.
    if (!topic || !learningObjective || !bloomLevel || !difficultyLevels || !questionsPerLevel || !files) {
      return res.status(400).json({ error: "Missing required fields in request body." });
    }
    console.log("questionsPerLevel:", questionsPerLevel);

    // Create a unique question set name.
    const timestamp = new Date().toLocaleString('en-US', {
      weekday: 'short', // e.g., 'Mon'
      year: 'numeric', // e.g., '2025'
      month: 'short', // e.g., 'Apr'
      day: 'numeric', // e.g., '9'
      hour: '2-digit', // e.g., '02'
      minute: '2-digit', // e.g., '30'
      second: '2-digit', // e.g., '15'
      hour12: true, // 12-hour format (AM/PM)
    }).replace(/[,]/g, '').replace(/[:]/g, '-'); // Remove commas and replace colons with hyphens

    const questionSetName = `Untitled-${topic}-${timestamp}`;
    // Retrieve subject from the associated class.
    const classFound = await ClassModel.findOne({ institution: institutionId });
    const subject = classFound?.subject;

    if (!subject) {
      return res.status(404).json({ error: "Subject not found." });
    }


    const vector = await getEmbeddings(topic, client)
    
    if (!vector || vector.length === 0) {
      console.error('No embeddings to insert into Pinecone');
      return res.status(400).json({ message: 'Failed to process the webpage into embeddings' });;
    }


    // console.log("Embeddings:", embeddings);

    // query pinecone
    const pineconeFilter = {
      fileName: { $in: files },
    };

    const results = await index.query({
      topK: 10,
      vector,
      includeMetadata: false,
      includeValues: true,
      filter: pineconeFilter,

    });

    // gett values from results

    const { matches } = results;
    const values = matches.map((match) => match.values)?.flat();
    
    console.log("Pinecone query results:", results);

    let questionSetUpdatedId = null;
    if (!questionSetId) {
      const questionSet = new QuestionSetModel({
        name: questionSetName,
        institution: institutionId,
        user: userID,
      });
      await questionSet.save();
      questionSetUpdatedId = questionSet._id;
    }

    // Build prompt using the input parameters.
    const input = {
      topic,
      subject,
      learningObjective,
      bloomLevel,
      difficultyLevels,
      questionsPerLevel,
      questionType,
      context
    };
    const prompt = buildQuestionsPrompt(input);
    console.log("Prompt:", prompt);

    // Generate questions.
    const questions = await generate(prompt);
    if (!questions || questions.length === 0) {
      return res.status(500).json({ error: "No questions generated." });
    }

    // Sanitize and map generated questions.
    const sanitizedData = questions.map((q) => {
      const flatOptions = (q.options || []).map((opt) => opt.value);
      const mappedAnswers = (q.answers || []).map((ansId) => {
        const match = q.options?.find((opt) => opt.id === ansId);
        return match?.value;
      });
      console.log("Using question set ID:", questionSetUpdatedId);

      return {
        question: q.question || "",
        details: q.details || "",
        type: q.type || "MCQ",
        score: 1,
        explanation: q.explanation || "",
        options: flatOptions,
        answers: mappedAnswers,
        duration: q.duration || 10,
        textQuestionHtml: q.textQuestionHtml || "",
        fileLink: "",
        activationRepeatCountLimit: 0,
        activateImmediately: true,
        videoExplanationLinks: [],
        pdfExplanationLinks: [],
        youtubeEmbedCodes: [],
        // Use questionSetId if it's valid; otherwise, use questionSetUpdatedId.
        questionSet: (questionSetId && questionSetId !== "undefined")
          ? questionSetId
          : questionSetUpdatedId,
        institution: institutionId,
        user: userID,
      };
    });

    // Save the questions and update the corresponding question set.
    const savedQuestions = await QuestionModel.insertMany(sanitizedData);
    const questionIds = savedQuestions.map((q) => q._id);
    await QuestionSetModel.updateOne(
      { _id: questionSetId || questionSetUpdatedId },
      { $push: { questions: { $each: questionIds } } }
    );

    res.status(201).json({
      message: "Questions generated and saved successfully.",
      // question: savedQuestions,
      results: results,
      embeds: vector,
      values: values,
    });
  } catch (error) {
    console.error("Error in generateQuestionsHandler:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
