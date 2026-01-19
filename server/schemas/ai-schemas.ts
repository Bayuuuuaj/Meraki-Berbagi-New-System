import { z } from 'zod';

export const processDocumentSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title is too long"),
    content: z.string().min(10, "Content is too short").max(50000, "Content is too long (Max 50k chars)")
});

export const meetingAnalysisSchema = z.object({
    meetingId: z.string().uuid("Invalid Meeting ID"), // Assuming UUIDs, adjust if needed
    notes: z.string().min(10, "Notes are too short").max(20000, "Notes are too long"),
    attendanceRate: z.number().min(0).max(1)
});

export const financialPredictionSchema = z.object({
    type: z.enum(['in', 'out', 'balance']),
    periodsAhead: z.number().int().min(1).max(12).default(3)
});

export const chatSchema = z.object({
    message: z.string().min(1, "Message is required").max(1000, "Message is too long"),
});

export const askAISchema = z.object({
    query: z.string().min(2, "Pertanyaan terlalu pendek").max(500, "Pertanyaan terlalu panjang"),
});

export const simulateSchema = z.object({
    modifiers: z.object({
        incomeChangePercent: z.number().optional(),
        expenseChangePercent: z.number().optional(),
        oneTimeIncome: z.number().optional(),
        oneTimeCost: z.number().optional()
    }),
    periods: z.number().min(1).max(24).default(6)
});
