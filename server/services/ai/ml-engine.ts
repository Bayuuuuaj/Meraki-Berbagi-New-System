/**
 * Machine Learning Engine for Meraki Berbagi
 * Core algorithms for text classification, pattern recognition, and predictive analytics
 */

// ==================== TEXT PROCESSING ====================

/**
 * Tokenize text into words
 */
export function tokenize(text: string): string[] {
    if (!text) return [];
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);
}

/**
 * Remove Indonesian stop words
 */
const INDONESIAN_STOPWORDS = new Set([
    'dan', 'atau', 'yang', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan',
    'ini', 'itu', 'adalah', 'akan', 'juga', 'sudah', 'telah', 'dapat',
    'bisa', 'ada', 'tidak', 'saya', 'kami', 'kita', 'mereka', 'dia',
    'nya', 'oleh', 'dalam', 'sebagai', 'karena', 'jika', 'maka', 'agar',
    'saat', 'ketika', 'setelah', 'sebelum', 'antara', 'hingga', 'sampai',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once'
]);

export function removeStopwords(tokens: string[]): string[] {
    return tokens.filter(token => !INDONESIAN_STOPWORDS.has(token));
}

// ==================== TF-IDF IMPLEMENTATION ====================

interface TFIDFDocument {
    id: string;
    tokens: string[];
    tf: Map<string, number>;
}

interface TFIDFModel {
    documents: TFIDFDocument[];
    idf: Map<string, number>;
    vocabulary: Set<string>;
}

/**
 * Calculate Term Frequency
 */
export function calculateTF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    const total = tokens.length;

    if (total === 0) return tf;

    for (const token of tokens) {
        tf.set(token, (tf.get(token) || 0) + 1);
    }

    // Normalize by document length
    for (const [term, count] of tf) {
        tf.set(term, count / total);
    }

    return tf;
}

/**
 * Calculate Inverse Document Frequency
 */
export function calculateIDF(documents: TFIDFDocument[]): Map<string, number> {
    const idf = new Map<string, number>();
    const N = documents.length;

    // Count documents containing each term
    const docFreq = new Map<string, number>();
    for (const doc of documents) {
        const uniqueTerms = new Set(doc.tokens);
        for (const term of uniqueTerms) {
            docFreq.set(term, (docFreq.get(term) || 0) + 1);
        }
    }

    // Calculate IDF
    for (const [term, df] of docFreq) {
        idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
    }

    return idf;
}

/**
 * Build TF-IDF model from documents
 */
export function buildTFIDFModel(documents: { id: string; content: string }[]): TFIDFModel {
    const processedDocs: TFIDFDocument[] = documents.map(doc => {
        const tokens = removeStopwords(tokenize(doc.content));
        return {
            id: doc.id,
            tokens,
            tf: calculateTF(tokens)
        };
    });

    const idf = calculateIDF(processedDocs);
    const vocabulary = new Set<string>();
    for (const doc of processedDocs) {
        for (const token of doc.tokens) {
            vocabulary.add(token);
        }
    }

    return { documents: processedDocs, idf, vocabulary };
}

/**
 * Calculate TF-IDF vector for a document
 */
export function getTFIDFVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
    const tf = calculateTF(tokens);
    const tfidf = new Map<string, number>();

    for (const [term, tfValue] of tf) {
        const idfValue = idf.get(term) || 0;
        tfidf.set(term, tfValue * idfValue);
    }

    return tfidf;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const [term, value] of vec1) {
        norm1 += value * value;
        if (vec2.has(term)) {
            dotProduct += value * vec2.get(term)!;
        }
    }

    for (const [, value] of vec2) {
        norm2 += value * value;
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// ==================== NAIVE BAYES CLASSIFIER ====================

interface NaiveBayesModel {
    classes: string[];
    classProbabilities: Map<string, number>;
    wordProbabilities: Map<string, Map<string, number>>;
    vocabulary: Set<string>;
}

/**
 * Train Naive Bayes classifier
 */
export function trainNaiveBayes(
    trainingData: { content: string; category: string }[]
): NaiveBayesModel {
    const classes = [...new Set(trainingData.map(d => d.category))];
    const classCounts = new Map<string, number>();
    const classWordCounts = new Map<string, Map<string, number>>();
    const vocabulary = new Set<string>();

    // Initialize
    for (const cls of classes) {
        classCounts.set(cls, 0);
        classWordCounts.set(cls, new Map());
    }

    // Count words per class
    for (const { content, category } of trainingData) {
        classCounts.set(category, (classCounts.get(category) || 0) + 1);
        const tokens = removeStopwords(tokenize(content));

        const wordCounts = classWordCounts.get(category)!;
        for (const token of tokens) {
            vocabulary.add(token);
            wordCounts.set(token, (wordCounts.get(token) || 0) + 1);
        }
    }

    // Calculate probabilities
    const totalDocs = trainingData.length;
    const classProbabilities = new Map<string, number>();
    const wordProbabilities = new Map<string, Map<string, number>>();

    for (const cls of classes) {
        classProbabilities.set(cls, (classCounts.get(cls) || 0) / totalDocs);

        const wordCounts = classWordCounts.get(cls)!;
        const totalWords = Array.from(wordCounts.values()).reduce((a, b) => a + b, 0);
        const vocabSize = vocabulary.size;

        const probs = new Map<string, number>();
        for (const word of vocabulary) {
            // Laplace smoothing
            const count = wordCounts.get(word) || 0;
            probs.set(word, (count + 1) / (totalWords + vocabSize));
        }
        wordProbabilities.set(cls, probs);
    }

    return { classes, classProbabilities, wordProbabilities, vocabulary };
}

/**
 * Classify text using Naive Bayes
 */
export function classifyNaiveBayes(
    text: string,
    model: NaiveBayesModel
): { category: string; confidence: number; scores: Map<string, number> } {
    const tokens = removeStopwords(tokenize(text));
    const scores = new Map<string, number>();

    for (const cls of model.classes) {
        let logProb = Math.log(model.classProbabilities.get(cls) || 0.001);
        const wordProbs = model.wordProbabilities.get(cls)!;

        for (const token of tokens) {
            if (model.vocabulary.has(token)) {
                logProb += Math.log(wordProbs.get(token) || 0.0001);
            }
        }

        scores.set(cls, logProb);
    }

    // Find best class
    let bestClass = model.classes[0];
    let bestScore = scores.get(bestClass) || -Infinity;

    for (const [cls, score] of scores) {
        if (score > bestScore) {
            bestScore = score;
            bestClass = cls;
        }
    }

    // Calculate confidence (softmax-like normalization)
    const maxScore = bestScore;
    let sumExp = 0;
    for (const score of scores.values()) {
        sumExp += Math.exp(score - maxScore);
    }
    const confidence = 1 / sumExp;

    return { category: bestClass, confidence: Math.min(confidence, 0.99), scores };
}

// ==================== SENTIMENT ANALYSIS ====================

const POSITIVE_WORDS = new Set([
    'bagus', 'baik', 'senang', 'sukses', 'hebat', 'luar biasa', 'sempurna',
    'positif', 'setuju', 'mendukung', 'berhasil', 'memuaskan', 'optimal',
    'efektif', 'produktif', 'berkembang', 'meningkat', 'tercapai', 'lancar',
    'good', 'great', 'excellent', 'happy', 'success', 'amazing', 'wonderful',
    'positive', 'agree', 'support', 'achieved', 'satisfied', 'effective',
    'untung', 'profit', 'naik', 'stabil', 'aman'
]);

const NEGATIVE_WORDS = new Set([
    'buruk', 'jelek', 'gagal', 'masalah', 'kesulitan', 'terlambat', 'kurang',
    'negatif', 'tidak setuju', 'menolak', 'sulit', 'lambat', 'tertunda',
    'menurun', 'turun', 'kendala', 'hambatan', 'risiko', 'ancaman',
    'bad', 'poor', 'fail', 'problem', 'difficult', 'late', 'insufficient',
    'negative', 'disagree', 'reject', 'slow', 'delayed', 'decline', 'risk',
    'rugi', 'hilang', 'bahaya', 'curiga', 'aneh'
]);

const NEGATION_WORDS = new Set([
    'tidak', 'bukan', 'kurang', 'jangan', 'tak', 'belum',
    'not', 'no', 'dont', 'doesnt', 'never', 'hardly'
]);

const BOOSTER_WORDS = new Set([
    'sangat', 'sekali', 'banget', 'benar', 'sungguh', 'terlalu', 'paling',
    'very', 'really', 'extremely', 'absolutely', 'highly'
]);

const DIMINISHER_WORDS = new Set([
    'agak', 'sedikit', 'kurang', 'lumayan', 'cukup', 'hampir',
    'bit', 'slightly', 'somewhat', 'barely', 'fairly'
]);

export function analyzeSentiment(text: string): {
    score: number; // -1 to 1 (-1 = negative, 1 = positive)
    label: 'positive' | 'neutral' | 'negative';
    positiveWords: string[];
    negativeWords: string[];
} {
    const allTokens = tokenize(text);
    const positiveWords: string[] = [];
    const negativeWords: string[] = [];

    // Track weights
    let totalScore = 0;
    let tokenCount = 0;

    // Context-sensitive analysis
    for (let i = 0; i < allTokens.length; i++) {
        const token = allTokens[i];

        // 3-token lookback for modifiers
        let isNegated = false;
        let negationWord = "";
        let modifierVal = 1.0; // Default weight
        let modifierWord = "";

        for (let j = 1; j <= 3; j++) {
            if (i - j >= 0) {
                const prev = allTokens[i - j];

                // Check negation
                if (NEGATION_WORDS.has(prev)) {
                    isNegated = true;
                    negationWord = prev;
                }

                // Check boosters (e.g. "sangat bagus")
                if (BOOSTER_WORDS.has(prev)) {
                    modifierVal *= 1.5;
                    modifierWord = prev;
                }

                // Check diminishers (e.g. "agak jelek")
                if (DIMINISHER_WORDS.has(prev)) {
                    modifierVal *= 0.5;
                    modifierWord = prev;
                }
            }
        }

        const scoreVal = 1.0 * modifierVal; // Base score modified by intensifiers

        if (POSITIVE_WORDS.has(token)) {
            tokenCount++;
            if (isNegated) {
                // Flipped polarity
                const phrase = [negationWord, modifierWord, token].filter(Boolean).join(" ");
                negativeWords.push(phrase);
                totalScore -= 1; // Negation usually kills the positivity hard
            } else {
                const phrase = [modifierWord, token].filter(Boolean).join(" ");
                positiveWords.push(phrase);
                totalScore += scoreVal;
            }
        } else if (NEGATIVE_WORDS.has(token)) {
            tokenCount++;
            if (isNegated) {
                // "Tidak buruk"
                const phrase = [negationWord, modifierWord, token].filter(Boolean).join(" ");
                positiveWords.push(phrase);
                totalScore += 0.8;
            } else {
                const phrase = [modifierWord, token].filter(Boolean).join(" ");
                negativeWords.push(phrase);
                totalScore -= scoreVal;
            }
        }
    }

    // Normalize score between -1 and 1
    // If no sentiment tokens found, return 0 (neutral)
    const normalizedScore = tokenCount > 0
        ? Math.max(-1, Math.min(1, totalScore / tokenCount))
        : 0;

    let label: 'positive' | 'neutral' | 'negative' = 'neutral';

    if (normalizedScore > 0.15) label = 'positive';
    else if (normalizedScore < -0.15) label = 'negative';

    return {
        score: parseFloat(normalizedScore.toFixed(2)),
        label,
        positiveWords,
        negativeWords
    };
}

// ==================== ANOMALY DETECTION ====================

export interface DataPoint {
    value: number;
    timestamp: Date;
    id?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Calculate mean and standard deviation
 */
export function calculateStats(values: number[]): { mean: number; std: number } {
    if (values.length === 0) return { mean: 0, std: 0 };

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    return { mean, std };
}

/**
 * Detect anomalies using Z-score method
 */
export function detectAnomalies(
    data: DataPoint[],
    threshold: number = 2.5
): { anomalies: DataPoint[]; stats: { mean: number; std: number } } {
    const values = data.map(d => d.value);
    const stats = calculateStats(values);

    const anomalies = data.filter(point => {
        const zScore = Math.abs((point.value - stats.mean) / (stats.std || 1));
        return zScore > threshold;
    });

    return { anomalies, stats };
}

/**
 * Detect anomalies using IQR (Interquartile Range) method
 * Robust against outliers
 */
export function detectAnomaliesIQR(
    data: DataPoint[]
): { anomalies: DataPoint[]; bounds: { lower: number; upper: number } } {
    const values = data.map(d => d.value).sort((a, b) => a - b);
    const n = values.length;

    if (n < 4) return { anomalies: [], bounds: { lower: 0, upper: 0 } };

    const q1 = values[Math.floor(n * 0.25)];
    const q3 = values[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;

    const anomalies = data.filter(point => point.value < lower || point.value > upper);

    return { anomalies, bounds: { lower, upper } };
}

// ==================== PATTERN RECOGNITION ====================

/**
 * Detect patterns in time series data
 */
export function detectPatterns(data: DataPoint[]): {
    trend: 'increasing' | 'decreasing' | 'stable';
    volatility: 'low' | 'medium' | 'high';
    seasonality: boolean;
} {
    if (data.length < 3) {
        return { trend: 'stable', volatility: 'low', seasonality: false };
    }

    const values = data.map(d => d.value);
    const stats = calculateStats(values);

    // Detect trend using linear regression
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgValue = sumY / n;

    // Normalized slope percentage (change per step relative to mean)
    const slopePercent = (slope * n) / (Math.abs(avgValue) || 1);

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (slopePercent > 0.05) trend = 'increasing'; // More sensitive threshold
    else if (slopePercent < -0.05) trend = 'decreasing';

    // Detect volatility using coefficient of variation
    const cv = stats.std / (Math.abs(stats.mean) || 1);
    let volatility: 'low' | 'medium' | 'high' = 'low';
    if (cv > 0.5) volatility = 'high';
    else if (cv > 0.2) volatility = 'medium';

    // Simple seasonality detection (heuristic)
    // Checks if peaks repeat roughly
    const seasonality = data.length >= 7 && cv > 0.15;

    return { trend, volatility, seasonality };
}

// ==================== CLUSTERING (K-MEANS) ====================

export interface ClusterPoint {
    id: string;
    features: number[]; // e.g. [attendanceRate, transactionCount]
    cluster?: number;
}

/**
 * K-Means Clustering Algorithm
 * useful for user segmentation
 */
export function kMeansClustering(
    points: ClusterPoint[],
    k: number = 3,
    maxIterations: number = 100
): ClusterPoint[] {
    if (points.length < k) return points;

    const dimensions = points[0].features.length;

    // 1. Initialize centroids randomly
    let centroids: number[][] = [];
    const uniquePoints = [...points].sort(() => 0.5 - Math.random());
    for (let i = 0; i < k; i++) {
        centroids.push([...uniquePoints[i].features]);
    }

    let iterations = 0;
    let changed = true;

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;

        // 2. Assign points to nearest centroid
        for (const point of points) {
            let minDist = Infinity;
            let clusterIndex = 0;

            for (let i = 0; i < k; i++) {
                const dist = euclideanDistance(point.features, centroids[i]);
                if (dist < minDist) {
                    minDist = dist;
                    clusterIndex = i;
                }
            }

            if (point.cluster !== clusterIndex) {
                point.cluster = clusterIndex;
                changed = true;
            }
        }

        // 3. Update centroids
        const newCentroids = Array(k).fill(0).map(() => Array(dimensions).fill(0));
        const clusterCounts = Array(k).fill(0);

        for (const point of points) {
            const cluster = point.cluster || 0;
            clusterCounts[cluster]++;
            for (let i = 0; i < dimensions; i++) {
                newCentroids[cluster][i] += point.features[i];
            }
        }

        for (let i = 0; i < k; i++) {
            if (clusterCounts[i] > 0) {
                for (let j = 0; j < dimensions; j++) {
                    centroids[i][j] = newCentroids[i][j] / clusterCounts[i];
                }
            }
        }
    }

    return points;
}

function euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

// ==================== PREDICTIVE ANALYTICS ====================

/**
 * Simple moving average prediction
 */
export function predictMovingAverage(
    data: DataPoint[],
    windowSize: number = 5,
    periodsAhead: number = 3
): number[] {
    if (data.length < 2) {
        return Array(periodsAhead).fill(data.length > 0 ? data[data.length - 1].value : 0);
    }

    const values = data.map(d => d.value);
    const predictions: number[] = [];

    // Use Linear Regression on the window for better extrapolation
    const n = Math.min(values.length, windowSize);
    const recentValues = values.slice(-n);

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += recentValues[i];
        sumXY += i * recentValues[i];
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    for (let i = 0; i < periodsAhead; i++) {
        const nextX = n + i;
        const predictedVal = slope * nextX + intercept;
        predictions.push(Math.round(predictedVal * 100) / 100);
    }

    return predictions;
}

/**
 * Exponential smoothing prediction (Single)
 */
export function predictExponentialSmoothing(
    data: DataPoint[],
    alpha: number = 0.3,
    periodsAhead: number = 3
): number[] {
    if (data.length === 0) return Array(periodsAhead).fill(0);

    const values = data.map(d => d.value);
    let smoothed = values[0];

    for (const value of values) {
        smoothed = alpha * value + (1 - alpha) * smoothed;
    }

    return Array(periodsAhead).fill(Math.round(smoothed * 100) / 100);
}

/**
 * Holt's Linear Trend Method (Double Exponential Smoothing)
 * Better for data with trends
 */
export function predictDoubleExponentialSmoothing(
    data: DataPoint[],
    alpha: number = 0.5, // Level smoothing factor
    beta: number = 0.3,  // Trend smoothing factor
    periodsAhead: number = 3
): number[] {
    if (data.length < 2) return predictExponentialSmoothing(data, alpha, periodsAhead);

    const values = data.map(d => d.value);

    // Initialize level and trend
    let level = values[0];
    let trend = values[1] - values[0];

    // Iterate through data to update level and trend
    for (let i = 1; i < values.length; i++) {
        const prevLevel = level;
        const value = values[i];

        level = alpha * value + (1 - alpha) * (prevLevel + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    // Forecast
    const predictions: number[] = [];
    for (let h = 1; h <= periodsAhead; h++) {
        const forecast = level + h * trend;
        predictions.push(Math.round(forecast * 100) / 100);
    }

    return predictions;
}

// ==================== TEXT SUMMARIZATION ====================

/**
 * Extract key sentences from text using TF-IDF scoring
 */
export function extractKeySentences(
    text: string,
    numSentences: number = 3
): string[] {
    // Split into sentences
    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20);

    if (sentences.length <= numSentences) return sentences;

    // Calculate TF-IDF for each sentence
    const allTokens = removeStopwords(tokenize(text));
    const wordFreq = new Map<string, number>();

    for (const token of allTokens) {
        wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
    }

    // Score sentences
    const scoredSentences = sentences.map(sentence => {
        const tokens = removeStopwords(tokenize(sentence));
        let score = 0;

        for (const token of tokens) {
            score += wordFreq.get(token) || 0;
        }

        // Normalize by sentence length
        score = tokens.length > 0 ? score / tokens.length : 0;

        // Boost first and last sentences
        const index = sentences.indexOf(sentence);
        if (index === 0) score *= 1.2;
        if (index === sentences.length - 1) score *= 1.1;

        return { sentence, score };
    });

    // Sort by score and return top sentences
    scoredSentences.sort((a, b) => b.score - a.score);

    // Return in original order
    const topSentences = scoredSentences.slice(0, numSentences);
    topSentences.sort((a, b) =>
        sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)
    );

    return topSentences.map(s => s.sentence);
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string, numKeywords: number = 10): string[] {
    const tokens = removeStopwords(tokenize(text));
    const wordFreq = new Map<string, number>();

    for (const token of tokens) {
        wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
    }

    // Sort by frequency
    const sorted = Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, numKeywords)
        .map(([word]) => word);

    return sorted;
}

// ==================== TOPIC MODELING ====================

export interface TopicResult {
    topic: string;
    keywords: string[];
    score: number;
}

const TOPIC_TEMPLATES = {
    'Keuangan': ['uang', 'dana', 'biaya', 'kas', 'anggaran', 'subsidi', 'donasi', 'iuran', 'juta', 'rupiah', 'bayar'],
    'Program Kerja': ['proyek', 'kegiatan', 'acara', 'lomba', 'seminar', 'baksos', 'pelatihan', 'program', 'agenda'],
    'Administrasi': ['surat', 'dokumen', 'proposal', 'laporan', 'izin', 'sk', 'tanda tangan', 'arsip'],
    'SDM & Keanggotaan': ['anggota', 'rekrutmen', 'pengurus', 'panitia', 'tim', 'personil', 'ketua', 'divisi']
};

/**
 * Extract topics from text using keyword density analysis
 * Lightweight alternative to LDA
 */
export function extractTopics(text: string): TopicResult[] {
    const tokens = removeStopwords(tokenize(text));
    const tokenSet = new Set(tokens);
    const results: TopicResult[] = [];

    for (const [topic, keywords] of Object.entries(TOPIC_TEMPLATES)) {
        // Find intersection
        const matches = keywords.filter(k => tokenSet.has(k) || tokens.some(t => t.includes(k)));

        // Calculate density score
        // Score = (Matches / Total Topic Keywords) * 10 + Frequency Bonus
        const matchCount = matches.length;

        if (matchCount > 0) {
            // Count total frequency of these keywords in standard tokens
            let freq = 0;
            tokens.forEach(t => {
                if (matches.some(m => t.includes(m))) freq++;
            });

            const score = (matchCount / keywords.length) + (freq / tokens.length);

            results.push({
                topic,
                keywords: matches,
                score
            });
        }
    }

    // Sort by score
    return results.sort((a, b) => b.score - a.score);
}

// ==================== EXPORT UTILITIES ====================

export const MLEngine = {
    // Text Processing
    tokenize,
    removeStopwords,

    // TF-IDF
    buildTFIDFModel,
    getTFIDFVector,
    cosineSimilarity,

    // Classification
    trainNaiveBayes,
    classifyNaiveBayes,

    // Sentiment
    analyzeSentiment,

    // Anomaly Detection
    detectAnomalies,
    detectAnomaliesIQR,

    // Pattern Recognition
    detectPatterns,
    calculateStats,

    // Clustering
    kMeansClustering,

    // Predictions (Forecasting)
    predictMovingAverage,
    predictExponentialSmoothing,
    predictDoubleExponentialSmoothing,

    // Summarization
    extractKeySentences,
    extractKeywords,

    // Topic Modeling
    extractTopics
};

export default MLEngine;
