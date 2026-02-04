
export class GeminiService {

    /**
     * Startup diagnostics - No-op for offline mode
     */
    static diagnose(): void {
        console.log("ℹ️ Offline Mode: Gemini Intelligence is disabled.");
    }

    /**
     * Check if Gemini is configured/available - Always false in offline mode
     */
    static isAvailable(): boolean {
        return false;
    }

    /**
     * Generate text content - No-op
     */
    static async generateText(prompt: string, imageData?: string): Promise<string> {
        console.warn("GeminiService: Requested generation in offline mode.");
        return "";
    }

    /**
     * Generate structured JSON output - No-op
     */
    static async generateJSON<T>(prompt: string, imageData?: string): Promise<T | null> {
        console.warn("GeminiService: Requested JSON in offline mode.");
        return null;
    }
}
