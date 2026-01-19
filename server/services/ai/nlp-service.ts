
/**
 * Natural Language Processing (NLP) Service
 * Handles intent recognition, entity extraction, and query parsing
 * Optimized for Indonesian language
 */

import { MLEngine } from './ml-engine';
import { GeminiService } from './gemini-service';

// ==================== TYPES ====================

export type IntentType =
    | 'QUERY_DATA'
    | 'ANALYZE_TREND'
    | 'PREDICT_FUTURE'
    | 'UNKNOWN';

export type EntityType =
    | 'member'
    | 'treasury'
    | 'attendance'
    | 'meeting'
    | 'general';

export interface NLPQuery {
    originalText: string;
    intent: IntentType;
    entity: EntityType;
    filters: Record<string, any>;
    sort?: { field: string; direction: 'asc' | 'desc' };
    timeframe?: { start?: Date; end?: Date; month?: number; year?: number };
    confidence: number;
}

// ==================== KNOWLEDGE BASE ====================

const INENT_KEYWORDS = {
    QUERY_DATA: [
        'siapa', 'berapa', 'tampilkan', 'lihat', 'cari', 'daftar', 'list', 'show', 'who', 'what'
    ],
    ANALYZE_TREND: [
        'analisa', 'analisis', 'tren', 'trend', 'pola', 'naik', 'turun', 'bandingkan', 'compare', 'grafik'
    ],
    PREDICT_FUTURE: [
        'prediksi', 'proyeksi', 'masa depan', 'nanti', 'besok', 'bulan depan', 'tahun depan', 'forecast', 'predict'
    ]
};

const ENTITY_KEYWORDS = {
    member: ['anggota', 'member', 'orang', 'user', 'peserta', 'siapa', 'rajin', 'malas', 'aktif'],
    treasury: ['uang', 'kas', 'dana', 'biaya', 'bayar', 'iuran', 'donasi', 'pengeluaran', 'pemasukan', 'saldo', 'boros', 'hemat', 'surplus', 'defisit'],
    attendance: ['hadir', 'absen', 'kehadiran', 'datang', 'bolos', 'alpha', 'izin'],
    meeting: ['rapat', 'meeting', 'pertemuan', 'agenda', 'notulen']
};

const FILTER_MAPPINGS = {
    // Attendance
    'rajin': { field: 'attendanceRate', operator: 'sort', direction: 'desc' },
    'malas': { field: 'attendanceRate', operator: 'sort', direction: 'asc' },
    'jarang': { field: 'attendanceRate', operator: 'sort', direction: 'asc' },

    // Treasury
    'besar': { field: 'amount', operator: 'sort', direction: 'desc' },
    'kecil': { field: 'amount', operator: 'sort', direction: 'asc' },
    'belum bayar': { field: 'status', operator: 'filter', value: 'pending' },
    'lunas': { field: 'status', operator: 'filter', value: 'verified' },
    'boros': { field: 'type', operator: 'special', value: 'high_expense' },
    'hemat': { field: 'type', operator: 'special', value: 'low_expense' },
    'surplus': { field: 'balance', operator: 'special', value: 'positive' },
    'defisit': { field: 'balance', operator: 'special', value: 'negative' }
};

const TIME_KEYWORDS = {
    'bulan ini': 0,
    'bulan lalu': -1,
    'bulan depan': 1,
    'tahun ini': 0,
    'kemarin': -1,
    'minggu ini': 0
};

// ==================== SERVICE IMPLEMENTATION ====================

export class NLPService {

    /**
     * AI-powered Indonesian query classification using Gemini
     */
    static async classifyIndonesianQuery(text: string): Promise<any> {
        const prompt = `
            Sistem: Meraki-Berbagi Management.
            Tugas: Ubah query pengguna dalam Bahasa Indonesia menjadi parameter pencarian sistem.
            Entity: member, treasury_logs, budgets, attendance.
            Intent Types: QUERY_DATA, ANALYZE_TREND, PREDICT_FUTURE.

            User Query: "${text}"

            Hasilkan JSON dengan format (JSON ONLY):
            {
                "intent": "string",
                "entity": "string",
                "filters": { "field": "value" },
                "sort": "string",
                "summary_response_style": "formal/casual"
            }
        `;

        return await GeminiService.generateJSON(prompt);
    }

    /**
     * Process natural language query (legacy deterministic logic)
     */
    static processQuery(text: string): NLPQuery {
        const tokens = MLEngine.tokenize(text);
        const intent = this.detectIntent(tokens);
        const entity = this.detectEntity(tokens);
        const { filters, sort, timeframe } = this.extractParameters(text, tokens);
        const confidence = this.calculateConfidence(tokens, intent, entity);

        return {
            originalText: text,
            intent,
            entity,
            filters,
            sort,
            timeframe,
            confidence
        };
    }

    /**
     * Detect intent based on keyword scoring
     */
    private static detectIntent(tokens: string[]): IntentType {
        const scores = {
            QUERY_DATA: 0,
            ANALYZE_TREND: 0,
            PREDICT_FUTURE: 0
        };

        tokens.forEach(token => {
            if (INENT_KEYWORDS.QUERY_DATA.includes(token)) scores.QUERY_DATA++;
            if (INENT_KEYWORDS.ANALYZE_TREND.includes(token)) scores.ANALYZE_TREND++;
            if (INENT_KEYWORDS.PREDICT_FUTURE.includes(token)) scores.PREDICT_FUTURE++;
        });

        // "If" logic handled by simple scoring max
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore === 0) return 'UNKNOWN';

        if (scores.PREDICT_FUTURE >= maxScore) return 'PREDICT_FUTURE';
        if (scores.ANALYZE_TREND >= maxScore) return 'ANALYZE_TREND';

        return 'QUERY_DATA';
    }

    /**
     * Detect main entity focus
     */
    private static detectEntity(tokens: string[]): EntityType {
        const scores = {
            member: 0,
            treasury: 0,
            attendance: 0,
            meeting: 0
        };

        tokens.forEach(token => {
            if (ENTITY_KEYWORDS.member.includes(token)) scores.member++;
            if (ENTITY_KEYWORDS.treasury.includes(token)) scores.treasury++;
            if (ENTITY_KEYWORDS.attendance.includes(token)) scores.attendance++;
            if (ENTITY_KEYWORDS.meeting.includes(token)) scores.meeting++;
        });

        const maxScore = Math.max(...Object.values(scores));
        if (maxScore === 0) return 'general'; // Fallback

        // Priority resolution if tie
        if (scores.treasury >= maxScore) return 'treasury';
        if (scores.member >= maxScore) return 'member';
        if (scores.attendance >= maxScore) return 'attendance';
        if (scores.meeting >= maxScore) return 'meeting';

        return 'general';
    }

    /**
     * Extract structured parameters (filters, sorting, time)
     */
    private static extractParameters(text: string, tokens: string[]) {
        const filters: Record<string, any> = {};
        let sort: { field: string; direction: 'asc' | 'desc' } | undefined;
        let timeframe: { month?: number; year?: number } | undefined;

        // 1. Time Extraction
        const lowerText = text.toLowerCase();

        // Check relative time keywords
        for (const [key, offset] of Object.entries(TIME_KEYWORDS)) {
            if (lowerText.includes(key)) {
                const date = new Date();
                if (key.includes('bulan')) {
                    date.setMonth(date.getMonth() + offset);
                    timeframe = { month: date.getMonth(), year: date.getFullYear() };
                } else if (key.includes('tahun')) {
                    timeframe = { year: date.getFullYear() };
                }
                break; // Take first match
            }
        }

        // 2. Filter & Sort Mapping
        tokens.forEach(token => {
            // Check direct mapping
            const mapping = FILTER_MAPPINGS[token as keyof typeof FILTER_MAPPINGS];
            if (mapping) {
                if (mapping.operator === 'sort') {
                    // Check if sort is already set, prioritize more specific
                    if (!sort) {
                        sort = { field: mapping.field, direction: (mapping as any).direction as 'asc' | 'desc' };
                    }
                } else if (mapping.operator === 'filter') {
                    filters[mapping.field] = (mapping as any).value;
                } else if (mapping.operator === 'special') {
                    // Handle analytics keywords like "surplus", "boros"
                    filters['_special_condition'] = (mapping as any).value;
                }
            }
        });

        // 3. Special handling for specific phrases
        if (lowerText.includes('paling rajin')) {
            sort = { field: 'attendanceRate', direction: 'desc' };
        } else if (lowerText.includes('paling malas')) {
            sort = { field: 'attendanceRate', direction: 'asc' };
        } else if (lowerText.includes('terbanyak')) {
            sort = { field: 'amount', direction: 'desc' };
        }

        return { filters, sort, timeframe };
    }

    /**
     * Calculate confidence score (0-1)
     */
    private static calculateConfidence(tokens: string[], intent: IntentType, entity: EntityType): number {
        if (intent === 'UNKNOWN') return 0;

        const tokenCount = tokens.length;
        if (tokenCount < 2) return 0.5; // Short queries are ambiguous

        let confidence = 0.7; // Base

        // Boost if entity is clear
        if (entity !== 'general') confidence += 0.2;

        return Math.min(0.99, confidence);
    }
}

export default NLPService;
