import { z } from 'zod';
import { zodResponseFormat } from "openai/helpers/zod";
import client from "../config/openai.js"; // Import OpenAI client
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'; // Import worker_threads module
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { json } from 'stream/consumers';
import {
    buildGrammarPrompt, language_prompt
} from "./prompts.js"
// import { isMainThread, parentPort, } from 'worker_threads';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GrammarModel = z.object({
    sentence: z.string(),
    corrected_sentence: z.string(),
    errors: z.array(z.string()), // Explicitly specify array items as strings
});

const GrammarResponse = z.object({
    data: z.array(GrammarModel),
});

const GrammarResponseSummaryModal = z.object({
    summary: z.string()
})
const languageDetectResponse = z.object({
    name: z.string(),
    code: z.string(),
    confidence: z.number(),
});
const getLanguage = async (text, prompt) => {
    try {
        const completion = await client.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: text },
            ],
            response_format: zodResponseFormat(languageDetectResponse, 'data'),
        });
        const data = completion.choices[0].message.parsed;
        return data;
    } catch (error) {
        console.error("Error detecting language:", error);
        return null;
    }
};

const splitText = (text) => {
    return text.trim().split(/(?<=[.!?:;])\s+|(?<=\.\.\.)\s+/);
};

const generateGrammar = async (sentence, prompt) => {
    try {
        const completion = await client.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: sentence },
            ],
            response_format: zodResponseFormat(GrammarResponse, 'data'),
        });
        const data = completion.choices[0].message.parsed;
        return data;
    } catch (error) {
        console.error("Error generating grammar questions:", error);
        return null;
    }
};



// Worker function to process each sentence
const processSentence = (sentence, grammar_prompt) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
            workerData: { sentence, grammar_prompt },
        });

        worker.on('message', (response) => {
            resolve(response);
        });

        worker.on('error', (error) => {
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
};

// This part will run in worker threads
if (!isMainThread) {
    const { sentence, grammar_prompt } = workerData;

    generateGrammar(sentence, grammar_prompt).then((response) => {
        parentPort.postMessage(response);
    }).catch((error) => {
        parentPort.postMessage({ error: error.message });
    });
}

const analyzeText = async (text) => {
    console.log(text);
    console.log("Analyzing text...");
    if (typeof text !== 'string') {
        throw new Error('Input must be a string');
    }

    const language = await getLanguage(text, language_prompt);
    if (language === null) {
        throw new Error('Error detecting language');
    }
    console.log("Detected language:", language);

    if (language.confidence < 0.5) {
        throw new Error('Language confidence is too low');
    }

    const grammar_prompt = buildGrammarPrompt(language?.name);
    console.log("Grammar prompt:", grammar_prompt);
    console.log("\n\n");

    const sentences = splitText(text);
    const results = [];

    // Create an array of promises to handle parallel processing of sentences
    const workerPromises = sentences.map((sentence) =>
        processSentence(sentence, grammar_prompt)
    );

    // Wait for all worker threads to complete
    const responses = await Promise.all(workerPromises);

    // Collect valid responses
    responses.forEach((response) => {
        if (response?.data && Array.isArray(response.data)) {
            results.push(...response.data); // Push data into results array
        } else {
            console.warn("Invalid response format for a sentence.");
        }
    });

    return results; // Return the final results
};


const grammar_analysis_prompt = `
Using the provided grammar evaluation JSON, produce a summary of the student's grammar performance. 
The summary should be concise (no more than three lines) and highlight both significant and minor grammar issues. 
Return your response as JSON with a single key: 'summary'.
`

export const analyzeGrammarResponse = async (data) => {
    try {
        const completion = await client.beta.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [
                { role: "system", content: grammar_analysis_prompt },
                { role: "user", content: JSON.stringify(data) },
            ],
            response_format: zodResponseFormat(GrammarResponseSummaryModal, 'summary'),
        });
        const result = completion.choices[0].message.parsed;
        return result?.summary;
    } catch (error) {
        console.error("Error generating grammar questions:", error);
        return null;
    }
}


export default analyzeText;