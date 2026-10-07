require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-3.1-flash-lite")
  .toLowerCase()
  .trim();

module.exports = {
  GEMINI_MODEL,
  genAI,
  apiKey,
};
