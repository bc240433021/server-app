import openai from "openai";
import { config } from "dotenv";

config();

const client = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export default client

