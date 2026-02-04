/**
 * AI Routes for Meraki Berbagi
 * Handles all AI-related API endpoints
 */

import type { Express, Request, Response, NextFunction } from "express";
import { DocumentService } from "./services/ai/document-service.ts";
import { MeetingService } from "./services/ai/meeting-service.ts";
import { RiskService, type Transaction, type AttendanceRecord } from "./services/ai/risk-service.ts";
import { storage } from "./storage.ts";
import { aiLimiter } from "./middleware/rate-limiter.ts";
import { logger } from "./utils/logger.ts";
import { z } from "zod";
import { processDocumentSchema, meetingAnalysisSchema, financialPredictionSchema, askAISchema, simulateSchema } from "./schemas/ai-schemas.ts";
import { NLPService } from "./services/ai/nlp-service.ts";
import { PredictiveService } from "./services/ai/predictive-service.ts";

/**
 * Helper to simulate word-by-word streaming over SSE
 */
async function sendStreamingResponse(res: Response, fullText: string, metadata: any) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send metadata first
    res.write(`data: ${JSON.stringify({ type: 'metadata', ...metadata })}\n\n`);

    const words = fullText.split(' ');
    for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + (i === words.length - 1 ? '' : ' ');
        res.write(`data: ${JSON.stringify({ type: 'content', chunk })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 40)); // 30-70ms delay
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
}

// Validation Middleware Helper
const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: "Validation Error",
                errors: error.errors.map(e => e.message)
            });
        }
        next(error);
    }
};

export function registerAIRoutes(app: Express): void {

    // Apply Rate Limiter to all AI routes
    app.use("/api/ai", aiLimiter);

    // ==================== DOCUMENT AI ROUTES ====================

    /**
     * Process document with AI (classify, extract keywords, summarize)
     */
    app.post("/api/ai/documents/process", validate(processDocumentSchema), async (req, res) => {
        try {
            const { title, content, stream = false } = req.body;
            const result = await DocumentService.processDocument(title, content);

            if (stream) {
                return sendStreamingResponse(res, result.summary, {
                    category: result.category,
                    confidence: result.confidence,
                    keywords: result.keywords,
                    entities: result.entities,
                    priority: result.priority
                });
            }

            logger.info("Document Processed", { title, summaryLength: result.summary.length });

            res.json({ success: true, data: result });
        } catch (error) {
            logger.error("AI Document Process Error", { error });
            res.status(500).json({ message: "Failed to process document with AI" });
        }
    });

    /**
     * Classify document
     */
    app.post("/api/ai/documents/classify", async (req, res) => {
        try {
            const { content } = req.body;
            if (!content) return res.status(400).json({ message: "Content is required" });

            const result = DocumentService.classifyDocument(content);
            res.json({
                success: true,
                data: {
                    category: result.category,
                    confidence: result.confidence,
                    allScores: result.allScores
                }
            });
        } catch (error) {
            logger.error("AI Classification Error", { error });
            res.status(500).json({ message: "Failed to classify document" });
        }
    });

    /**
     * Summarize document
     */
    app.post("/api/ai/documents/summarize", async (req, res) => {
        try {
            const { content, maxSentences = 3 } = req.body;
            if (!content) return res.status(400).json({ message: "Content is required" });

            const summary = await DocumentService.summarizeDocument(content, maxSentences);
            const keywords = DocumentService.getDocumentKeywords(content);

            res.json({ success: true, data: { summary, keywords } });
        } catch (error) {
            logger.error("AI Summarization Error", { error });
            res.status(500).json({ message: "Failed to summarize document" });
        }
    });

    // ==================== MEETING AI ROUTES ====================

    /**
     * Suggest optimal meeting times
     */
    app.post("/api/ai/meetings/suggest-time", async (req, res) => {
        try {
            const { participants = [], duration = 60, preferredDays = 7 } = req.body;

            const users = await storage.getAllUsers();

            // Build participants list (same logic as before)
            const participantObjects = participants.map((id: string) => {
                const user = users.find(u => u.id === id);
                return {
                    id,
                    name: user?.name || "Unknown",
                    email: user?.email,
                    availability: []
                };
            });

            if (participantObjects.length === 0) {
                users.filter(u => u.isActive === 1).forEach(u => {
                    participantObjects.push({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        availability: []
                    });
                });
            }

            const suggestions = MeetingService.suggestMeetingTimes(participantObjects, duration, preferredDays);

            logger.info("Meeting Times Suggested", { count: suggestions.length });

            res.json({ success: true, data: suggestions.slice(0, 5) });
        } catch (error) {
            logger.error("AI Meeting Suggest Error", { error });
            res.status(500).json({ message: "Failed to suggest meeting times" });
        }
    });

    /**
     * Generate meeting summary from notes
     */
    app.post("/api/ai/meetings/summarize", async (req, res) => {
        try {
            const { notes, title, stream = false } = req.body;
            if (!notes) return res.status(400).json({ message: "Meeting notes are required" });

            const summary = MeetingService.generateMeetingSummary(notes, title);
            const actionItems = MeetingService.extractActionItems(notes);
            const sentiment = MeetingService.analyzeMeetingSentiment(notes);

            if (stream && summary !== 'Data tidak valid atau terlalu sedikit untuk dianalisis') {
                return sendStreamingResponse(res, summary, {
                    actionItems,
                    sentiment: {
                        score: sentiment.overallScore,
                        label: sentiment.label,
                        positiveAspects: sentiment.positiveAspects,
                        negativeAspects: sentiment.negativeAspects,
                        suggestions: sentiment.suggestions
                    }
                });
            }

            res.json({
                success: true,
                data: {
                    summary,
                    actionItems,
                    sentiment: {
                        score: sentiment.overallScore,
                        label: sentiment.label,
                        positiveAspects: sentiment.positiveAspects,
                        negativeAspects: sentiment.negativeAspects,
                        suggestions: sentiment.suggestions
                    }
                }
            });
        } catch (error) {
            logger.error("AI Meeting Summary Error", { error });
            res.status(500).json({ message: "Failed to generate meeting summary" });
        }
    });

    /**
     * Extract action items
     */
    app.post("/api/ai/meetings/action-items", async (req, res) => {
        try {
            const { notes } = req.body;
            if (!notes) return res.status(400).json({ message: "Meeting notes are required" });

            const actionItems = MeetingService.extractActionItems(notes);
            res.json({ success: true, data: actionItems });
        } catch (error) {
            logger.error("AI Action Items Error", { error });
            res.status(500).json({ message: "Failed to extract action items" });
        }
    });

    /**
     * Analyze meeting sentiment
     */
    app.post("/api/ai/meetings/sentiment", async (req, res) => {
        try {
            const { text } = req.body;
            if (!text) return res.status(400).json({ message: "Text is required" });

            const sentiment = MeetingService.analyzeMeetingSentiment(text);
            res.json({ success: true, data: sentiment });
        } catch (error) {
            logger.error("AI Sentiment Error", { error });
            res.status(500).json({ message: "Failed to analyze sentiment" });
        }
    });

    // ==================== RISK AI ROUTES ====================

    /**
     * Run comprehensive risk analysis
     */
    app.get("/api/ai/risk/analyze", async (_req, res) => {
        try {
            const [treasuryData, attendanceData, users] = await Promise.all([
                storage.getAllTreasury(),
                storage.getAllAttendance(),
                storage.getAllUsers()
            ]);

            const activeMemberCount = users.filter(u => u.isActive === 1).length;

            const transactions: Transaction[] = treasuryData
                .filter(t => t.status === 'verified')
                .map(t => ({
                    id: t.id,
                    userId: t.userId,
                    userName: users.find(u => u.id === t.userId)?.name,
                    amount: t.amount,
                    type: t.type as 'in' | 'out',
                    category: t.category,
                    date: new Date(t.date),
                    notes: t.notes || undefined,
                    status: t.status
                }));

            const attendanceRecords: AttendanceRecord[] = attendanceData.map(a => ({
                id: a.id,
                userId: a.userId,
                userName: users.find(u => u.id === a.userId)?.name,
                date: new Date(a.date),
                status: a.status as 'hadir' | 'izin' | 'sakit' | 'alpha'
            }));

            const report = await RiskService.generateRiskReport(
                transactions,
                attendanceRecords,
                { totalMembers: activeMemberCount }
            );

            res.json({ success: true, data: report });
        } catch (error) {
            logger.error("AI Risk Analysis Error", { error });
            res.status(500).json({ message: "Failed to analyze risks" });
        }
    });

    /**
     * Check for fraudulent transactions
     */
    app.get("/api/ai/risk/fraud-check", async (_req, res) => {
        try {
            const [treasuryData, users] = await Promise.all([
                storage.getAllTreasury(),
                storage.getAllUsers()
            ]);

            const transactions: Transaction[] = treasuryData
                .filter(t => t.status === 'verified')
                .map(t => ({
                    id: t.id,
                    userId: t.userId,
                    userName: users.find(u => u.id === t.userId)?.name,
                    amount: t.amount,
                    type: t.type as 'in' | 'out',
                    category: t.category,
                    date: new Date(t.date),
                    notes: t.notes || undefined,
                    status: t.status
                }));

            const fraudIndicators = RiskService.detectFraudulentTransactions(transactions);

            res.json({
                success: true,
                data: {
                    totalTransactions: transactions.length,
                    suspiciousCount: fraudIndicators.length,
                    highRiskCount: fraudIndicators.filter(f => f.riskScore >= 70).length,
                    indicators: fraudIndicators
                }
            });
        } catch (error) {
            logger.error("AI Fraud Check Error", { error });
            res.status(500).json({ message: "Failed to check for fraud" });
        }
    });

    /**
     * Check compliance status
     */
    app.get("/api/ai/risk/compliance", async (_req, res) => {
        try {
            const [attendanceData, users] = await Promise.all([
                storage.getAllAttendance(),
                storage.getAllUsers()
            ]);

            const attendanceRecords: AttendanceRecord[] = attendanceData.map(a => ({
                id: a.id,
                userId: a.userId,
                userName: users.find(u => u.id === a.userId)?.name,
                date: new Date(a.date),
                status: a.status as 'hadir' | 'izin' | 'sakit' | 'alpha'
            }));

            const complianceStatuses = RiskService.monitorAttendanceCompliance(attendanceRecords);

            res.json({
                success: true,
                data: {
                    totalMembers: complianceStatuses.length,
                    compliantCount: complianceStatuses.filter(s => s.status === 'compliant').length,
                    warningCount: complianceStatuses.filter(s => s.status === 'warning').length,
                    nonCompliantCount: complianceStatuses.filter(s => s.status === 'non_compliant').length,
                    statuses: complianceStatuses
                }
            });
        } catch (error) {
            logger.error("AI Compliance Check Error", { error });
            res.status(500).json({ message: "Failed to check compliance" });
        }
    });

    /**
     * Get financial predictions
     */
    app.get("/api/ai/risk/predictions", async (req, res) => {
        try {
            const type = (req.query.type as string) || 'balance';
            const periodsAhead = parseInt(req.query.periods as string) || 3;

            const [treasuryData, users] = await Promise.all([
                storage.getAllTreasury(),
                storage.getAllUsers()
            ]);

            const transactions: Transaction[] = treasuryData
                .filter(t => t.status === 'verified')
                .map(t => ({
                    id: t.id,
                    userId: t.userId,
                    userName: users.find(u => u.id === t.userId)?.name,
                    amount: t.amount,
                    type: t.type as 'in' | 'out',
                    category: t.category,
                    date: new Date(t.date),
                    notes: t.notes || undefined,
                    status: t.status
                }));

            const prediction = await RiskService.predictFinancialTrends(
                transactions,
                type as 'in' | 'out' | 'balance',
                periodsAhead
            );

            res.json({ success: true, data: prediction });
        } catch (error) {
            logger.error("AI Prediction Error", { error });
            res.status(500).json({ message: "Failed to generate predictions" });
        }
    });

    /**
     * Get AI dashboard summary
     */
    app.get("/api/ai/dashboard", async (_req, res) => {
        try {
            const [treasuryData, attendanceData, users] = await Promise.all([
                storage.getAllTreasury(),
                storage.getAllAttendance(),
                storage.getAllUsers()
            ]);

            const activeMembers = users.filter(u => u.isActive === 1);

            const transactions: Transaction[] = treasuryData
                .filter(t => t.status === 'verified')
                .map(t => ({
                    id: t.id,
                    userId: t.userId,
                    userName: users.find(u => u.id === t.userId)?.name,
                    amount: t.amount,
                    type: t.type as 'in' | 'out',
                    category: t.category,
                    date: new Date(t.date),
                    notes: t.notes || undefined,
                    status: t.status
                }));

            const attendanceRecords: AttendanceRecord[] = attendanceData.map(a => ({
                id: a.id,
                userId: a.userId,
                userName: users.find(u => u.id === a.userId)?.name,
                date: new Date(a.date),
                status: a.status as 'hadir' | 'izin' | 'sakit' | 'alpha'
            }));

            // 1. Efficiency Score & Zero State Logic
            if (transactions.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        learningMode: true,
                        riskScore: {
                            overall: 0,
                            trend: 'stable',
                            details: { overall: 'Belum ada data transaksi yang diverifikasi. Hubungkan dengan Kas untuk memulai analisis.' }
                        },
                        alerts: [],
                        habits: [],
                        summary: {
                            totalTransactions: 0,
                            suspiciousTransactions: 0,
                            totalMembers: activeMembers.length,
                            complianceRate: 0,
                            financialTrend: 'neutral',
                            pendingHITL: treasuryData.filter(t => t.status === 'pending').length
                        },
                        predictions: [],
                        predictedPeriods: [],
                        auditSummary: "Belum ada data untuk dianalisis."
                    }
                });
            }

            // Learning Mode Logic: Jika data < 5 transaksi terverifikasi
            if (transactions.length < 5) {
                return res.json({
                    success: true,
                    data: {
                        learningMode: true,
                        riskScore: {
                            overall: Math.min(transactions.length * 2, 8),
                            trend: 'stable',
                            details: { overall: 'AI sedang mempelajari pola pengeluaran. Minimal 5 transaksi terverifikasi diperlukan untuk analisis mendalam.' }
                        },
                        alerts: [],
                        habits: [],
                        summary: {
                            totalTransactions: transactions.length,
                            suspiciousTransactions: 0,
                            totalMembers: activeMembers.length,
                            complianceRate: 100,
                            financialTrend: 'stable',
                            pendingHITL: treasuryData.filter(t => t.status === 'pending').length
                        },
                        predictions: [],
                        predictedPeriods: [],
                        auditSummary: "Menunggu Input Data Transaksi (Minimal 5)"
                    }
                });
            }

            // Run analyses
            const fraudIndicators = RiskService.detectFraudulentTransactions(transactions);
            const complianceStatuses = RiskService.monitorAttendanceCompliance(attendanceRecords);
            const financialPrediction = await RiskService.predictFinancialTrends(transactions, 'balance');
            const habits = RiskService.analyzeOrganizationalHabits(transactions, attendanceRecords);

            const pendingTreasuryCount = treasuryData.filter(t => t.status !== 'verified').length;
            const riskScore = RiskService.calculateRiskScore(
                fraudIndicators,
                complianceStatuses,
                financialPrediction,
                {
                    pendingTreasuryCount,
                    totalMembers: activeMembers.length
                }
            );

            const alerts = RiskService.generateRiskAlerts(fraudIndicators, complianceStatuses, riskScore);

            res.json({
                success: true,
                data: {
                    learningMode: false,
                    riskScore,
                    alerts: alerts.slice(0, 5),
                    habits,
                    summary: {
                        totalTransactions: transactions.length,
                        suspiciousTransactions: fraudIndicators.length,
                        totalMembers: activeMembers.length,
                        complianceRate: complianceStatuses.length > 0
                            ? Math.round((complianceStatuses.filter(s => s.status === 'compliant').length / complianceStatuses.length) * 100)
                            : 100,
                        financialTrend: financialPrediction.trend,
                        pendingHITL: treasuryData.filter(t => t.status === 'pending').length
                    },
                    auditSummary: "Sistem Keuangan Bersih & Terverifikasi",
                    predictions: financialPrediction.predictions,
                    predictedPeriods: financialPrediction.periods
                }
            });
        } catch (error) {
            logger.error("AI Dashboard Error", { error });
            res.status(500).json({ message: "Failed to load AI dashboard" });
        }
    });

    // ... inside registerAIRoutes function ...

    // ==================== ADVANCED INTELLIGENCE ROUTES ====================

    /**
     * Ask AI (Cognitive Search)
     */
    app.post("/api/ai/ask", validate(askAISchema), async (req, res) => {
        try {
            const { query } = req.body;

            // 1. AI Parsing with Gemini
            const analysis = await NLPService.classifyIndonesianQuery(query);

            // 2. Fallback to deterministic if AI fails
            const deterministicAnalysis = NLPService.processQuery(query);
            const finalAnalysis = analysis || deterministicAnalysis;

            // 3. Fetch Data based on Intent
            let data: any = null;
            let answer = "Maaf, saya belum menemukan data yang spesifik.";

            if (finalAnalysis.entity === 'member' || finalAnalysis.intent === 'QUERY_DATA') {
                const users = await storage.getAllUsers();
                data = users.map(u => ({ id: u.id, name: u.name, role: u.role, isActive: u.isActive }));
                answer = `Ditemukan ${users.length} data anggota.`;
            } else if (finalAnalysis.entity === 'treasury' || finalAnalysis.entity === 'treasury_logs') {
                const treasury = await storage.getAllTreasury();
                data = { count: treasury.length, total: treasury.reduce((a, b) => a + (b.type === 'in' ? b.amount : -b.amount), 0) };
                answer = "Ringkasan data keuangan telah dimuat.";
            }

            res.json({
                success: true,
                data: {
                    analysis: finalAnalysis,
                    answer,
                    result: data
                }
            });

        } catch (error) {
            logger.error("AI Ask Error", { error });
            res.status(500).json({ message: "Gagal memproses pertanyaan." });
        }
    });

    /**
     * Financial Simulator
     */
    app.post("/api/ai/simulate", validate(simulateSchema), async (req, res) => {
        try {
            const { modifiers, periods } = req.body;

            const treasury = await storage.getAllTreasury();
            const monthlyBalance = new Map<string, number>();
            treasury.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            treasury.forEach(t => {
                const k = new Date(t.date).toISOString().slice(0, 7);
                const val = t.type === 'in' ? t.amount : -t.amount;
                monthlyBalance.set(k, (monthlyBalance.get(k) || 0) + val);
            });

            let running = 0;
            const history: number[] = [];
            Array.from(monthlyBalance.keys()).sort().forEach(k => {
                running += monthlyBalance.get(k)!;
                history.push(running);
            });

            if (history.length < 2) {
                if (process.env.NODE_ENV !== 'production') {
                    history.push(1000000, 1200000, 1500000, 1400000, 1800000);
                } else {
                    return res.status(400).json({ message: "Data history kurang untuk simulasi." });
                }
            }

            const simulation = PredictiveService.simulateScenario(history, modifiers, periods);

            // Generate AI Advice Narrative
            const currentSaldo = history[history.length - 1];
            const scenarioText = `Modifier: ${JSON.stringify(modifiers)}`;
            const advice = await PredictiveService.generateFinancialAdvice(currentSaldo, scenarioText, simulation);

            res.json({
                success: true,
                data: {
                    ...simulation,
                    advisorNote: advice
                }
            });

        } catch (error) {
            logger.error("AI Simulation Error", { error });
            res.status(500).json({ message: "Gagal menjalankan simulasi." });
        }
    });

    /**
     * Automated Treasury Reporting (Anomaly Detection)
     */
    app.get("/api/ai/treasury/analyze", async (_req, res) => {
        try {
            const [treasuryData, users] = await Promise.all([
                storage.getAllTreasury(),
                storage.getAllUsers()
            ]);

            const transactions: Transaction[] = treasuryData.map(t => ({
                id: t.id,
                userId: t.userId,
                userName: users.find(u => u.id === t.userId)?.name,
                amount: t.amount,
                type: t.type as 'in' | 'out',
                category: t.category,
                date: new Date(t.date),
                notes: t.notes || undefined,
                status: t.status
            }));

            const analysis = await RiskService.analyzeTreasuryReport(transactions);

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            logger.error("AI Treasury Analysis Error", { error });
            res.status(500).json({ message: "Gagal menganalisis data kas." });
        }
    });

    /**
     * Verify/Approve AI Transaction (Human-in-the-Loop)
     */
    app.post("/api/ai/treasury/verify", async (req, res) => {
        try {
            const { transactionId, status, verifierName, updatedData } = req.body;
            const userId = req.headers['x-user-id'] as string || "system";

            if (!transactionId || !status) {
                return res.status(400).json({ message: "Transaction ID and status are required" });
            }

            const existingTreasury = await storage.getTreasury(transactionId);
            if (!existingTreasury) {
                return res.status(404).json({ message: "Transaction not found" });
            }

            // Update verification status with auditor metadata + optional manual corrections
            const updates: any = {
                verificationStatus: status,
                verifiedBy: verifierName || "Bendahara",
                verifiedAt: new Date(),
                status: status === 'verified' ? 'verified' : (status === 'flagged' ? 'flagged' : existingTreasury.status)
            };

            // If user corrected data in the UI, apply it here
            if (updatedData && status === 'verified') {
                if (updatedData.amount) updates.amount = updatedData.amount;
                if (updatedData.category) updates.category = updatedData.category;
                if (updatedData.date) updates.date = updatedData.date;
                if (updatedData.merchantName) {
                    updates.notes = `AI Extracted (Verified): ${updatedData.merchantName}`;
                }
            }

            const updated = await storage.updateTreasury(transactionId, updates, { userId, ip: req.ip || "" });

            logger.info("Transaction Verified", { transactionId, status, verifier: updates.verifiedBy });

            res.json({ success: true, data: updated });
        } catch (error) {
            logger.error("AI Verification Error", { error });
            res.status(500).json({ message: "Gagal memverifikasi transaksi." });
        }
    });

    /**
     * Get AI Analytics Stats (Monthly organizational health)
     */
    app.get("/api/ai/analytics/stats", async (_req, res) => {
        try {
            const logs = await storage.getAiAuditLogs();
            res.json({
                success: true,
                data: logs.map(l => ({
                    month: l.month,
                    score: l.efficiencyScore,
                    anomaliesCount: l.anomalies ? JSON.parse(l.anomalies).length : 0
                }))
            });
        } catch (error) {
            logger.error("AI Analytics Stats Error", { error });
            res.status(500).json({ message: "Gagal memuat statistik AI." });
        }
    });

    /**
     * Predictive Budgeting Suggestion
     */
    app.get("/api/ai/budget/suggest", async (_req, res) => {
        try {
            const [treasury, auditLogs] = await Promise.all([
                storage.getAllTreasury(),
                storage.getAiAuditLogs()
            ]);
            const suggestion = await PredictiveService.suggestBudget(treasury, auditLogs);
            res.json({ success: true, data: suggestion });
        } catch (error) {
            logger.error("AI Budget Suggestion Error", { error });
            res.status(500).json({ message: "Gagal mendapatkan saran anggaran." });
        }
    });

    /**
     * Extract receipt data from image/document
     */
    app.post("/api/ai/documents/extract-receipt", async (req, res) => {
        try {
            const { content } = req.body; // Base64 or text representation for extraction
            const userId = req.headers['x-user-id'] as string || "system";
            if (!content) return res.status(400).json({ message: "Content is required" });

            const result = await DocumentService.extractReceiptData(content);
            if (!result) {
                return res.status(500).json({ success: false, message: "Gagal mengekstrak nota" });
            }

            // ✅ CROSS-VALIDATION FLAG: Jika OCR baca Rp 0 atau nominal tidak masuk akal
            if (!result.amount || result.amount <= 0 || result.confidenceScore < 0.3) {
                return res.json({
                    success: true,
                    data: {
                        ...result,
                        isInvalid: true,
                        aiNotes: "Data tidak valid: Nominal Rp 0 atau kualitas gambar buruk. Silakan isi manual."
                    }
                });
            }

            let transactionId: string | undefined;

            // AUTOMATION: Create a PENDING_VERIFICATION transaction
            // We ALWAYS create a record now, so the manual verification modal has an ID to update
            const xUserId = req.headers['x-user-id'] as string;
            let targetUserId = userId; // default from "system" or headers

            if (xUserId && xUserId !== "undefined" && xUserId !== "null") {
                targetUserId = xUserId;
            } else {
                // Fallback to a default admin if no user ID provided
                const admin = await storage.getUserByEmail("admin@meraki.org");
                if (admin) targetUserId = admin.id;
            }

            if (targetUserId && targetUserId !== "system") {
                const record = await storage.createTreasury({
                    userId: targetUserId,
                    date: result.date || new Date().toISOString().split('T')[0],
                    amount: result.amount || 0,
                    type: "out",
                    category: result.category || "Lainnya",
                    notes: `AI Extracted from Receipt: ${result.merchantName || 'Nota'}`,
                    status: "pending",
                    verificationStatus: "pending",
                    createdBy: "AI_EXTRACTOR",
                    aiMetadata: JSON.stringify(result)
                }, { userId: targetUserId, ip: req.ip || "" });

                transactionId = record.id;
            }

            res.json({ success: true, data: { ...result, id: transactionId } });
        } catch (error) {
            logger.error("AI Receipt Extraction Error", { error });
            res.status(500).json({ message: "Failed to extract receipt data" });
        }
    });
}
