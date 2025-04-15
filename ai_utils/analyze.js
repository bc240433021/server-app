import { z } from 'zod';
import { zodResponseFormat } from "openai/helpers/zod";
import client from "../config/openai.js"; // Import OpenAI client
import {
    conceptualPrompt,   
    mathPrompt,
    languagePrompt 
} from "./prompts.js";
// === SCHEMAS ===
const questionConfidenceSchema = z.object({
    type: z.enum(["calculation", "conceptual"]),
    confidence: z.number()
});

const checkAnswersSchema = z.object({
    type: z.enum(["calculation", "conceptual"]),
    evaluation: z.string(),
    incorrectAnswers: z.array(
        z.object({
            statement: z.string(),
            explanation: z.string(),
            confidence: z.number(),
        })
    ),
    score: z.number(),
    confidence: z.number(),
});

const languageDetectResponse = z.object({
    name: z.string(),
    code: z.string(),
    confidence: z.number(),
});

// === LANGUAGE DETECTION ===
export const detectLanguage = async (text) => {
    try {
        const completion = await client.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                { role: "system", content: languagePrompt },
                { role: "user", content: text },
            ],
            response_format: zodResponseFormat(languageDetectResponse, 'data'),
        });
        return completion.choices[0].message.parsed;
    } catch (error) {
        console.error("Error detecting language:", error);
        return null;
    }
};

// === CONCEPTUAL CHECK ===
export const checkConceptual = async (data) => {
    // const lang = await detectLanguage(data.studentAnswer);


    try {
        const completion = await client.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                { role: "system", content: conceptualPrompt },
                {
                    role: "user",
                    content: `question: ${data.question}, studentAnswer: ${data.studentAnswer}`,
                },
            ],
            response_format: zodResponseFormat(checkAnswersSchema, 'confidence'),
        });

        const result = completion.choices[0].message.parsed;
        console.log("🧪 Conceptual Evaluation Result:", result);
        return result;
    } catch (error) {
        console.error('Error evaluating conceptual answer:', error);
    }
};
export const checkMathematical = async (data) => {

    try {
        const completion = await client.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                { role: "system", content: mathPrompt },
                {
                    role: "user",
                    content: `question: ${data.question}, studentAnswer: ${data.studentAnswer}`,
                },
            ],
            response_format: zodResponseFormat(checkAnswersSchema, 'confidence'),
        });

        const result = completion.choices[0].message.parsed;
        console.log("🧪 Conceptual Evaluation Result:", result);
        return result;
    } catch (error) {
        console.error('Error evaluating conceptual answer:', error);
    }
};

// === QUESTION TYPE CLASSIFICATION ===
export const differentiateQuestions = async (question) => {
    try {
        const completion = await client.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                {
                    role: "system",
                    content: `
Classify questions as either requiring "calculation" or being "conceptual".

Given a question, respond in the following JSON format:
{
  "type": "calculation" | "conceptual",
  "confidence": float (between 0 and 1)
}

Only use "calculation" if a mathematical process is clearly needed to answer.
                `,
                },
                {
                    role: "user",
                    content: question,
                },
            ],
            response_format: zodResponseFormat(questionConfidenceSchema, 'confidence'),
        });

        return completion.choices[0].message.parsed;
    } catch (error) {
        console.error('Error classifying question:', error);
    }
};
