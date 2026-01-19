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
import { GeminiService } from './gemini-service';

// ==================== DOCUMENT CATEGORIES ====================

export const DOCUMENT_CATEGORIES = {
    LAPORAN_KEGIATAN: 'laporan_kegiatan',
    PROPOSAL: 'proposal',
    KEUANGAN: 'keuangan',
    NOTULEN: 'notulen',
    SURAT: 'surat',
    DOKUMENTASI: 'dokumentasi',
    LAINNYA: 'lainnya'
} as const;

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[keyof typeof DOCUMENT_CATEGORIES];

// Training data for document classification
const TRAINING_DATA = [
    // Laporan Kegiatan
    { content: 'laporan kegiatan bakti sosial pembagian sembako kepada masyarakat evaluasi hasil program', category: DOCUMENT_CATEGORIES.LAPORAN_KEGIATAN },
    { content: 'hasil kegiatan volunteer relawan mengajar anak panti asuhan sukses lancar', category: DOCUMENT_CATEGORIES.LAPORAN_KEGIATAN },
    { content: 'laporan pelaksanaan program kesehatan pemeriksaan gratis warga peserta hadir', category: DOCUMENT_CATEGORIES.LAPORAN_KEGIATAN },
    { content: 'evaluasi kegiatan bulanan capaian target realisasi program kerja semester', category: DOCUMENT_CATEGORIES.LAPORAN_KEGIATAN },

    // Proposal
    { content: 'proposal program bantuan dana sponsorship pendanaan anggaran biaya', category: DOCUMENT_CATEGORIES.PROPOSAL },
    { content: 'usulan kegiatan latar belakang tujuan manfaat sasaran jadwal pelaksanaan', category: DOCUMENT_CATEGORIES.PROPOSAL },
    { content: 'proposal pengajuan kerjasama partnership mitra donatur sponsor', category: DOCUMENT_CATEGORIES.PROPOSAL },
    { content: 'rencana program kerja timeline milestone deliverable outcome output', category: DOCUMENT_CATEGORIES.PROPOSAL },

    // Keuangan
    { content: 'laporan keuangan kas masuk keluar saldo rekening transfer pembayaran', category: DOCUMENT_CATEGORIES.KEUANGAN },
    { content: 'bukti transaksi kwitansi nota invoice pembayaran pengeluaran pemasukan', category: DOCUMENT_CATEGORIES.KEUANGAN },
    { content: 'anggaran budget biaya pengeluaran pemasukan pendapatan neraca laba rugi', category: DOCUMENT_CATEGORIES.KEUANGAN },
    { content: 'rekapitulasi iuran kas wajib sukarela denda tunggakan pembayaran', category: DOCUMENT_CATEGORIES.KEUANGAN },

    // Notulen
    { content: 'notulen rapat agenda pembahasan keputusan hasil diskusi peserta hadir', category: DOCUMENT_CATEGORIES.NOTULEN },
    { content: 'minutes meeting catatan rapat koordinasi evaluasi tindak lanjut', category: DOCUMENT_CATEGORIES.NOTULEN },
    { content: 'risalah pertemuan poin pembahasan kesepakatan action item deadline', category: DOCUMENT_CATEGORIES.NOTULEN },
    { content: 'berita acara rapat daftar hadir absensi peserta narasumber moderator', category: DOCUMENT_CATEGORIES.NOTULEN },

    // Surat
    { content: 'surat undangan mengundang kehadiran hadir acara kegiatan waktu tempat', category: DOCUMENT_CATEGORIES.SURAT },
    { content: 'surat keterangan menerangkan bahwa bersangkutan anggota aktif organisasi', category: DOCUMENT_CATEGORIES.SURAT },
    { content: 'surat permohonan mohon izin bantuan dukungan kerjasama hormat kami', category: DOCUMENT_CATEGORIES.SURAT },
    { content: 'surat tugas menugaskan kepada melaksanakan berdasarkan demikian dibuat', category: DOCUMENT_CATEGORIES.SURAT },

    // Dokumentasi
    { content: 'foto kegiatan dokumentasi gambar visual album gallery event acara', category: DOCUMENT_CATEGORIES.DOKUMENTASI },
    { content: 'video rekaman dokumentasi liputan media sosial publikasi posting', category: DOCUMENT_CATEGORIES.DOKUMENTASI },
    { content: 'materi presentasi slide deck infografis design poster banner', category: DOCUMENT_CATEGORIES.DOKUMENTASI },
    { content: 'arsip dokumen file backup storage database koleksi archive', category: DOCUMENT_CATEGORIES.DOKUMENTASI },
];

// Pre-trained classifier
let documentClassifier = trainNaiveBayes(TRAINING_DATA);

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
 * Classify a document into predefined categories
 */
export function classifyDocument(content: string): ClassificationResult {
    const result = classifyNaiveBayes(content, documentClassifier);

    const allScores = Array.from(result.scores.entries())
        .map(([category, score]) => ({ category, score }))
        .sort((a, b) => b.score - a.score);

    return {
        category: result.category as DocumentCategory,
        confidence: result.confidence,
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
 * Generate document summary
 */
export async function summarizeDocument(
    content: string,
    maxSentences: number = 3
): Promise<string> {
    if (GeminiService.isAvailable()) {
        const prompt = `Summarize this document in Indonesian in ${maxSentences} sentences, capturing the main intent and key details:\n\n${content.substring(0, 2000)}`;
        const aiSummary = await GeminiService.generateText(prompt);
        if (aiSummary) return aiSummary.trim();
    }

    const keySentences = extractKeySentences(content, maxSentences);
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

    if (category === DOCUMENT_CATEGORIES.KEUANGAN && (lowerText.includes('tunggakan') || lowerText.includes('defisit'))) {
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
 * SPECIALIZED OCR VISION: Strict currency detection and grand total priority.
 */
export async function extractReceiptData(imageContent: string): Promise<any> {
    const prompt = `
      Anda adalah spesialis OCR Vision tingkat tinggi untuk Meraki-Berbagi.
      
      Tujuan: Ekstrak data transaksi dari foto nota/struk belanja.
      
      PERATURAN EKSTRAKSI KETAT:
      1. Mata Uang: Cari simbol "Rp" untuk menentukan 'amount'. Jika ada beberapa angka, pastikan itu adalah nominal mata uang.
      2. Prioritas Angka: Pilih 'Total' atau 'Grand Total'. JANGAN gunakan 'Subtotal' jika ada angka total akhir.
      3. Keamanan Data: Jika teks sangat kabur atau tidak terbaca, JANGAN menebak angka. Berikan nilai NULL dan set confidenceScore di bawah 0.3.
      4. Auto-Categorization: Analisis item belanja untuk menentukan kategori Meraki-Berbagi:
         - "Beras", "Sembako", "Gula" -> "Logistik"
         - "Sewa Tenda", "Sound System", "Sertifikat" -> "Program Kerja"
         - "ATK", "Kertas", "Tinta Printer" -> "Operasional"
         - "Nasi Kotak", "Air Mineral", "Konsumsi Rapat" -> "Konsumsi"
         - "Bensin", "Gojek", "Tol" -> "Transportasi"
         - Jika tidak cocok, masukkan ke "Lain-lain".

      Hasilkan JSON dengan format (JSON ONLY):
      {
        "amount": number | null,
        "category": "Program Kerja" | "Operasional" | "Logistik" | "Transportasi" | "Konsumsi" | "Lain-lain",
        "date": "YYYY-MM-DD" | null,
        "merchantName": "string" | null,
        "items": [{ "name": "string", "price": number }],
        "confidenceScore": number (0.0 - 1.0),
        "isLegit": boolean,
        "aiNotes": "Penjelasan singkat hasil ekstraksi"
      }

      Gunakan Bahasa Indonesia untuk aiNotes.
    `;

    try {
        const result = await GeminiService.generateJSON(prompt);
        return result;
    } catch (error) {
        return {
            amount: null,
            category: "Lain-lain",
            confidenceScore: 0,
            isLegit: false,
            aiNotes: "AI sedang berehat, logik standard organisasi tetap aktif."
        };
    }
}

/**
 * Re-train classifier with new data
 */
export function retrainClassifier(
    additionalData: { content: string; category: string }[]
): void {
    const allData = [...TRAINING_DATA, ...additionalData];
    documentClassifier = trainNaiveBayes(allData);
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
