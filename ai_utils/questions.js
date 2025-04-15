
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import client from "../config/openai.js";

// Define a schema for the answer options
const optionSchema = z.object({
    id: z.string(),
    value: z.string(),
});
// Define the structure of a question
const questionSchema = z.object({
    question: z.string(),
    details: z.string().optional(),
    type: z.enum(["MCQ", "CHECKBOXES", "TRUE-OR-FALSE", "SORTER", "FILL-IN-THE-GAPS", "FREE-TEXT"]),
    explanation: z.string().optional(),
    options: z.array(optionSchema).optional(),
    answers: z.array(z.string()),
    duration: z.number().optional(),
    textQuestionHtml: z.string().optional(),
});
const responseSchema = z.object({
    data: z.array(questionSchema), // 'data' will hold the array of questions.
});
const generate = async (prompt) => {
    try {
        const completion = await client.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                { role: "system", content: "Generate educational questions" },
                { role: "user", content: prompt },
            ],
            response_format: zodResponseFormat(responseSchema, 'data'),
        });
        const data = completion.choices[0].message.parsed;
        return data?.data
    } catch (error) {
        console.error('Error generating text:', error);
        throw new Error("Failed to generate questions. Please try again.");
    }
};



export {
    generate
};
