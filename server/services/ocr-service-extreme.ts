/**
 * 🔥 EXTREME OCR SERVICE - FINAL VERSION
 * 
 * Smart Filtering & Last Amount Logic (No Hard Mapping)
 * 
 * Philosophy:
 * - Let OCR read what it reads (transparency)
 * - Use smart filtering to clean noise
 * - Last amount = Grand Total (footer logic)
 * - Human-in-the-Loop for final verification
 * 
 * @author Bayu (Meraki-Berbagi) - Final Edition
 */

import Tesseract, { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';

// ✅ MEMORY FIX: Disable sharp cache for Render Free Tier
sharp.cache(false);

const CACHE_PATH = path.join(process.cwd(), 'server', 'cache', 'tesseract');

// ==================== TYPES ====================

export interface OCRResult {
    text: string;
    confidence: number;
    provider: 'tesseract-extreme';
    processingTime: number;
}

export interface ReceiptData {
    amount: number;
    merchantName: string;
    date: string | null;
    category: string;
    confidence: 'High' | 'Low';
    confidenceScore: number; // For frontend compatibility
    isInvalid: boolean;
    ocrProvider: 'tesseract-extreme';
}

// ==================== IMAGE PRE-PROCESSING ====================

async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
        console.log('🔥 [EXTREME] Pre-processing image with Sharp...');

        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        console.log(`   Original size: ${metadata.width}x${metadata.height}`);

        let processedImage = image
            .grayscale()
            .normalize()
            .sharpen();

        if (metadata.width && metadata.width > 1200) {
            processedImage = processedImage.resize(1200, null, {
                fit: 'inside',
                withoutEnlargement: true
            });
            console.log('   Resized to max 1200px width');
        }

        // GOLD CONFIG: Threshold 185
        const processed = await processedImage
            .threshold(185)
            .png()
            .toBuffer();

        console.log('   ✅ Pre-processing complete (threshold: 185 - GOLD CONFIG 🏆)');
        return processed;

    } catch (error) {
        console.error('❌ Image pre-processing failed:', error);
        return imageBuffer;
    }
}

// ==================== TESSERACT OCR ====================

async function extractTextWithTesseract(imageData: string): Promise<OCRResult> {
    const startTime = Date.now();

    try {
        console.log('🔥 [EXTREME] Starting Tesseract OCR...');

        const base64Data = imageData.includes('base64,')
            ? imageData.split('base64,')[1]
            : imageData;

        const imageBuffer = Buffer.from(base64Data, 'base64');
        const processedBuffer = await preprocessImage(imageBuffer);

        // Convert buffer kembali ke base64 untuk Tesseract
        const processedBase64 = processedBuffer.toString('base64');

        console.log('   Running Tesseract recognition (Worker Mode)...');

        // ✅ WORKER CONFIG: Use createWorker for precise control
        const worker = await createWorker('ind+eng', 1, {
            langPath: CACHE_PATH,
            cacheMethod: 'readOnly',
            gzip: false,
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    const progress = Math.round(m.progress * 100);
                    if (progress % 25 === 0) console.log(`   Progress: ${progress}%`);
                }
            }
        });

        const { data } = await worker.recognize(`data:image/png;base64,${processedBase64}`);

        // Clean up worker to free memory
        await worker.terminate();

        const processingTime = Date.now() - startTime;

        console.log(`   ✅ OCR complete in ${processingTime}ms`);
        console.log(`   Confidence: ${data.confidence.toFixed(2)}%`);
        console.log(`   Text length: ${data.text.length} characters`);

        return {
            text: data.text,
            confidence: data.confidence / 100,
            provider: 'tesseract-extreme',
            processingTime
        };

    } catch (error) {
        console.error('❌ Tesseract OCR failed:', error);
        throw new Error('Tesseract OCR extraction failed');
    }
}

/**
 * Step-by-Step Heuristic Entity Extraction (Extreme Version)
 */
function parseReceiptExtreme(rawText: string): Omit<ReceiptData, 'ocrProvider'> {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // 1. Cleaning & Correction
    const cleanLines = lines.map(line =>
        line.toLowerCase()
            .replace(/[^\x20-\x7E]/g, '')
            .replace(/o/g, '0')
            .replace(/s/g, '5')
            .replace(/[il\|]/g, '1')
    );

    // 2. Merchant Detection
    let merchant = "Toko Tidak Dikenal";
    const commonNotaKeywords = /nota|kwitansi|toko|invoice|jl\.|jalan|no\.|tgl|tanggal|alamat/i;

    for (let i = 0; i < Math.min(3, lines.length); i++) {
        if (cleanLines[i].length > 3 && !commonNotaKeywords.test(cleanLines[i])) {
            merchant = lines[i];
            break;
        }
    }

    // 3. Amount Extraction (Footer Priority)
    let amount = 0;
    const amountTrigger = /(?:total|rp|jumlah|bayar|netto)[\s\w]*[:=]?[\s]*([\d.,]+)/i;

    for (let i = cleanLines.length - 1; i >= 0; i--) {
        const match = cleanLines[i].match(amountTrigger);
        if (match) {
            const num = parseInt(match[1].replace(/[.,]/g, ''), 10);
            if (!isNaN(num) && num >= 100) {
                amount = num;
                break;
            }
        }
    }

    // 4. Validation
    const isInvalid = amount === 0;
    const confidence = (merchant !== "Toko Tidak Dikenal" && amount > 0) ? "High" : "Low";

    // 5. Date & Category (Heuristic)
    const date = detectDate(rawText);
    const category = detectCategory(rawText);

    return {
        merchantName: merchant,
        amount,
        date,
        category,
        confidence,
        confidenceScore: confidence === "High" ? 0.95 : 0.4,
        isInvalid
    };
}

// ==================== DATE DETECTION ====================

function detectDate(ocrText: string): string | null {
    console.log('   📅 Detecting date...');

    const cleanText = ocrText.replace(/\s+/g, ' ').trim();

    const datePatterns = [
        {
            regex: /(\d{1,2})[\\/\-\.](\d{1,2})[\\/\-\.](\d{2,4})/,
            format: 'DD/MM/YYYY'
        },
        {
            regex: /(\d{4})[\\/\-](\d{1,2})[\\/\-](\d{1,2})/,
            format: 'YYYY/MM/DD'
        },
        {
            regex: /(\d{1,2})\s+(jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?)\s+(\d{4})/i,
            format: 'DD Month YYYY'
        }
    ];

    const monthMap: { [key: string]: string } = {
        'jan': '01', 'januari': '01', 'feb': '02', 'februari': '02',
        'mar': '03', 'maret': '03', 'apr': '04', 'april': '04',
        'mei': '05', 'jun': '06', 'juni': '06', 'jul': '07', 'juli': '07',
        'agu': '08', 'agustus': '08', 'sep': '09', 'september': '09',
        'okt': '10', 'oktober': '10', 'nov': '11', 'november': '11',
        'des': '12', 'desember': '12'
    };

    for (const { regex, format } of datePatterns) {
        const match = cleanText.match(regex);
        if (match) {
            try {
                let result = '';
                if (format === 'DD/MM/YYYY') {
                    const day = match[1].padStart(2, '0');
                    const month = match[2].padStart(2, '0');
                    let year = match[3];
                    if (year.length === 2) year = `20${year}`;
                    result = `${year}-${month}-${day}`;
                } else if (format === 'YYYY/MM/DD') {
                    const year = match[1];
                    const month = match[2].padStart(2, '0');
                    const day = match[3].padStart(2, '0');
                    result = `${year}-${month}-${day}`;
                } else if (format === 'DD Month YYYY') {
                    const day = match[1].padStart(2, '0');
                    const monthName = match[2].toLowerCase();
                    const month = monthMap[monthName] || '01';
                    const year = match[3];
                    result = `${year}-${month}-${day}`;
                }

                console.log(`   ✅ Date found: ${result}`);
                return result;
            } catch (error) {
                console.log('   ⚠️  Date parsing error');
            }
        }
    }

    console.log('   ⚠️  No date detected');
    return null;
}

// ==================== CATEGORY DETECTION ====================

function detectCategory(ocrText: string): string {
    console.log('   🏷️  Auto-categorizing...');

    const lowerText = ocrText.toLowerCase();

    const categoryKeywords: { [key: string]: string[] } = {
        'Logistik': ['beras', 'sembako', 'gula', 'minyak', 'tepung', 'telur', 'sayur', 'buah'],
        'Program Kerja': ['sewa', 'sound', 'tenda', 'sertifikat', 'banner', 'spanduk', 'dekorasi', 'panggung'],
        'Operasional': ['atk', 'kertas', 'tinta', 'printer', 'pulpen', 'map', 'staples', 'fotocopy', 'tunai', 'cash', 'bayar', 'pembayaran', 'lunas'],
        'Konsumsi': ['nasi', 'minum', 'konsumsi', 'kotak', 'snack', 'kopi', 'teh', 'air mineral', 'makan', 'catering'],
        'Transportasi': ['bensin', 'gojek', 'grab', 'tol', 'parkir', 'ojek', 'taxi', 'uber', 'travel']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        const foundKeyword = keywords.find(keyword => lowerText.includes(keyword));
        if (foundKeyword) {
            console.log(`   ✅ Category: ${category} (keyword: "${foundKeyword}")`);
            return category;
        }
    }

    console.log('   ℹ️  Category: Lain-lain (default)');
    return 'Lain-lain';
}

// ==================== MAIN EXPORT FUNCTION ====================

export async function extractReceiptWithTesseractExtreme(
    imageContent: string
): Promise<ReceiptData> {
    console.log('\n🔥 ===== EXTREME OCR SERVICE (FINAL) =====');
    console.log(`📦 Image size: ${(imageContent.length * 0.75 / 1024).toFixed(2)} KB`);

    try {
        // Step 1: OCR with Sharp pre-processing
        const ocrResult = await extractTextWithTesseract(imageContent);

        // 🔥 DEBUG: Show raw text
        console.log('\n📝 RAW OCR TEXT (first 500 chars):');
        console.log('─'.repeat(60));
        console.log(ocrResult.text.substring(0, 500));
        console.log('─'.repeat(60) + '\n');

        if (ocrResult.confidence < 0.3) {
            console.warn('⚠️  OCR confidence too low');
            return {
                amount: 0,
                merchantName: "Toko Tidak Dikenal",
                date: null,
                category: 'Lain-lain',
                confidence: 'Low',
                confidenceScore: 0,
                isInvalid: true,
                ocrProvider: 'tesseract-extreme'
            };
        }

        // Step 2: Extract data with heuristic logic
        const parsed = parseReceiptExtreme(ocrResult.text);

        const result: ReceiptData = {
            ...parsed,
            ocrProvider: 'tesseract-extreme'
        };

        return result;

    } catch (error: any) {
        console.error('❌ EXTREME OCR Error:', error.message || error);

        return {
            amount: 0,
            merchantName: "Toko Tidak Dikenal",
            date: null,
            category: 'Lain-lain',
            confidence: "Low",
            confidenceScore: 0,
            isInvalid: true,
            ocrProvider: 'tesseract-extreme'
        };
    }
}

export default {
    extractReceiptWithTesseractExtreme
};
