/**
 * AI Document Management Service
 * Handles document classification, search, and summarization
 */

import {
    MLEngine,
    tokenize,
    removeStopwords,
    extractKeywords,
    extractKeySentences,
    trainNaiveBayes,
    classifyNaiveBayes,
    buildTFIDFModel,
    getTFIDFVector,
    cosineSimilarity,
    analyzeSentiment
} from './ml-engine';
import type { ReceiptData } from '../ocr-service-extreme';

// ==================== DOCUMENT CATEGORIES ====================

export const DOCUMENT_CATEGORIES = {
    NOTA_KAS: 'nota_kas',
    PROPOSAL_PROKER: 'proposal_proker',
    LAPORAN_KEGIATAN: 'laporan_kegiatan',
    SURAT_KELUAR: 'surat_keluar',
    LAINNYA: 'lainnya'
} as const;

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[keyof typeof DOCUMENT_CATEGORIES];

// Weighted Keyword Dictionary for Meraki-Berbagi offline intelligence
const KEYWORD_DICTIONARY: Record<DocumentCategory, { keywords: string[]; weight: number }[]> = {
    [DOCUMENT_CATEGORIES.NOTA_KAS]: [
        { keywords: ['rp', 'total', 'toko', 'kwitansi', 'nota', 'harga', 'qty', 'jumlah', 'bayar', 'kembali'], weight: 2 },
        { keywords: ['struk', 'kasir', 'belanja', 'pembelian', 'biaya'], weight: 1 }
    ],
    [DOCUMENT_CATEGORIES.PROPOSAL_PROKER]: [
        { keywords: ['latar belakang', 'anggaran', 'tujuan', 'proposal', 'kegiatan', 'rencana', 'manfaat', 'pelaksanaan', 'sasaran'], weight: 2 },
        { keywords: ['program', 'proker', 'panitia', 'pendanaan', 'kerja'], weight: 1 }
    ],
    [DOCUMENT_CATEGORIES.LAPORAN_KEGIATAN]: [
        { keywords: ['realisasi', 'dokumentasi', 'laporan', 'agenda', 'hasil', 'evaluasi', 'dokumentasi', 'capaian', 'selesai'], weight: 2 },
        { keywords: ['monitoring', 'kegiatan', 'sukses', 'hambatan', 'saran'], weight: 1 }
    ],
    [DOCUMENT_CATEGORIES.SURAT_KELUAR]: [
        { keywords: ['nomor', 'perihal', 'yth', 'hormat kami', 'tembusan', 'lampiran', 'undangan', 'permohonan', 'keterangan'], weight: 2 },
        { keywords: ['sehubungan', 'menindaklanjuti', 'organisasi', 'sekretariat'], weight: 1 }
    ],
    [DOCUMENT_CATEGORIES.LAINNYA]: []
};

// ==================== DOCUMENT SERVICE ====================

export interface Document {
    id: string;
    title: string;
    content: string;
    category?: DocumentCategory;
    keywords?: string[];
    summary?: string;
    createdAt: Date;
    entities?: {
        money: number[];
        dates: Date[];
        people: string[];
    };
    priority?: {
        level: 'low' | 'medium' | 'high' | 'critical';
        reason: string;
    };
}

export interface ClassificationResult {
    category: DocumentCategory;
    confidence: number;
    allScores: { category: string; score: number }[];
}

export interface SearchResult {
    document: Document;
    relevanceScore: number;
    matchedKeywords: string[];
}

/**
 * Classify a document into predefined categories using Weighted Keyword Engine
 */
export function classifyDocument(content: string): ClassificationResult {
    const lowerContent = content.toLowerCase();
    const scores = new Map<string, number>();

    // Input Validation
    if (content.length < 10 || /^(.)\1+$/.test(content.replace(/\s/g, ''))) {
        return {
            category: DOCUMENT_CATEGORIES.LAINNYA,
            confidence: 0,
            allScores: []
        };
    }

    // Initialize scores
    Object.values(DOCUMENT_CATEGORIES).forEach(cat => scores.set(cat, 0));

    // Calculate scores based on keyword weights
    for (const [category, categoriesKeywords] of Object.entries(KEYWORD_DICTIONARY)) {
        let categoryScore = 0;
        for (const entry of categoriesKeywords) {
            for (const keyword of entry.keywords) {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = content.match(regex);
                if (matches) {
                    categoryScore += matches.length * entry.weight;
                }
            }
        }
        scores.set(category, categoryScore);
    }

    const allScores = Array.from(scores.entries())
        .map(([category, score]) => ({ category, score }))
        .sort((a, b) => b.score - a.score);

    const topResult = allScores[0];
    const totalScore = allScores.reduce((sum, s) => sum + s.score, 0);
    const confidence = totalScore > 0 ? topResult.score / totalScore : 0;

    return {
        category: topResult.category as DocumentCategory,
        confidence: confidence,
        allScores
    };
}

/**
 * Search documents using TF-IDF similarity
 */
export function searchDocuments(
    query: string,
    documents: Document[],
    topK: number = 10
): SearchResult[] {
    if (documents.length === 0) return [];

    const docsForTFIDF = documents.map(doc => ({
        id: doc.id,
        content: `${doc.title} ${doc.content}`
    }));

    const model = buildTFIDFModel(docsForTFIDF);
    const queryTokens = removeStopwords(tokenize(query));
    const queryVector = getTFIDFVector(queryTokens, model.idf);

    const results: SearchResult[] = [];

    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const docTokens = removeStopwords(tokenize(`${doc.title} ${doc.content}`));
        const docVector = getTFIDFVector(docTokens, model.idf);
        const similarity = cosineSimilarity(queryVector, docVector);

        if (similarity > 0) {
            const matchedKeywords = queryTokens.filter(token =>
                docTokens.includes(token)
            );

            results.push({
                document: doc,
                relevanceScore: similarity,
                matchedKeywords
            });
        }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, topK);
}

/**
 * Generate document summary (Offline-First: extractive)
 */
export async function summarizeDocument(
    content: string,
    maxSentences: number = 3
): Promise<string> {
    // Input Validation
    if (content.length < 10 || /^(.)\1+$/.test(content.replace(/\s/g, ''))) {
        return 'Data tidak valid atau terlalu sedikit untuk dianalisis';
    }

    const keySentences = extractKeySentences(content, maxSentences);
    if (keySentences.length === 0) return 'Tidak dapat merangkum konten.';

    return keySentences.join('. ') + (keySentences.length > 0 ? '.' : '');
}

/**
 * Extract keywords from document
 */
export function getDocumentKeywords(content: string, maxKeywords: number = 10): string[] {
    return extractKeywords(content, maxKeywords);
}

/**
 * Extract entities (Money, Dates, People)
 */
export function extractEntities(text: string): {
    money: number[];
    dates: Date[];
    people: string[];
} {
    const money: number[] = [];
    const dates: Date[] = [];
    const people: string[] = [];

    const moneyRegex = /Rp\s*([\d\.]+)|(\d+)\s*(juta|ribu|milyar)/gi;
    let match;
    while ((match = moneyRegex.exec(text)) !== null) {
        if (match[1]) {
            money.push(parseInt(match[1].replace(/\./g, '')));
        } else if (match[2] && match[3]) {
            let val = parseInt(match[2]);
            const unit = match[3].toLowerCase();
            if (unit === 'juta') val *= 1_000_000;
            if (unit === 'ribu') val *= 1_000;
            if (unit === 'milyar') val *= 1_000_000_000;
            money.push(val);
        }
    }

    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})|(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/gi;
    const months: any = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
        'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };

    while ((match = dateRegex.exec(text)) !== null) {
        try {
            if (match[1]) {
                dates.push(new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1])));
            } else if (match[4]) {
                const monthIdx = months[match[5].toLowerCase()];
                dates.push(new Date(parseInt(match[6]), monthIdx, parseInt(match[4])));
            }
        } catch (e) { }
    }

    const personRegex = /(?:Bapak|Ibu|Sdr\.|Oleh)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    while ((match = personRegex.exec(text)) !== null) {
        people.push(match[1]);
    }

    return { money, dates, people };
}

/**
 * Analyze document urgency/priority
 */
export function analyzeDocumentPriority(
    text: string,
    category: DocumentCategory
): { level: 'low' | 'medium' | 'high' | 'critical'; reason: string } {
    const sentiment = analyzeSentiment(text);
    const lowerText = text.toLowerCase();

    if (lowerText.includes('segera') || lowerText.includes('urgent') || lowerText.includes('mendesak')) {
        return { level: 'high', reason: 'Mengandung kata kunci urgensi (segera/urgent)' };
    }

    if (category === DOCUMENT_CATEGORIES.LAPORAN_KEGIATAN && sentiment.label === 'negative') {
        return { level: 'high', reason: 'Laporan kegiatan memiliki sentimen negatif (masalah terdeteksi)' };
    }

    if (category === DOCUMENT_CATEGORIES.NOTA_KAS && (lowerText.includes('tunggakan') || lowerText.includes('defisit'))) {
        return { level: 'critical', reason: 'Isu keuangan kritis terdeteksi (tunggakan/defisit)' };
    }

    return { level: 'low', reason: 'Dokumen standar/rutin' };
}

/**
 * Process a document with all AI features
 */
export async function processDocument(
    title: string,
    content: string
): Promise<{
    category: DocumentCategory;
    confidence: number;
    keywords: string[];
    summary: string;
    entities: {
        money: number[];
        dates: Date[];
        people: string[];
    };
    priority: {
        level: 'low' | 'medium' | 'high' | 'critical';
        reason: string;
    };
}> {
    const classification = classifyDocument(`${title} ${content}`);
    const keywords = getDocumentKeywords(`${title} ${content}`);
    const summary = await summarizeDocument(content);
    const entities = extractEntities(`${title} ${content}`);
    const priority = analyzeDocumentPriority(`${title} ${content}`, classification.category);

    return {
        category: classification.category,
        confidence: classification.confidence,
        keywords,
        summary,
        entities,
        priority
    };
}

/**
 * AI-powered receipt data extraction for Meraki-Berbagi organizational spending
 * 🔥 EXTREME: Using Tesseract.js with Heuristic Character Replacement
 * Features: Threshold 185, O-to-0 correction, aggressive regex, deep merchant scan
 */
export async function extractReceiptData(imageContent: string): Promise<any> {
    // 🔥 EXTREME: Import the EXTREME OCR service with heuristic correction
    const { extractReceiptWithTesseractExtreme } = await import('../ocr-service-extreme');

    try {
        const result: ReceiptData = await extractReceiptWithTesseractExtreme(imageContent);
        console.log(`📄 Receipt extracted via ${result.ocrProvider?.toUpperCase() || 'UNKNOWN'} (confidence: ${result.confidence})`);
        return result;
    } catch (error) {
        console.error('Receipt extraction failed:', error);
        return {
            amount: 0,
            merchantName: "Toko Tidak Dikenal",
            category: "Lain-lain",
            date: null,
            items: [],
            confidence: "Low",
            confidenceScore: 0,
            isLegit: false,
            aiNotes: "Sistem ekstraksi tidak tersedia. Silakan isi data secara manual.",
            isInvalid: true,
            ocrProvider: 'error'
        };
    }
}

/**
 * Re-train classifier (Ignored in Keyword Engine mode, preserved for API compatibility)
 */
export function retrainClassifier(
    additionalData: { content: string; category: string }[]
): void {
    console.log("Retrain ignored: Keyword Engine is deterministic.");
}

/**
 * Suggest related documents based on content similarity
 */
export function suggestRelatedDocuments(
    targetDocument: Document,
    allDocuments: Document[],
    maxSuggestions: number = 5
): Document[] {
    const others = allDocuments.filter(d => d.id !== targetDocument.id);
    const searchResults = searchDocuments(
        `${targetDocument.title} ${targetDocument.content}`,
        others,
        maxSuggestions
    );

    return searchResults.map(r => r.document);
}

/**
 * Auto-complete search query
 */
export function autoCompleteQuery(
    partialQuery: string,
    documents: Document[]
): string[] {
    const allKeywords = new Set<string>();

    for (const doc of documents) {
        const keywords = doc.keywords || getDocumentKeywords(doc.content);
        keywords.forEach(k => allKeywords.add(k));
    }

    const partial = partialQuery.toLowerCase();
    return Array.from(allKeywords)
        .filter(k => k.startsWith(partial))
        .slice(0, 10);
}

// ==================== EXPORT ====================

export const DocumentService = {
    DOCUMENT_CATEGORIES,
    classifyDocument,
    searchDocuments,
    summarizeDocument,
    getDocumentKeywords,
    processDocument,
    extractEntities,
    analyzeDocumentPriority,
    extractReceiptData,
    retrainClassifier,
    suggestRelatedDocuments,
    autoCompleteQuery
};

export default DocumentService;
