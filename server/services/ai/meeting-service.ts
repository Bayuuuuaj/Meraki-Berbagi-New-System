/**
 * AI Meeting Management Service
 * Handles meeting scheduling, summarization, and sentiment analysis
 */

import {
    analyzeSentiment,
    extractKeySentences,
    extractKeywords,
    tokenize,
    removeStopwords
} from './ml-engine';

// ==================== TYPES ====================

export interface Participant {
    id: string;
    name: string;
    email?: string;
    availability?: TimeSlot[];
}

export interface TimeSlot {
    date: string; // YYYY-MM-DD format
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
}

export interface Meeting {
    id: string;
    title: string;
    description?: string;
    scheduledAt: Date;
    duration: number; // in minutes
    participants: string[]; // participant IDs
    notes?: string;
    summary?: string;
    actionItems?: ActionItem[];
    sentiment?: SentimentResult;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    decisions?: string[];
    nextAgenda?: string[];
}

export interface ActionItem {
    id: string;
    description: string;
    assignee?: string;
    deadline?: Date;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed';
}

export interface SentimentResult {
    overallScore: number;
    label: 'positive' | 'neutral' | 'negative';
    positiveAspects: string[];
    negativeAspects: string[];
    suggestions: string[];
}

export interface MeetingTimeSuggestion {
    date: string;
    startTime: string;
    endTime: string;
    availableParticipants: number;
    totalParticipants: number;
    score: number;
}

// ==================== MEETING SCHEDULING ====================

/**
 * Suggest optimal meeting times based on participant availability
 */
export function suggestMeetingTimes(
    participants: Participant[],
    duration: number = 60, // minutes
    preferredDays: number = 7,
    workHoursStart: number = 9,
    workHoursEnd: number = 17
): MeetingTimeSuggestion[] {
    const suggestions: MeetingTimeSuggestion[] = [];
    const today = new Date();

    // Generate time slots for the next N days
    for (let day = 0; day < preferredDays; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() + day);

        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dateStr = date.toISOString().split('T')[0];

        // Generate hourly slots during work hours
        for (let hour = workHoursStart; hour < workHoursEnd; hour++) {
            const startTime = `${hour.toString().padStart(2, '0')}:00`;
            const endHour = hour + Math.ceil(duration / 60);

            if (endHour > workHoursEnd) continue;

            const endTime = `${endHour.toString().padStart(2, '0')}:00`;

            // Check participant availability
            let availableCount = 0;
            for (const participant of participants) {
                if (!participant.availability || participant.availability.length === 0) {
                    // Assume available if no availability info
                    availableCount++;
                } else {
                    const isAvailable = participant.availability.some(slot =>
                        slot.date === dateStr &&
                        slot.startTime <= startTime &&
                        slot.endTime >= endTime
                    );
                    if (isAvailable) availableCount++;
                }
            }

            // Calculate score based on availability and time preferences
            const availabilityRatio = availableCount / participants.length;
            const timePreference = getTimePreferenceScore(hour);
            const dayPreference = getDayPreferenceScore(date.getDay());
            const score = (availabilityRatio * 0.6) + (timePreference * 0.2) + (dayPreference * 0.2);

            suggestions.push({
                date: dateStr,
                startTime,
                endTime,
                availableParticipants: availableCount,
                totalParticipants: participants.length,
                score
            });
        }
    }

    // Sort by score (descending)
    suggestions.sort((a, b) => b.score - a.score);

    return suggestions.slice(0, 10);
}

function getTimePreferenceScore(hour: number): number {
    // Prefer mid-morning and early afternoon
    if (hour >= 9 && hour <= 11) return 1.0;
    if (hour >= 13 && hour <= 15) return 0.9;
    if (hour >= 11 && hour <= 13) return 0.7; // Lunch time less preferred
    return 0.6;
}

function getDayPreferenceScore(dayOfWeek: number): number {
    // Tuesday, Wednesday, Thursday are most preferred
    if (dayOfWeek >= 2 && dayOfWeek <= 4) return 1.0;
    if (dayOfWeek === 1) return 0.8; // Monday
    if (dayOfWeek === 5) return 0.7; // Friday
    return 0.3; // Weekend
}

// ==================== MEETING SUMMARY ====================

export function generateMeetingSummary(
    notes: string,
    meetingTitle?: string
): string {
    // Input Validation
    if (!notes || notes.trim().length < 10 || /^(.)\1+$/.test(notes.replace(/\s/g, ''))) {
        return 'Data tidak valid atau terlalu sedikit untuk dianalisis';
    }

    const keySentences = extractKeySentences(notes, 5);
    const keywords = extractKeywords(notes, 5);

    let summary = '';

    if (meetingTitle) {
        summary += `**Ringkasan Rapat: ${meetingTitle}**\n\n`;
    }

    summary += `**Poin-poin Utama:**\n`;

    if (keySentences.length === 0) {
        summary += `1. Pembahasan umum mengenai agenda organisasi.\n`;
    } else {
        keySentences.forEach((sentence, index) => {
            summary += `${index + 1}. ${sentence}\n`;
        });
    }

    if (keywords.length > 0) {
        summary += `\n**Topik Terkait:** ${keywords.join(', ')}`;
    }

    return summary;
}

// ==================== ACTION ITEMS EXTRACTION ====================

// Action keywords in Indonesian and English
const ACTION_KEYWORDS = [
    'perlu', 'harus', 'akan', 'wajib', 'segera', 'deadline', 'target',
    'tugas', 'tanggung jawab', 'responsible', 'action', 'todo', 'follow up',
    'need to', 'must', 'should', 'will', 'required', 'assigned to',
    'buat', 'siapkan', 'kirim', 'hubungi', 'koordinasi', 'laporkan'
];

const PRIORITY_KEYWORDS = {
    high: ['segera', 'urgent', 'penting', 'critical', 'prioritas', 'mendesak', 'asap'],
    medium: ['perlu', 'harus', 'should', 'need', 'diharapkan'],
    low: ['jika', 'bisa', 'optional', 'mungkin', 'when possible']
};

/**
 * Extract action items from meeting notes (Pattern Recognition)
 */
export function extractActionItems(notes: string): ActionItem[] {
    const actionItems: ActionItem[] = [];

    // Input Validation
    if (!notes || notes.trim().length < 10) return [];

    const lines = notes.split(/[\n.!?]+/).map(s => s.trim()).filter(s => s.length > 5);

    // Common Verbs + Names mapping
    const VERBS = ['beli', 'kirim', 'siapkan', 'hubungi', 'buat', 'lapor', 'cek', 'ambil', 'kerjakan'];
    const NAMES = ['bayu', 'andi', 'budi', 'siti', 'ayu', 'nina', 'doni', 'admin', 'bendahara', 'sekretaris'];

    for (const line of lines) {
        const lowerLine = line.toLowerCase();

        // 1. Check for Action Keywords
        const hasKeyword = ACTION_KEYWORDS.some(k => lowerLine.includes(k)) ||
            VERBS.some(v => lowerLine.includes(v));

        if (hasKeyword) {
            let priority: 'low' | 'medium' | 'high' = 'medium';
            if (PRIORITY_KEYWORDS.high.some(k => lowerLine.includes(k))) priority = 'high';
            else if (PRIORITY_KEYWORDS.low.some(k => lowerLine.includes(k))) priority = 'low';

            // 2. Extract Assignee using Name pattern
            let assignee: string | undefined;
            for (const name of NAMES) {
                if (lowerLine.includes(name)) {
                    assignee = name.charAt(0).toUpperCase() + name.slice(1);
                    break;
                }
            }

            // 3. Extract Deadline pattern (dd/mm/yyyy or dd-mm)
            let deadline: Date | undefined;
            const dateMatch = line.match(/(\d{1,2})[\/\-](\d{1,2})/);
            if (dateMatch) {
                const now = new Date();
                deadline = new Date(now.getFullYear(), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
            }

            actionItems.push({
                id: `action-${Date.now()}-${actionItems.length}`,
                description: line,
                assignee,
                deadline,
                priority,
                status: 'pending'
            });
        }
    }

    return actionItems;
}

// ==================== SENTIMENT ANALYSIS ====================

/**
 * Analyze sentiment of meeting feedback or notes
 */
export function analyzeMeetingSentiment(text: string): SentimentResult {
    const sentiment = analyzeSentiment(text);

    // Get more detailed analysis
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const positiveAspects: string[] = [];
    const negativeAspects: string[] = [];

    for (const sentence of sentences) {
        const sentenceSentiment = analyzeSentiment(sentence);
        if (sentenceSentiment.label === 'positive' && sentenceSentiment.positiveWords.length > 0) {
            positiveAspects.push(sentence.trim());
        } else if (sentenceSentiment.label === 'negative' && sentenceSentiment.negativeWords.length > 0) {
            negativeAspects.push(sentence.trim());
        }
    }

    // Generate suggestions based on negative aspects
    const suggestions: string[] = [];

    if (sentiment.label === 'negative') {
        suggestions.push('Pertimbangkan untuk mengadakan sesi follow-up untuk mengatasi concern yang ada.');
        suggestions.push('Libatkan lebih banyak stakeholder untuk mendapatkan perspektif yang lebih luas.');
    }

    if (negativeAspects.length > positiveAspects.length) {
        suggestions.push('Fokuskan diskusi pada solusi konkret untuk masalah yang teridentifikasi.');
    }

    if (positiveAspects.length > 0) {
        suggestions.push('Pertahankan aspek-aspek positif dan bangun dari pencapaian yang sudah ada.');
    }

    return {
        overallScore: sentiment.score,
        label: sentiment.label,
        positiveAspects: positiveAspects.slice(0, 3),
        negativeAspects: negativeAspects.slice(0, 3),
        suggestions
    };
}

// ==================== MEETING INSIGHTS ====================

export interface MeetingInsights {
    totalDuration: number;
    keyTopics: string[];
    participationRate: number;
    actionItemsCount: number;
    sentiment: SentimentResult;
    recommendations: string[];
}

/**
 * Generate comprehensive meeting insights
 */
export async function generateMeetingInsights(
    meeting: Meeting,
    attendanceRate: number = 1.0
): Promise<MeetingInsights> {
    const notes = meeting.notes || '';
    const sentiment = analyzeMeetingSentiment(notes);
    const actionItems = extractActionItems(notes);
    const keywords = extractKeywords(notes, 10);
    const decisions = extractDecisions(notes);
    const nextAgenda = generateNextAgenda(actionItems);

    const recommendations: string[] = [];

    // Recommendations based on heuristics
    if (attendanceRate < 0.7) {
        recommendations.push('Tingkat kehadiran rendah. Pertimbangkan untuk mengirim reminder atau menjadwal ulang.');
    }

    if (meeting.duration > 90) {
        recommendations.push('Meeting berlangsung lama. Pertimbangkan untuk membagi menjadi sesi-sesi lebih pendek.');
    }

    if (actionItems.length === 0) {
        recommendations.push('Tidak ada action items teridentifikasi. Pastikan ada tugas tindak lanjut yang jelas.');
    }

    if (sentiment.label === 'negative') {
        recommendations.push('Sentimen rapat cenderung negatif. Pertimbangkan diskusi empat mata untuk resolusi konflik.');
    } else {
        recommendations.push('Pertahankan kolaborasi positif yang sudah berjalan.');
    }

    return {
        totalDuration: meeting.duration,
        keyTopics: keywords,
        participationRate: attendanceRate,
        actionItemsCount: actionItems.length,
        sentiment,
        recommendations
    };
}

/**
 * Extract formal decisions from notes
 */
export function extractDecisions(notes: string): string[] {
    const sentences = notes.split(/[.!?\n]+/).map(s => s.trim());
    const decisionKeywords = ['memutuskan', 'sepakat', 'disepakati', 'diketok', 'hasil keputusan', 'decided', 'agreed', 'fix', 'final', 'menetapkan'];

    return sentences.filter(s => {
        const lower = s.toLowerCase();
        return decisionKeywords.some(k => lower.includes(k));
    });
}

/**
 * Generate agenda for next meeting based on pending items
 */
export function generateNextAgenda(actionItems: ActionItem[]): string[] {
    const agenda: string[] = [];

    // 1. Review pending high priority items
    const highPri = actionItems.filter(a => a.priority === 'high');
    if (highPri.length > 0) {
        agenda.push(`Review Progress: ${highPri[0].description.substring(0, 50)}...`);
    }

    // 2. Standard items
    agenda.push("Evaluasi Mingguan");
    agenda.push("Perencanaan Kegiatan Mendatang");

    return agenda;
}

// ==================== EXPORT ====================

export const MeetingService = {
    suggestMeetingTimes,
    generateMeetingSummary,
    extractActionItems,
    analyzeMeetingSentiment,
    generateMeetingInsights,
    extractDecisions,
    generateNextAgenda
};

export default MeetingService;
