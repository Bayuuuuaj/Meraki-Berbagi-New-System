/**
 * SAFE INTEGRATION GUIDE: Tesseract OCR as Primary Provider
 * 
 * Cara mengintegrasikan ocr-service.ts tanpa menghapus Gemini:
 * 1. Gunakan Tesseract sebagai Primary Provider
 * 2. Jika confidenceScore < 0.4, request manual entry
 * 3. Gemini tetap tersedia sebagai backup (optional)
 */

import { extractReceiptWithTesseract } from '../ocr-service';
import { extractReceiptDataMultiProvider } from './ocr-providers';

/**
 * RECOMMENDED: Use Tesseract as primary, fallback to manual if low confidence
 * 
 * @param imageContent - Base64 image string
 * @returns Receipt data with confidence score
 */
export async function extractReceiptDataSafe(imageContent: string): Promise<any> {
    console.log('\n🔒 ===== SAFE OCR INTEGRATION =====');
    console.log('   Strategy: Tesseract Primary → Manual Fallback');

    try {
        // Step 1: Try Tesseract OCR (local, no API needed)
        const result = await extractReceiptWithTesseract(imageContent);

        // Step 2: Check confidence score
        if (result.confidenceScore >= 0.4) {
            // ✅ Good confidence - use Tesseract result
            console.log(`✅ Tesseract confidence OK (${(result.confidenceScore * 100).toFixed(1)}%)`);
            console.log('   Using Tesseract result\n');
            return result;
        } else {
            // ⚠️ Low confidence - request manual entry
            console.warn(`⚠️  Tesseract confidence too low (${(result.confidenceScore * 100).toFixed(1)}%)`);
            console.warn('   Requesting manual entry\n');

            return {
                amount: null,
                merchantName: null,
                date: null,
                category: 'Lain-lain',
                confidenceScore: result.confidenceScore,
                ocrProvider: 'tesseract',
                aiNotes: `OCR confidence rendah (${(result.confidenceScore * 100).toFixed(1)}%). Silakan isi data secara manual untuk akurasi terbaik.`
            };
        }

    } catch (error: any) {
        console.error('❌ Tesseract OCR failed:', error.message);

        // Ultimate fallback: manual entry
        return {
            amount: null,
            merchantName: null,
            date: null,
            category: 'Lain-lain',
            confidenceScore: 0,
            ocrProvider: 'manual',
            aiNotes: 'Sistem OCR tidak tersedia. Silakan isi data secara manual.'
        };
    }
}

/**
 * ALTERNATIVE: Use multi-provider with Gemini as backup
 * Only use this if you want to keep Gemini as fallback option
 */
export async function extractReceiptDataWithGeminiBackup(imageContent: string): Promise<any> {
    console.log('\n🔄 ===== MULTI-PROVIDER OCR =====');
    console.log('   Strategy: Tesseract → Gemini → Manual');

    try {
        // Try Tesseract first
        const tesseractResult = await extractReceiptWithTesseract(imageContent);

        if (tesseractResult.confidenceScore >= 0.4) {
            console.log('✅ Using Tesseract result');
            return tesseractResult;
        }

        // Fallback to Gemini if available
        console.log('⚠️  Tesseract low confidence, trying Gemini...');
        const geminiResult = await extractReceiptDataMultiProvider(imageContent);

        if (geminiResult.confidenceScore >= 0.4) {
            console.log('✅ Using Gemini result');
            return geminiResult;
        }

        // Both failed - manual entry
        console.warn('⚠️  All OCR providers low confidence, requesting manual entry');
        return {
            amount: null,
            merchantName: null,
            date: null,
            category: 'Lain-lain',
            confidenceScore: 0,
            ocrProvider: 'manual',
            aiNotes: 'Kualitas gambar terlalu rendah untuk OCR otomatis. Silakan isi data secara manual.'
        };

    } catch (error: any) {
        console.error('❌ All OCR methods failed:', error.message);
        return {
            amount: null,
            merchantName: null,
            date: null,
            category: 'Lain-lain',
            confidenceScore: 0,
            ocrProvider: 'error',
            aiNotes: 'Sistem ekstraksi tidak tersedia. Silakan isi data secara manual.'
        };
    }
}

/**
 * HOW TO USE IN document-service.ts:
 * 
 * Replace the extractReceiptData function with:
 * 
 * export async function extractReceiptData(imageContent: string): Promise<any> {
 *     const { extractReceiptDataSafe } = await import('./ocr-integration');
 *     return extractReceiptDataSafe(imageContent);
 * }
 * 
 * Or if you want Gemini backup:
 * 
 * export async function extractReceiptData(imageContent: string): Promise<any> {
 *     const { extractReceiptDataWithGeminiBackup } = await import('./ocr-integration');
 *     return extractReceiptDataWithGeminiBackup(imageContent);
 * }
 */

export default {
    extractReceiptDataSafe,
    extractReceiptDataWithGeminiBackup
};
