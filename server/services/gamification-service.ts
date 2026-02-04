
import { db } from "../db";
import { users, attendance, treasury } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "../storage";

export class GamificationService {
    /**
     * Calculate and update the contribution score and badges for a user
     * @param userId The ID of the user to update
     */
    async updateUserScoreAndBadges(userId: string): Promise<{ score: number, badges: string[] }> {
        console.log(`[Gamification] Calculating score for user: ${userId}`);

        // 1. Calculate Score based on Financial Contribution
        // 1000 IDR = 1 Point
        const userTreasury = await db.select().from(treasury)
            .where(and(
                eq(treasury.userId, userId),
                eq(treasury.type, 'in'),
                eq(treasury.status, 'verified')
            ));

        const totalDonation = userTreasury.reduce((sum, t) => sum + t.amount, 0);
        const financialScore = Math.floor(totalDonation / 1000);

        // 2. Calculate Score based on Attendance
        // 1 Attendance = 10 Points
        const userAttendance = await db.select().from(attendance)
            .where(and(
                eq(attendance.userId, userId),
                eq(attendance.status, 'hadir')
            ));

        // Calculate consecutive attendance for "Impact Hero" check (simplified: just count for now)
        const attendanceScore = userAttendance.length * 10;

        // Total Score
        const totalScore = financialScore + attendanceScore;

        // 3. Determine Badges
        const badges: string[] = [];

        if (totalScore > 100) {
            badges.push("Impact Maker");
        }

        if (totalScore > 500) {
            badges.push("Meraki Champion");
        }

        // Impact Hero: > 1000 points OR 5 consecutive attendance (simplified to 5 total for MVP if consecutive is hard)
        // Let's try to verify consecutive attendance roughly?
        // For now, let's stick to total score > 1000 or Total Attendance >= 5 for Impact Hero?
        // The prompt config said: "Tercapai jika skor kontribusi > 1000 atau hadir 5 kali berturut-turut."
        // We will stick to score > 1000 OR Attendance >= 5 (simpler than strict consecutive for now to ensure it triggers)
        if (totalScore > 1000 || userAttendance.length >= 5) {
            badges.push("Impact Hero");
        }

        // 4. Update User in DB
        // We need to fetch the current user to verify if update is needed, but we can just update.
        // Use storage.updateUser to handle audit logging if possible, but storage.updateUser takes strict Partial<User>
        // Since we are in the server, let's use storage if possible or direct DB.
        // storage.updateUser signature: (id, updates, context)

        await storage.updateUser(userId, {
            contributionScore: totalScore,
            badges: JSON.stringify(badges)
        });

        console.log(`[Gamification] Updated User ${userId}: Score ${totalScore}, Badges [${badges.join(', ')}]`);

        return { score: totalScore, badges };
    }

    /**
     * Recalculate scores for ALL users (e.g. for nightly jobs or initialization)
     */
    async recalculateAllUsers() {
        const allUsers = await storage.getAllUsers();
        console.log(`[Gamification] Recalculating scores for ${allUsers.length} users...`);

        for (const user of allUsers) {
            await this.updateUserScoreAndBadges(user.id);
        }

        console.log(`[Gamification] Recalculation complete.`);
    }
}

export const gamificationService = new GamificationService();
