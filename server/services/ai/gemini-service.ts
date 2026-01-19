
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
// Note: In production, this should come from process.env
const API_KEY = process.env.GOOGLE_GENAI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// Select model - "gemini-pro" is good for text
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export class GeminiService {

    /**
     * Check if Gemini is configured/available
     */
    static isAvailable(): boolean {
        return !!API_KEY && API_KEY.length > 0;
    }

    /**
     * Generate text content from a prompt
     */
    static async generateText(prompt: string): Promise<string> {
        if (!this.isAvailable()) {
            console.warn("Gemini API Key missing. Skipping AI generation.");
            return "";
        }

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini API Error:", error);
            return ""; // Fallback to empty string or handle upstream
        }
    }

    /**
     * Generate structured JSON output
     * Useful for extracting specific fields like entities, action items, etc.
     */
    static async generateJSON<T>(prompt: string): Promise<T | null> {
        if (!this.isAvailable()) return null;

        const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON with no markdown formatting or explanations.`;

        try {
            const text = await this.generateText(jsonPrompt);
            // Clean up if the model wraps it in ```json ... ```
            const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(cleaned) as T;
        } catch (error) {
            console.error("Gemini JSON Parse Error:", error);
            return null;
        }
    }
}
