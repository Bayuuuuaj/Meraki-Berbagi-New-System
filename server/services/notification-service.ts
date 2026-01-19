import { storage } from "../storage";
import { type User, type InsertNotificationLog, type NotificationLog } from "@shared/schema";
import { randomUUID } from "crypto";

export class NotificationService {
    /**
     * Triggers a notification for a volunteer who has reached a new tier.
     */
    async triggerTierNotification(userId: string, newTier: string) {
        const user = await storage.getUser(userId);
        if (!user || !user.phone) {
            console.log(`[NotificationService] No user or phone found for ${userId}`);
            return;
        }

        // Check if notifications are enabled globally
        const autoNotifValue = await this.getSetting("whatsapp_auto_notif");
        if (autoNotifValue !== "true") {
            console.log(`[NotificationService] Auto-notifications are disabled.`);
            return;
        }

        // Check if we already sent a notification for this tier to this user
        const existingLogs = await this.getLogs(userId, newTier);
        if (existingLogs.length > 0 && existingLogs.some(log => log.status === "sent")) {
            console.log(`[NotificationService] Notification already sent for ${userId} tier ${newTier}`);
            return;
        }

        const message = this.generateMessage(user.name, user.contributionScore, newTier);

        // Log initial entry
        const newLog = await this.logNotification({
            userId,
            tierReached: newTier,
            status: "pending",
            message,
        });
        const logId = newLog.id;

        try {
            // Boilerplate for WhatsApp API Integration
            // Example: fetch('https://api.fonnte.com/send', { ... })

            // Mock successful send for now
            console.log(`[NotificationService] Sending WhatsApp to ${user.phone}: ${message}`);

            await this.updateLogStatus(logId, "sent");
            return { success: true };
        } catch (error: any) {
            console.error(`[NotificationService] Failed to send notification:`, error);
            await this.updateLogStatus(logId, "failed", error.message);
            return { success: false, error: error.message };
        }
    }

    private generateMessage(name: string, score: number, tier: string): string {
        return `🎉 Selamat ${name}! 🎉\n\n` +
            `Anda baru saja mencapai tingkat *${tier}* di Meraki-Berbagi! 🏆\n\n` +
            `Total Skor Kontribusi Anda saat ini: *${score} Poin*.\n\n` +
            `Terima kasih atas dedikasi luar biasa Anda sebagai relawan. Teruslah menebar kebaikan! ✨\n\n` +
            `Lihat lencana Anda dan unduh sertifikat digital di sini: ${process.env.APP_URL || 'https://meraki-berbagi.org'}/dashboard\n\n` +
            `Salam,\nMeraki-Berbagi Team`;
    }

    // Helper methods for storage
    private async getSetting(key: string): Promise<string> {
        const setting = await storage.getSetting(key);
        return setting?.value || "true";
    }

    private async getLogs(userId: string, tier: string): Promise<NotificationLog[]> {
        return storage.getNotificationLogs(userId, tier);
    }

    private async logNotification(log: InsertNotificationLog): Promise<NotificationLog> {
        return storage.createNotificationLog(log);
    }

    private async updateLogStatus(id: string, status: string, error?: string): Promise<NotificationLog> {
        return storage.updateNotificationLogStatus(id, status, error);
    }
}

export const notificationService = new NotificationService();
