# 🧪 Extreme OCR Testing Guide

## Quick Test Commands

### Option 1: Using Environment Variable (Recommended)
```bash
# Add to .env file:
TEST_IMAGE_BASE64=<your_base64_string_here>

# Run test:
npx tsx --env-file=.env server/services/test-ocr-extreme.ts
```

### Option 2: Using Test Image File
```bash
# 1. Create test-images folder
mkdir server/services/test-images

# 2. Copy your receipt image
# Place: server/services/test-images/optik-mandiri-2015.jpg

# 3. Uncomment Option 1 in test file (line 84)

# 4. Run test:
npx tsx server/services/test-ocr-extreme.ts
```

### Option 3: Direct Base64 in Code
```typescript
// Edit line 86 in test-ocr-extreme.ts:
const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
```

---

## Expected Test Results

### Optik Mandiri Receipt (2015)

**Input:**
- Faded receipt from 2015
- Blue/black text
- Amount after 15% discount

**Expected Output:**
```json
{
  "amount": 136000,
  "merchantName": "Optik Mandiri",
  "date": "2015-09-29",
  "category": "Operasional",
  "confidenceScore": 0.60,  // ≥ 60%
  "ocrProvider": "tesseract-extreme"
}
```

**Test Validation:**
- ✅ Amount: Rp 136.000 (exact match)
- ✅ Merchant: "Optik Mandiri" (exact match)
- ✅ Date: 2015-09-29 (ISO format)
- ✅ Category: Operasional (keyword: lunas)
- ✅ Confidence: ≥ 60%

---

## Adding More Test Cases

Edit `test-ocr-extreme.ts` line 18:

```typescript
const TEST_CASES = [
    {
        name: 'Optik Mandiri Receipt (2015)',
        imagePath: './test-images/optik-mandiri-2015.jpg',
        expected: {
            amount: 136000,
            merchantName: 'Optik Mandiri',
            date: '2015-09-29',
            category: 'Operasional',
            minConfidence: 0.60
        }
    },
    // Add more test cases here:
    {
        name: 'Warung Makan Receipt',
        imagePath: './test-images/warung-makan.jpg',
        expected: {
            amount: 50000,
            merchantName: 'Warung Sederhana',
            date: '2026-01-20',
            category: 'Konsumsi',
            minConfidence: 0.70
        }
    }
];
```

---

## Continuous Testing Workflow

### 1. Before Code Changes
```bash
# Run baseline test
npx tsx server/services/test-ocr-extreme.ts
# Expected: All tests pass ✅
```

### 2. After Code Changes
```bash
# Run regression test
npx tsx server/services/test-ocr-extreme.ts
# Verify: No regressions ✅
```

### 3. CI/CD Integration
```json
// package.json
{
  "scripts": {
    "test:ocr": "tsx server/services/test-ocr-extreme.ts",
    "test": "npm run test:ocr && npm run test:other"
  }
}
```

---

## Debugging Failed Tests

### If Amount is Wrong:
1. Check heuristic correction (o→0, l→1)
2. Verify regex patterns in `detectAmounts()`
3. Check min/max validation (100 - 100M)

### If Merchant is Wrong:
1. Check noise filtering in `detectMerchant()`
2. Verify 7-line search range
3. Add more noise keywords if needed

### If Date is Wrong:
1. Check date regex patterns
2. Verify 2-digit year handling
3. Test with different date formats

### If Confidence is Low:
1. Adjust threshold (currently 185)
2. Check Sharp pre-processing
3. Verify weighted scoring (40/25/20/15)

---

## Pro Tips

### Get Base64 from Browser
```javascript
// In browser console:
const img = document.querySelector('img');
const canvas = document.createElement('canvas');
canvas.width = img.width;
canvas.height = img.height;
canvas.getContext('2d').drawImage(img, 0, 0);
const base64 = canvas.toDataURL('image/jpeg');
console.log(base64);
```

### Convert Image File to Base64
```bash
# Linux/Mac:
base64 -i optik-mandiri.jpg

# Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("optik-mandiri.jpg"))
```

---

## Test Output Example

```
🔥 ===== EXTREME OCR UNIT TESTS =====

🧪 Testing: Optik Mandiri Receipt (2015)
────────────────────────────────────────────────────────────
✅ Amount: Rp 136.000 (PASS)
✅ Merchant: "Optik Mandiri" (PASS)
✅ Date: 2015-09-29 (PASS)
✅ Category: Operasional (PASS)
✅ Confidence: 65.0% (≥ 60.0%) (PASS)
────────────────────────────────────────────────────────────
🎉 TEST PASSED!

📊 ===== TEST SUMMARY =====
Total: 1
Passed: 1 ✅
Failed: 0 ❌
Success Rate: 100.0%
```

---

## Next Steps

1. ✅ Run initial test with Optik Mandiri receipt
2. ✅ Verify all fields pass
3. ✅ Add more test cases (different receipt types)
4. ✅ Integrate into CI/CD pipeline
5. ✅ Set up automated regression testing

**Happy Testing! 🚀**
