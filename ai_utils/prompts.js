export const conceptualPrompt = `
You're an expert tutor. Analyze the student's answer to a conceptual question. Focus on whether the answer is correct, partially correct, or incorrect. Do not penalize for missing details unless they affect the core understanding. Avoid mentioning unrelated facts.

Respond using this structure:

type: "conceptual"

evaluation: A concise explanation (max 3 lines) of whether the student's understanding is correct, clear, and complete enough to demonstrate conceptual understanding. must not be more than 3 lines.

incorrectAnswers: Only include this if the student made actual incorrect or misleading statements. For each item:
  - statement: The exact incorrect part from the student’s answer.
  - explanation: Why it's incorrect or misleading.
  - confidence: A number between 0 and 1 indicating how sure you are that it's wrong.

score: Give a score from 0 to 5 based on how well the student demonstrated conceptual understanding. Do not deduct points for missing non-essential information.

confidence: Your confidence in this evaluation (0 to 1).
`;

export const languagePrompt = `
Analyze the following text and determine its primary language.
Respond with a JSON object containing these keys:
1.  language_name: The full name of the language (e.g., 'English', 'Spanish', 'French'). If the language cannot be determined or is mixed, use 'Undetermined'.
2.  language_code: The corresponding ISO 639-1 code (e.g., 'en', 'es', 'fr'). Use 'und' if undetermined.
3.  confidence: A numerical score between 0.0 (no confidence) and 1.0 (full confidence) representing your certainty in the detection. Use 0.0 if undetermined or confidence is negligible.
`;

 // const lang = await detectLanguage(data.studentAnswer);
export const mathPrompt = `
 You are an expert math evaluator.

Evaluate the following student answer to a calculation-based question. Your evaluation must follow this JSON schema:

{
"type": "calculation",
"evaluation": "[A detailed explanation of the student's performance: correctness, approach, and feedback.]",
"incorrectAnswers": [
  {
    "statement": "[Part of the student's answer that is incorrect.]",
    "explanation": "[Why it's wrong.]", must not be more than 3 lines.
    "confidence": [A float between 0 and 1 representing your confidence in this error identification.]
  }
],
"score": [A number between 0 and 5 representing how well the student answered.],
"confidence": [A float between 0 and 1 representing your confidence in the overall evaluation.]
}

Please follow the schema strictly and provide your output as a valid JSON object.

  `;


export  const language_prompt = `
  Analyze the following text and determine its primary language.
  Respond with a JSON object containing these keys:
  1.  language_name: The full name of the language (e.g., 'English', 'Spanish', 'French'). If the language cannot be determined or is mixed, use 'Undetermined'.
  2.  language_code: The corresponding ISO 639-1 code (e.g., 'en', 'es', 'fr'). Use 'und' if undetermined.
  3.  confidence: A **numerical score between 0.0 (no confidence) and 1.0 (full confidence)** representing your certainty in the detection. Use 0.0 if undetermined or confidence is negligible.
  `;
  
export  const buildGrammarPrompt = (language) => {
      const basePrompt = `Correct only the grammatical errors in the provided sentence. 
  Do not change or remove any factual information, even if it appears incorrect. 
  Focus solely on grammar, punctuation, and capitalization. 
  Return your response as JSON with keys: 'sentence', 'corrected_sentence', and 'errors'.`
      return basePrompt + ` Ensure that ${language} grammar and punctuation rules are followed.`;
  };

 export const buildQuestionsPrompt = (input) => {
      const { questionType, difficultyLevels, topic, subject, learningObjective, bloomLevel, questionsPerLevel,context } = input;
  
      let prompt = `${questionsPerLevel} ${questionType} question for each of the following difficulty levels: ${difficultyLevels}}.
  Topic: "${topic}"
  Subject: "${subject}"
  Learning Objective: "${learningObjective}"
  Bloom’s Level: "${bloomLevel}"
  Difficulty level: ${difficultyLevels}
  
  Use only the information provided in the context below to create the questions. Do not include any information not present in the context. Ensure that all questions are factually accurate and verifiable from the context.
  context: "${context}"
  
  Each question should include:`;
  
      switch (questionType) {
          case "MCQ":
              prompt += `
  - A question stem
  - 4 answer choices (A–D)
  - Mark the correct answer clearly (provide the 'id' of the correct option in the 'answers' array)
  Follow item-writing best practices (no "all of the above", no ambiguity, one clear correct answer).
  `;
              break;
          case "CHECKBOXES":
              prompt += `
  - A question stem
  - At least 3 answer choices
  - Indicate all correct answers clearly (provide the 'id's of all correct options in the 'answers' array)
  Follow item-writing best practices.
  `;
              break;
          case "TRUE-OR-FALSE":
              prompt += `
  - A statement that is either true or false
  - Indicate the correct answer as either "True" or "False" in the 'answers' array.
  `;
              break;
          case "FREE-TEXT":
              prompt += `
  - An open-ended question
  - Provide a sample correct answer or the key concepts expected in the 'answers' array.
  `;
              break;
          case "SORTER":
              prompt += `
  - A list of at least 3 items that need to be sorted
  - Provide the correct order of the items in the 'answers' array (e.g., ["item 1", "item 2", "item 3"]).
  `;
              break;
          case "FILL-IN-THE-GAPS":
              prompt += `
  - A sentence with one or more blanks to be filled
  - Indicate the correct word(s) to fill in the blank(s) in the 'answers' array. Use "[BLANK]" to represent the gaps in the question. For example: "Photosynthesis uses sunlight, water, and [BLANK] to produce glucose and oxygen." and the answer would be ["carbon dioxide"].
  `;
              break;
      }
  
      return prompt;
  };
  