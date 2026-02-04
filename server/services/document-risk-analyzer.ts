import type { Document } from '@shared/schema.ts';

/**
 * Risk keywords that indicate urgency or potential issues
 */
const RISK_KEYWORDS = {
    high: ['urgent', 'mendesak', 'segera', 'darurat', 'kritis', 'emergency', 'critical'],
    medium: ['deadline', 'tenggat', 'penting', 'important', 'prioritas', 'priority'],
    financial: ['budget', 'anggaran', 'biaya', 'cost', 'expense', 'pengeluaran', 'dana', 'fund']
};

/**
 * Regex patterns for extracting financial commitments
 */
const CURRENCY_PATTERNS = [
    /Rp\s*[\d.,]+(?:\s*(?:juta|ribu|miliar|rb|jt|m))?/gi,
    /IDR\s*[\d.,]+/gi,
    /[\d.,]+\s*(?:rupiah|juta|ribu|miliar)/gi
];

export interface DocumentRiskAnalysis {
    documentId: string;
    riskLevel: 'low' | 'medium' | 'high';
    urgencyScore: number; // 0-100
    hasFinancialCommitment: boolean;
    financialAmounts: string[];
    riskKeywords: string[];
    recommendations: string[];
}

/**
 * Extract risk keywords from document content
 */
function extractRiskKeywords(content: string): { keywords: string[]; level: 'low' | 'medium' | 'high' } {
    const lowerContent = content.toLowerCase();
    const foundKeywords: string[] = [];
    let highestLevel: 'low' | 'medium' | 'high' = 'low';

    // Check for high-risk keywords
    RISK_KEYWORDS.high.forEach(keyword => {
        if (lowerContent.includes(keyword)) {
            foundKeywords.push(keyword);
            highestLevel = 'high';
        }
    });

    // Check for medium-risk keywords (only if not already high)
    if (highestLevel === 'low') {
        RISK_KEYWORDS.medium.forEach(keyword => {
            if (lowerContent.includes(keyword)) {
                foundKeywords.push(keyword);
                highestLevel = 'medium';
            }
        });
    }

    // Check for financial keywords
    RISK_KEYWORDS.financial.forEach(keyword => {
        if (lowerContent.includes(keyword)) {
            foundKeywords.push(keyword);
            if (highestLevel === 'low') highestLevel = 'medium';
        }
    });

    return { keywords: foundKeywords, level: highestLevel };
}

/**
 * Extract financial amounts from document content
 */
function extractFinancialAmounts(content: string): string[] {
    const amounts: string[] = [];

    CURRENCY_PATTERNS.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            amounts.push(...matches);
        }
    });

    // Remove duplicates and return
    return [...new Set(amounts)];
}

/**
 * Calculate urgency score based on keywords and financial commitments
 */
function calculateUrgencyScore(
    riskKeywords: string[],
    riskLevel: 'low' | 'medium' | 'high',
    hasFinancialCommitment: boolean
): number {
    let score = 0;

    // Base score from risk level
    if (riskLevel === 'high') score += 60;
    else if (riskLevel === 'medium') score += 30;
    else score += 10;

    // Add points for number of risk keywords (max 20 points)
    score += Math.min(riskKeywords.length * 5, 20);

    // Add points for financial commitment (20 points)
    if (hasFinancialCommitment) score += 20;

    // Cap at 100
    return Math.min(score, 100);
}

/**
 * Generate recommendations based on risk analysis
 */
function generateRecommendations(
    riskLevel: 'low' | 'medium' | 'high',
    hasFinancialCommitment: boolean,
    riskKeywords: string[]
): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'high') {
        recommendations.push('Tindak lanjut segera diperlukan untuk dokumen ini');
        recommendations.push('Jadwalkan review dengan tim terkait dalam 24 jam');
    }

    if (riskLevel === 'medium') {
        recommendations.push('Review dokumen ini dalam waktu dekat');
        recommendations.push('Pastikan semua pihak terkait telah diberitahu');
    }

    if (hasFinancialCommitment) {
        recommendations.push('Verifikasi komitmen finansial dengan bendahara');
        recommendations.push('Pastikan anggaran tersedia sebelum melanjutkan');
    }

    if (riskKeywords.some(k => k.includes('deadline') || k.includes('tenggat'))) {
        recommendations.push('Catat tanggal deadline di kalender organisasi');
    }

    if (recommendations.length === 0) {
        recommendations.push('Dokumen dapat diproses dengan prioritas normal');
    }

    return recommendations;
}

/**
 * Analyze document for risk indicators and financial commitments
 */
export function analyzeDocumentRisk(document: Document): DocumentRiskAnalysis {
    const content = document.content || '';

    // Extract risk keywords
    const { keywords: riskKeywords, level: riskLevel } = extractRiskKeywords(content);

    // Extract financial amounts
    const financialAmounts = extractFinancialAmounts(content);
    const hasFinancialCommitment = financialAmounts.length > 0;

    // Calculate urgency score
    const urgencyScore = calculateUrgencyScore(riskKeywords, riskLevel, hasFinancialCommitment);

    // Generate recommendations
    const recommendations = generateRecommendations(riskLevel, hasFinancialCommitment, riskKeywords);

    return {
        documentId: document.id,
        riskLevel,
        urgencyScore,
        hasFinancialCommitment,
        financialAmounts,
        riskKeywords,
        recommendations
    };
}

/**
 * Calculate overall document risk score for intelligence dashboard
 * Returns a score from 0-100 based on all documents
 */
export function calculateOverallDocumentRisk(documents: Document[]): {
    score: number;
    highRiskCount: number;
    mediumRiskCount: number;
    totalFinancialCommitments: number;
    details: string;
} {
    if (documents.length === 0) {
        return {
            score: 0,
            highRiskCount: 0,
            mediumRiskCount: 0,
            totalFinancialCommitments: 0,
            details: 'Tidak ada dokumen untuk dianalisis'
        };
    }

    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let totalFinancialCommitments = 0;
    let totalUrgencyScore = 0;

    documents.forEach(doc => {
        const analysis = analyzeDocumentRisk(doc);

        if (analysis.riskLevel === 'high') highRiskCount++;
        else if (analysis.riskLevel === 'medium') mediumRiskCount++;

        if (analysis.hasFinancialCommitment) totalFinancialCommitments++;

        totalUrgencyScore += analysis.urgencyScore;
    });

    // Calculate average urgency score
    const averageUrgency = totalUrgencyScore / documents.length;

    // Calculate overall risk score (0-100)
    // Weight: 50% average urgency, 30% high-risk ratio, 20% financial commitments
    const highRiskRatio = (highRiskCount / documents.length) * 100;
    const financialRatio = (totalFinancialCommitments / documents.length) * 100;

    const score = Math.round(
        (averageUrgency * 0.5) +
        (highRiskRatio * 0.3) +
        (financialRatio * 0.2)
    );

    // Generate details
    let details = '';
    if (highRiskCount > 0) {
        details = `${highRiskCount} dokumen berisiko tinggi memerlukan perhatian segera`;
    } else if (mediumRiskCount > 0) {
        details = `${mediumRiskCount} dokumen dengan prioritas sedang`;
    } else {
        details = 'Semua dokumen dalam kondisi normal';
    }

    return {
        score: Math.min(score, 100),
        highRiskCount,
        mediumRiskCount,
        totalFinancialCommitments,
        details
    };
}
