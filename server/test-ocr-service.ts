/**
 * Test file untuk Tesseract.js OCR Service
 * 
 * Cara menggunakan:
 * 1. Siapkan gambar receipt (jpg/png)
 * 2. Convert ke base64 atau gunakan path file
 * 3. Run: tsx server/test-ocr-service.ts
 */

import { extractReceiptWithTesseract } from './services/ocr-service';
import fs from 'fs';
import path from 'path';

async function testOCRService() {
    console.log('🧪 Testing Tesseract OCR Service\n');

    // ==================== OPTION 1: Test dengan file image ====================
    // Uncomment dan ganti path dengan lokasi gambar receipt Anda

    /*
    const imagePath = path.join(__dirname, '../test-images/receipt-sample.jpg');
    
    if (!fs.existsSync(imagePath)) {
        console.error('❌ Image file not found:', imagePath);
        console.log('   Please create a test-images folder and add a receipt image');
        return;
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    */

    // ==================== OPTION 2: Test dengan base64 string ====================
    // Paste base64 string dari gambar receipt Anda di sini

    const base64Image = 'YOUR_BASE64_IMAGE_HERE';

    if (base64Image === 'YOUR_BASE64_IMAGE_HERE') {
        console.log('⚠️  Please provide a base64 image or uncomment Option 1');
        console.log('');
        console.log('📝 How to get base64 image:');
        console.log('   1. Go to: https://www.base64-image.de/');
        console.log('   2. Upload your receipt image');
        console.log('   3. Copy the base64 string');
        console.log('   4. Paste it in this file (line 34)');
        console.log('');
        console.log('Or use Option 1 with a local image file.');
        return;
    }

    // ==================== RUN OCR ====================

    try {
        const result = await extractReceiptWithTesseract(base64Image);

        console.log('\n📋 ===== TEST RESULTS =====\n');
        console.log('Result Object:');
        console.log(JSON.stringify(result, null, 2));

        console.log('\n✅ Test completed successfully!');

        // Validasi hasil
        console.log('\n🔍 Validation:');
        console.log(`   Amount detected: ${result.amount ? '✅' : '❌'}`);
        console.log(`   Merchant detected: ${result.merchantName ? '✅' : '❌'}`);
        console.log(`   Date detected: ${result.date ? '✅' : '❌'}`);
        console.log(`   Category: ${result.category}`);
        console.log(`   Confidence: ${(result.confidenceScore * 100).toFixed(1)}%`);

    } catch (error) {
        console.error('\n❌ Test failed:', error);
    }
}

// Run test
testOCRService().catch(console.error);
