/**
 * 🧪 UNIT TEST for Extreme OCR Service
 * 
 * Test case: Optik Mandiri Receipt (29/09/2015)
 * Challenge: Faded receipt with blue/black text
 * 
 * Expected Results:
 * - Amount: Rp 136.000 (after 15% discount)
 * - Merchant: "Optik Mandiri"
 * - Date: 2015-09-29
 * - Category: Operasional (keyword: lunas)
 * - Confidence: ≥ 60%
 */

import { extractReceiptWithTesseractExtreme } from './ocr-service-extreme';
import { readFileSync } from 'fs';
import { join } from 'path';

// ==================== TEST CONFIGURATION ====================

const TEST_CASES = [
    {
        name: 'Optik Mandiri Receipt (2015)',
        imagePath: './test-images/optik-mandiri-2015.jpg', // Put your test image here
        expected: {
            amount: 136000,
            merchantName: 'Optik Mandiri',
            date: '2015-09-29',
            category: 'Operasional',
            minConfidence: 0.60  // 60%
        }
    }
];

// ==================== TEST HELPERS ====================

function imageToBase64(imagePath: string): string {
    try {
        const imageBuffer = readFileSync(imagePath);
        return imageBuffer.toString('base64');
    } catch (error) {
        throw new Error(`Failed to read image: ${imagePath}`);
    }
}

function validateResult(actual: any, expected: any, testName: string): boolean {
    console.log(`\n🧪 Testing: ${testName}`);
    console.log('─'.repeat(60));

    let passed = true;
    const results: string[] = [];

    // Test Amount
    if (actual.amount === expected.amount) {
        results.push(`✅ Amount: Rp ${actual.amount?.toLocaleString('id-ID')} (PASS)`);
    } else {
        results.push(`❌ Amount: Expected Rp ${expected.amount.toLocaleString('id-ID')}, got ${actual.amount ? `Rp ${actual.amount.toLocaleString('id-ID')}` : 'null'} (FAIL)`);
        passed = false;
    }

    // Test Merchant Name
    if (actual.merchantName === expected.merchantName) {
        results.push(`✅ Merchant: "${actual.merchantName}" (PASS)`);
    } else {
        results.push(`❌ Merchant: Expected "${expected.merchantName}", got "${actual.merchantName || 'null'}" (FAIL)`);
        passed = false;
    }

    // Test Date
    if (actual.date === expected.date) {
        results.push(`✅ Date: ${actual.date} (PASS)`);
    } else {
        results.push(`❌ Date: Expected ${expected.date}, got ${actual.date || 'null'} (FAIL)`);
        passed = false;
    }

    // Test Category
    if (actual.category === expected.category) {
        results.push(`✅ Category: ${actual.category} (PASS)`);
    } else {
        results.push(`❌ Category: Expected ${expected.category}, got ${actual.category} (FAIL)`);
        passed = false;
    }

    // Test Confidence
    if (actual.confidenceScore >= expected.minConfidence) {
        results.push(`✅ Confidence: ${(actual.confidenceScore * 100).toFixed(1)}% (≥ ${expected.minConfidence * 100}%) (PASS)`);
    } else {
        results.push(`❌ Confidence: ${(actual.confidenceScore * 100).toFixed(1)}% (< ${expected.minConfidence * 100}%) (FAIL)`);
        passed = false;
    }

    // Print results
    results.forEach(r => console.log(r));
    console.log('─'.repeat(60));

    if (passed) {
        console.log('🎉 TEST PASSED!\n');
    } else {
        console.log('💥 TEST FAILED!\n');
    }

    return passed;
}

// ==================== MAIN TEST RUNNER ====================

async function runTests() {
    console.log('\n🔥 ===== EXTREME OCR UNIT TESTS =====\n');

    let totalTests = 0;
    let passedTests = 0;

    for (const testCase of TEST_CASES) {
        totalTests++;

        try {
            // Option 1: Load from file
            // const base64Image = imageToBase64(testCase.imagePath);

            // Option 2: Use base64 string directly (recommended for testing)
            // Paste your base64 image here:
            const base64Image = process.env.TEST_IMAGE_BASE64 || '';

            if (!base64Image) {
                console.log(`⚠️  Skipping test "${testCase.name}" - No image provided`);
                console.log(`   Set TEST_IMAGE_BASE64 env var or uncomment Option 1\n`);
                continue;
            }

            // Run OCR
            const result = await extractReceiptWithTesseractExtreme(base64Image);

            // Validate
            const passed = validateResult(result, testCase.expected, testCase.name);

            if (passed) passedTests++;

        } catch (error: any) {
            console.log(`❌ Test "${testCase.name}" crashed: ${error.message}\n`);
        }
    }

    // Summary
    console.log('\n📊 ===== TEST SUMMARY =====');
    console.log(`Total: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${totalTests - passedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    process.exit(totalTests === passedTests ? 0 : 1);
}

// ==================== RUN ====================

console.log('🧪 Extreme OCR Unit Test Suite');
console.log('Testing: Optik Mandiri Receipt (2015)\n');
console.log('💡 How to use:');
console.log('   1. Option A: Set TEST_IMAGE_BASE64 env var');
console.log('      npx tsx --env-file=.env server/services/test-ocr-extreme.ts');
console.log('   2. Option B: Uncomment Option 1 and add image to test-images/');
console.log('   3. Option C: Paste base64 directly in code (line 86)\n');

runTests();
