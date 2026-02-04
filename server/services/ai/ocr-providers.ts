/**
 * Multi-Provider OCR System
 * Provides fallback mechanism for receipt OCR when Gemini fails
 * Providers: Gemini Vision (Primary) → Tesseract.js (Fallback)
 */

import Tesseract from 'tesseract.js';
import { GeminiService } from './gemini-service';

// ==================== TYPES ====================

export interface OCRResult {
    text: string;
    confidence: number;
    provider: 'gemini' | 'tesseract' | 'manual';
    processingTime: number;
}

export interface ReceiptData {
    amount: number | null;
    category: string;
    date: string | null;
    merchantName: string | null;
    items: Array<{ name: string; price: number }>;
    confidenceScore: number;
    isLegit: boolean;
    aiNotes: string;
    ocrProvider?: string;
}

// ==================== TESSERACT OCR PROVIDER ====================

/**
 * Extract text from image using Tesseract.js
 * Fallback OCR when Gemini is unavailable
 */
export async function extractTextWithTesseract(
    imageData: string
): Promise<OCRResult> {
    const startTime = Date.now();

    try {
        // Remove base64 prefix if present
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

        const { data } = await Tesseract.recognize(
            `data:image/png;base64,${base64Data}`,
            'ind', // Indonesian language
            {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log(`Tesseract progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            }
        );

        const processingTime = Date.now() - startTime;

        return {
            text: data.text,
            confidence: data.confidence / 100, // Convert to 0-1 scale
            provider: 'tesseract',
            processingTime
        };
    } catch (error) {
        console.error('Tesseract OCR failed:', error);
        throw new Error('Tesseract OCR extraction failed');
    }
}

// ==================== GEMINI VISION PROVIDER ====================

/**
 * Extract text from image using Gemini Vision
 * Primary OCR provider
 */
export async function extractTextWithGemini(
    imageData: string
): Promise<OCRResult> {
    const startTime = Date.now();

    try {
        if (!GeminiService.isAvailable()) {
            throw new Error('Gemini service not available');
        }

        const prompt = `
Extract ALL text from this receipt/invoice image. 
Return ONLY the raw text content, preserving line breaks and structure.
Do not add any commentary or analysis.
        `.trim();

        const text = await GeminiService.generateText(prompt, imageData);

        if (!text) {
            throw new Error('Gemini returned empty result');
        }

        const processingTime = Date.now() - startTime;

        return {
            text,
            confidence: 0.85, // Gemini typically has high confidence
            provider: 'gemini',
            processingTime
        };
    } catch (error) {
        console.error('Gemini OCR failed:', error);
        throw error;
    }
}

// ==================== SMART OCR ROUTER ====================

/**
 * Intelligently route OCR request to best available provider
 * Priority: Gemini → Tesseract → Manual
 */
export async function extractTextWithFallback(
    imageData: string
): Promise<OCRResult> {
    console.log('🔍 Starting multi-provider OCR...');

    // Try Gemini first (fastest and most accurate)
    try {
        console.log('Attempting Gemini Vision OCR...');
        const result = await extractTextWithGemini(imageData);
        console.log(`✅ Gemini OCR successful (${result.processingTime}ms, confidence: ${result.confidence})`);
        return result;
    } catch (geminiError) {
        console.warn('⚠️ Gemini OCR failed, falling back to Tesseract...', geminiError);
    }

    // Fallback to Tesseract
    try {
        console.log('Attempting Tesseract.js OCR...');
        const result = await extractTextWithTesseract(imageData);
        console.log(`✅ Tesseract OCR successful (${result.processingTime}ms, confidence: ${result.confidence})`);
        return result;
    } catch (tesseractError) {
        console.error('❌ All OCR providers failed', tesseractError);
    }

    // All providers failed - return manual entry mode
    return {
        text: '',
        confidence: 0,
        provider: 'manual',
        processingTime: 0
    };
}

// ==================== TEXT PREPROCESSING ====================

/**
 * Clean OCR text by removing noise and non-ASCII characters
 * Improves parsing accuracy for Tesseract output
 */
export function cleanOCRText(rawText: string): string {
    return rawText
        // Remove common OCR noise characters
        .replace(/[|_~`]/g, ' ')
        // Remove non-ASCII characters except common symbols
        .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Trim
        .trim();
}

// ==================== RECEIPT DATA PARSER ====================

/**
 * Parse OCR text into structured receipt data
 * Uses enhanced regex patterns with booster and confidence scoring
 */
export function parseReceiptFromText(ocrText: string): Partial<ReceiptData> {
    // Clean text first
    const cleanText = cleanOCRText(ocrText);

    const result: Partial<ReceiptData> = {
        amount: null,
        merchantName: null,
        date: null,
        items: [],
        category: 'Lain-lain',
        confidenceScore: 0
    };

    let confidenceFactors = {
        hasAmount: false,
        hasMerchant: false,
        hasDate: false,
        hasCategory: false
    };

    // REGEX BOOSTER: Enhanced total amount detection
    const totalPatterns = [
        /(?:grand\s*)?total\s*(?:bayar)?\s*[:=]?\s*rp\.?\s*([\d.,]+)/i,
        /jumlah\s*(?:akhir)?\s*[:=]?\s*rp\.?\s*([\d.,]+)/i,
        /(?:total|jumlah|rp)\s*[:=]?\s*([\d.,]+)/i, // Booster pattern
        /rp\.?\s*([\d.,]+)\s*$/im // Last Rp amount as fallback
    ];

    // Find all potential amounts and pick the largest (likely Grand Total)
    const allAmounts: number[] = [];
    for (const pattern of totalPatterns) {
        const matches = cleanText.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
        for (const match of matches) {
            const amountStr = match[1].replace(/[.,]/g, '');
            const amount = parseInt(amountStr, 10);
            if (!isNaN(amount) && amount > 0) {
                allAmounts.push(amount);
            }
        }
    }

    if (allAmounts.length > 0) {
        // Pick largest amount (Grand Total priority)
        result.amount = Math.max(...allAmounts);
        confidenceFactors.hasAmount = true;
    }

    // Extract merchant name (usually first line or after "Toko"/"CV"/"PT")
    const merchantPatterns = [
        /^([A-Z][A-Za-z\s&]+)/m, // First capitalized line
        /(?:toko|cv|pt|ud|warung)\s+([A-Za-z\s&]+)/i, // Business prefix
        /^(.{3,30})$/m // First short line (3-30 chars)
    ];

    for (const pattern of merchantPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
            const name = match[1].trim();
            // Validate: not a common receipt word
            if (name.length > 2 && !/(struk|nota|invoice|receipt|tanggal|total)/i.test(name)) {
                result.merchantName = name;
                confidenceFactors.hasMerchant = true;
                break;
            }
        }
    }

    // Extract date with fuzzy matching
    const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, // DD/MM/YYYY or DD-MM-YYYY
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY/MM/DD
        /(\d{1,2})\s+(jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?)\s+(\d{4})/i
    ];

    for (const pattern of datePatterns) {
        const match = cleanText.match(pattern);
        if (match) {
            // Convert to YYYY-MM-DD format
            if (match[0].includes('/') || match[0].includes('-')) {
                const parts = match[0].split(/[\/\-]/);
                if (parts[0].length === 4) {
                    // YYYY-MM-DD
                    result.date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else {
                    // DD-MM-YYYY
                    result.date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            } else {
                result.date = match[0]; // Keep original for month name format
            }
            confidenceFactors.hasDate = true;
            break;
        }
    }

    // Smart Auto-categorization based on keywords
    const lowerText = cleanText.toLowerCase();

    const categoryKeywords = {
        'Logistik': ['beras', 'sembako', 'gula', 'minyak', 'tepung', 'telur', 'sayur'],
        'Program Kerja': ['sewa', 'sound', 'tenda', 'sertifikat', 'banner', 'spanduk', 'dekorasi'],
        'Operasional': ['atk', 'kertas', 'tinta', 'printer', 'pulpen', 'map', 'staples'],
        'Konsumsi': ['nasi', 'minum', 'konsumsi', 'kotak', 'snack', 'kopi', 'teh', 'air mineral'],
        'Transportasi': ['bensin', 'gojek', 'grab', 'tol', 'parkir', 'ojek', 'taxi']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
            result.category = category;
            confidenceFactors.hasCategory = true;
            break;
        }
    }

    // Calculate confidence score (0.0 - 1.0)
    const weights = {
        amount: 0.4,      // Most important
        merchant: 0.25,   // Important
        date: 0.2,        // Moderate
        category: 0.15    // Nice to have
    };

    result.confidenceScore =
        (confidenceFactors.hasAmount ? weights.amount : 0) +
        (confidenceFactors.hasMerchant ? weights.merchant : 0) +
        (confidenceFactors.hasDate ? weights.date : 0) +
        (confidenceFactors.hasCategory ? weights.category : 0);

    return result;
}

// ==================== ENHANCED RECEIPT EXTRACTION ====================

/**
 * Extract receipt data with multi-provider OCR fallback
 * Combines AI vision (Gemini) with traditional OCR (Tesseract)
 */
export async function extractReceiptDataMultiProvider(
    imageContent: string
): Promise<ReceiptData> {
    console.log('\n🔍 Starting Receipt Extraction...');
    console.log(`   Image size: ${(imageContent.length * 0.75 / 1024).toFixed(2)} KB`);

    // Try Gemini Vision with Expert Receipt Auditor prompt
    if (GeminiService.isAvailable()) {
        console.log('📡 Attempting Gemini Vision OCR...');

        try {
            const prompt = `
Anda adalah ahli audit keuangan profesional dengan keahlian OCR Vision.

TUGAS: Ekstrak data dari foto nota/struk belanja dengan SANGAT TELITI.

PRIORITAS EKSTRAKSI:

1. 💰 TOTAL AMOUNT (PALING PENTING):
   - Cari kata kunci: "TOTAL", "GRAND TOTAL", "JUMLAH", "TOTAL BAYAR"
   - Jika ada BEBERAPA angka, pilih yang TERBESAR (biasanya setelah pajak/service)
   - Format: Rp 50.000 atau Rp. 50000 atau 50,000
   - JANGAN ambil Subtotal jika ada Total yang lebih besar

2. 🏪 MERCHANT NAME:
   - Biasanya di BARIS PALING ATAS dengan font besar
   - Atau setelah kata: "Toko", "CV", "PT", "UD", "Warung"
   - Contoh: "WARUNG MAKAN SEDERHANA", "Toko Berkah"

3. 📅 DATE:
   - Format: DD/MM/YYYY, DD-MM-YYYY, atau "20 Januari 2026"
   - Konversi ke: YYYY-MM-DD

4. 📦 ITEMS (jika terlihat):
   - List barang yang dibeli dengan harga
   - Contoh: [{"name": "Nasi Goreng", "price": 25000}]

5. 🏷️ CATEGORY (Auto-detect dari items):
   - "Konsumsi": Nasi, Minum, Snack, Kopi, Teh
   - "Logistik": Beras, Sembako, Gula, Minyak
   - "Transportasi": Bensin, Gojek, Grab, Tol
   - "Operasional": ATK, Kertas, Tinta
   - "Program Kerja": Sewa, Sound, Tenda
   - "Lain-lain": Jika tidak cocok

6. ✅ CONFIDENCE SCORE:
   - 0.9-1.0: Semua data jelas, foto bagus
   - 0.7-0.8: Data lengkap, sedikit blur
   - 0.5-0.6: Hanya amount atau merchant terlihat
   - 0.0-0.4: Foto blur, data tidak jelas (JANGAN TEBAK!)

OUTPUT (JSON ONLY):
{
  "amount": number,
  "merchantName": "string",
  "date": "YYYY-MM-DD",
  "category": "Konsumsi|Logistik|Transportasi|Operasional|Program Kerja|Lain-lain",
  "items": [{"name": "string", "price": number}],
  "confidenceScore": 0.0-1.0,
  "isLegit": boolean,
  "aiNotes": "Penjelasan singkat (Bahasa Indonesia)"
}

Jika foto SANGAT BLUR atau tidak terbaca:
- Set confidenceScore < 0.3
- Set isLegit = false
- Berikan aiNotes yang jelas kenapa gagal
            `.trim();

            console.log('   Sending request to Gemini Vision API...');
            const startTime = Date.now();

            const result = await GeminiService.generateJSON(prompt, imageContent) as any;

            const processingTime = Date.now() - startTime;
            console.log(`   ⏱️  Gemini processing time: ${processingTime}ms`);

            if (!result) {
                console.error('❌ Gemini returned null/empty result');
                throw new Error('Empty Gemini response');
            }

            console.log(`   📊 Gemini confidence: ${result.confidenceScore || 0}`);
            console.log(`   💰 Amount detected: ${result.amount || 'null'}`);
            console.log(`   🏪 Merchant: ${result.merchantName || 'null'}`);

            if (result && typeof result.confidenceScore === 'number' && result.confidenceScore > 0.3) {
                console.log('✅ Gemini Vision extraction SUCCESSFUL!');
                console.log(`   Using Gemini result (confidence: ${result.confidenceScore})\n`);

                return {
                    amount: result.amount || null,
                    merchantName: result.merchantName || null,
                    category: result.category || 'Lain-lain',
                    date: result.date || null,
                    items: result.items || [],
                    confidenceScore: result.confidenceScore,
                    isLegit: result.isLegit !== false,
                    aiNotes: result.aiNotes || 'Data diekstrak dengan Gemini Vision',
                    ocrProvider: 'gemini'
                };
            } else {
                console.warn(`⚠️  Gemini confidence too low: ${result.confidenceScore || 0}`);
                console.warn('   Falling back to Tesseract OCR...');
            }
        } catch (geminiError: any) {
            console.error('❌ Gemini Vision FAILED:');
            console.error(`   Error: ${geminiError.message || geminiError}`);
            if (geminiError.stack) {
                console.error(`   Stack: ${geminiError.stack.split('\n')[0]}`);
            }
            console.warn('   🔄 Falling back to Tesseract OCR...\n');
        }
    } else {
        console.error('❌ Gemini API Key not available!');
        console.error('   Check .env file for GOOGLE_GENAI_API_KEY');
        console.warn('   🔄 Falling back to Tesseract OCR...\n');
    }

    // Fallback: Use traditional OCR + parsing
    try {
        const ocrResult = await extractTextWithFallback(imageContent);

        if (ocrResult.confidence < 0.3) {
            // OCR confidence too low - request manual entry
            return {
                amount: null,
                merchantName: null,
                category: 'Lain-lain',
                date: null,
                items: [],
                confidenceScore: 0,
                isLegit: false,
                aiNotes: `Kualitas gambar terlalu rendah untuk OCR otomatis (${ocrResult.provider}). Silakan isi data secara manual.`,
                ocrProvider: ocrResult.provider
            };
        }

        // Parse OCR text into structured data
        const parsedData = parseReceiptFromText(ocrResult.text);

        return {
            amount: parsedData.amount || null,
            merchantName: parsedData.merchantName || null,
            category: parsedData.category || 'Lain-lain',
            date: parsedData.date || null,
            items: parsedData.items || [],
            confidenceScore: ocrResult.confidence * 0.7, // Reduce confidence for non-AI parsing
            isLegit: ocrResult.confidence > 0.5,
            aiNotes: `Data diekstrak menggunakan ${ocrResult.provider.toUpperCase()} OCR. Confidence: ${Math.round(ocrResult.confidence * 100)}%. Mohon verifikasi manual.`,
            ocrProvider: ocrResult.provider
        };
    } catch (error) {
        console.error('All extraction methods failed:', error);

        // Ultimate fallback - manual entry
        return {
            amount: null,
            merchantName: null,
            category: 'Lain-lain',
            date: null,
            items: [],
            confidenceScore: 0,
            isLegit: false,
            aiNotes: 'Sistem ekstraksi tidak tersedia. Silakan isi data secara manual.',
            ocrProvider: 'manual'
        };
    }
}

// ==================== EXPORTS ====================

export const OCRProviders = {
    extractTextWithGemini,
    extractTextWithTesseract,
    extractTextWithFallback,
    parseReceiptFromText,
    extractReceiptDataMultiProvider
};

export default OCRProviders;
