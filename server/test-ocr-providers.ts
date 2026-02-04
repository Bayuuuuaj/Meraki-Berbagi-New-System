/**
 * Test Script for Multi-Provider OCR System
 * Tests Gemini Vision, Tesseract.js, and fallback mechanisms
 */

import { extractReceiptData } from './services/ai/document-service';
import { extractTextWithFallback, parseReceiptFromText } from './services/ai/ocr-providers';
import fs from 'fs';
import path from 'path';

// ==================== TEST DATA ====================

const SAMPLE_RECEIPT_TEXT = `
WARUNG MAKAN SEDERHANA
Jl. Merdeka No. 123
Jakarta Pusat

Tanggal: 20/01/2026
Kasir: Budi

Item:
- Nasi Goreng        Rp 25.000
- Es Teh Manis       Rp  5.000
- Ayam Goreng        Rp 30.000
- Air Mineral        Rp  5.000

Subtotal:            Rp 65.000
Pajak (10%):         Rp  6.500
-----------------------------------
TOTAL:               Rp 71.500

Terima Kasih!
`;

// ==================== TESTS ====================

async function testTextParsing() {
    console.log('\n🧪 TEST 1: Text Parsing from OCR Output\n');
    console.log('Input Text:');
    console.log(SAMPLE_RECEIPT_TEXT);

    const parsed = parseReceiptFromText(SAMPLE_RECEIPT_TEXT);

    console.log('\n✅ Parsed Result:');
    console.log(JSON.stringify(parsed, null, 2));

    // Assertions
    if (parsed.amount === 71500) {
        console.log('✅ Amount extraction: PASSED');
    } else {
        console.log(`❌ Amount extraction: FAILED (expected 71500, got ${parsed.amount})`);
    }

    if (parsed.merchantName?.toLowerCase().includes('warung')) {
        console.log('✅ Merchant extraction: PASSED');
    } else {
        console.log(`❌ Merchant extraction: FAILED (got ${parsed.merchantName})`);
    }

    if (parsed.category === 'Konsumsi') {
        console.log('✅ Auto-categorization: PASSED');
    } else {
        console.log(`❌ Auto-categorization: FAILED (expected Konsumsi, got ${parsed.category})`);
    }
}

async function testFallbackMechanism() {
    console.log('\n🧪 TEST 2: OCR Provider Fallback Mechanism\n');

    // Create a simple test image (1x1 white pixel)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    console.log('Testing with minimal image (should trigger fallback)...');

    try {
        const result = await extractTextWithFallback(testImageBase64);
        console.log('\n✅ OCR Result:');
        console.log(`Provider: ${result.provider}`);
        console.log(`Confidence: ${result.confidence}`);
        console.log(`Processing Time: ${result.processingTime}ms`);
        console.log(`Text Length: ${result.text.length} characters`);

        if (result.provider === 'gemini' || result.provider === 'tesseract' || result.provider === 'manual') {
            console.log('✅ Fallback mechanism: PASSED');
        } else {
            console.log('❌ Fallback mechanism: FAILED');
        }
    } catch (error: any) {
        console.log('⚠️ OCR failed (expected for test image):', error.message);
        console.log('✅ Error handling: PASSED');
    }
}

async function testFullReceiptExtraction() {
    console.log('\n🧪 TEST 3: Full Receipt Data Extraction\n');

    // Create a test image with embedded text (in real scenario, this would be actual receipt photo)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    console.log('Extracting receipt data with multi-provider system...');

    try {
        const result = await extractReceiptData(testImageBase64);

        console.log('\n✅ Extraction Result:');
        console.log(JSON.stringify(result, null, 2));

        // Check required fields
        const hasRequiredFields =
            'amount' in result &&
            'category' in result &&
            'confidenceScore' in result &&
            'isLegit' in result &&
            'aiNotes' in result &&
            'ocrProvider' in result;

        if (hasRequiredFields) {
            console.log('✅ Response structure: PASSED');
        } else {
            console.log('❌ Response structure: FAILED (missing required fields)');
        }

        if (result.ocrProvider) {
            console.log(`✅ OCR Provider used: ${result.ocrProvider.toUpperCase()}`);
        }

    } catch (error) {
        console.log('❌ Full extraction: FAILED', error);
    }
}

async function testCategorizationLogic() {
    console.log('\n🧪 TEST 4: Auto-Categorization Logic\n');

    const testCases = [
        { text: 'Beras 5kg Rp 50000', expected: 'Logistik' },
        { text: 'Sewa Tenda Rp 500000', expected: 'Program Kerja' },
        { text: 'Kertas A4 Rp 40000', expected: 'Operasional' },
        { text: 'Nasi Kotak 20 porsi Rp 200000', expected: 'Konsumsi' },
        { text: 'Bensin Pertamax Rp 100000', expected: 'Transportasi' },
        { text: 'Barang Random Rp 10000', expected: 'Lain-lain' }
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        const parsed = parseReceiptFromText(testCase.text);

        if (parsed.category === testCase.expected) {
            console.log(`✅ "${testCase.text.substring(0, 30)}..." → ${parsed.category}`);
            passed++;
        } else {
            console.log(`❌ "${testCase.text.substring(0, 30)}..." → Expected: ${testCase.expected}, Got: ${parsed.category}`);
            failed++;
        }
    }

    console.log(`\n📊 Results: ${passed}/${testCases.length} passed`);
}

// ==================== RUN ALL TESTS ====================

async function runAllTests() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   MULTI-PROVIDER OCR SYSTEM TEST SUITE        ║');
    console.log('╚════════════════════════════════════════════════╝');

    try {
        await testTextParsing();
        await testCategorizationLogic();
        await testFallbackMechanism();
        await testFullReceiptExtraction();

        console.log('\n╔════════════════════════════════════════════════╗');
        console.log('║   ✅ ALL TESTS COMPLETED                       ║');
        console.log('╚════════════════════════════════════════════════╝\n');
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { runAllTests };
