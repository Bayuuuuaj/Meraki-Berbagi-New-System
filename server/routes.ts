import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { insertNewsSchema, insertAttendanceSchema, insertTreasurySchema, insertUserSchema, insertVolunteerSchema } from "@shared/schema.ts";
import { z } from "zod";

import { generateComplianceReport } from "./utils/report-generator.ts";
import { loginLimiter } from "./middleware/rate-limiter.ts";
import { generateIntelligenceData } from "./services/intelligence-service.ts";
import { generateIntelligencePDF, generatePDFFilename } from "./services/pdf-export-service.ts";
import { gamificationService } from "./services/gamification-service.ts";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ===== ANTI-CACHE MIDDLEWARE =====
  // Prevent ngrok/browser caching of API responses
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Users
  app.get("/api/users", async (_req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const userId = req.headers['x-user-id'] as string || "system";
      // Check for existing email
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email sudah digunakan" });
      }
      const user = await storage.createUser(data, { userId, ip: req.ip || "" });
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const userId = req.headers['x-user-id'] as string || "system";
    await storage.deleteUser(req.params.id, { userId, ip: req.ip || "" });
    res.status(204).end();
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "system";
      const user = await storage.updateUser(req.params.id, req.body, { userId, ip: req.ip || "" });
      res.json(user);
    } catch (error) {
      res.status(404).json({ message: "User not found" });
    }
  });

  // Login with rate limiting (5 attempts per 15 minutes)
  app.post("/api/login", loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Email atau password salah" });
      }

      if (user.isActive !== 1) {
        return res.status(403).json({ message: "Akun dinonaktifkan" });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Attendance
  app.get("/api/attendance", async (_req, res) => {
    const attendance = await storage.getAllAttendance();
    const users = await storage.getAllUsers();

    // Join with user data
    const enrichedAttendance = attendance.map(item => {
      const user = users.find(u => u.id === item.userId);
      return {
        ...item,
        userName: user?.name || "Unknown User"
      };
    });

    res.json(enrichedAttendance);
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;

      if (!userId || userId === 'system' || userId === 'undefined') {
        return res.status(401).json({ message: "Sesi tidak valid/kadaluarsa. Silakan login ulang." });
      }

      // Check if user exists in DB to prevent FK error
      const userExists = await storage.getUser(userId);
      if (!userExists) {
        return res.status(401).json({ message: "User tidak ditemukan di database. Silakan login ulang." });
      }

      const userRole = req.headers['x-user-role'] as string;
      const now = new Date();

      // For members, we enforce server timestamp and "hadir" status
      if (userRole !== 'admin') {
        const payload = {
          userId,
          date: now.toISOString().split('T')[0], // YYYY-MM-DD
          status: 'hadir',
          checkInTime: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          notes: req.body.notes || "Self-service check-in",
          recordedBy: "system (self-service)"
        };

        const data = insertAttendanceSchema.parse(payload);
        const item = await storage.createAttendance(data, { userId, ip: req.ip || "" });

        // Update user score
        await gamificationService.updateUserScoreAndBadges(userId).catch(console.error);

        return res.status(201).json(item);
      }

      const data = insertAttendanceSchema.parse(req.body);
      const item = await storage.createAttendance(data, { userId, ip: req.ip || "" });

      // Update user score
      if (item.userId) {
        await gamificationService.updateUserScoreAndBadges(item.userId).catch(console.error);
      }

      res.status(201).json(item);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.delete("/api/attendance/:id", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "system";
      await storage.deleteAttendance(req.params.id, { userId, ip: req.ip || "" });
      res.json({ success: true, message: "Data absensi berhasil dihapus" });
    } catch (error: any) {
      if (error.message.includes("tidak ditemukan") || error.message.includes("terhapus")) {
        return res.status(404).json({ message: "Data absensi tidak ditemukan atau sudah terhapus" });
      }
      res.status(500).json({ message: error.message || "Gagal menghapus data absensi" });
    }
  });

  app.delete("/api/attendance-all", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "system";
      await storage.deleteAllAttendance({ userId, ip: req.ip || "" });
      res.json({ success: true, message: "Semua data absensi berhasil dihapus" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Gagal reset data absensi" });
    }
  });

  // Audit Logs (Admin Only)
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak" });
      }
      const logs = await storage.getAllAuditLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Treasury
  app.get("/api/treasury", async (_req, res) => {
    const treasury = await storage.getAllTreasury();
    const users = await storage.getAllUsers();

    // Join with user data
    const enrichedTreasury = treasury.map(item => {
      const user = users.find(u => u.id === item.userId);
      return {
        ...item,
        userName: user?.name || "Unknown User",
        userEmail: user?.email || "No Email"
      };
    });

    res.json(enrichedTreasury);
  });

  app.post("/api/treasury", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;

      if (!userId || userId === 'system' || userId === 'undefined') {
        return res.status(401).json({ message: "Sesi tidak valid/kadaluarsa. Silakan login ulang." });
      }

      // Check if user exists in DB to prevent FK error
      const userExists = await storage.getUser(userId);
      if (!userExists) {
        return res.status(401).json({ message: "User tidak ditemukan di database. Silakan login ulang." });
      }

      const userRole = req.headers['x-user-role'] as string;
      const data = insertTreasurySchema.parse({
        ...req.body,
        userId: userId, // FORCE OVERWRITE: Trust only server-side ID
        status: userRole === 'admin' ? req.body.status : 'pending',
        verificationStatus: userRole === 'admin' ? req.body.verificationStatus : 'pending',
        type: req.body.type || 'in',
        createdBy: userRole === 'admin' ? 'admin' : 'user'
      });

      // Enforce pending status for non-admins
      if (userRole !== 'admin') {
        data.status = 'pending';
        data.verificationStatus = 'pending';
        data.userId = userId;
        data.type = 'in';
        data.createdBy = 'user';
      }

      const item = await storage.createTreasury(data, { userId, ip: req.ip || "" });

      // Update user score (will only count if verified)
      await gamificationService.updateUserScoreAndBadges(userId).catch(console.error);

      res.status(201).json(item);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.patch("/api/treasury/:id", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "system";
      const item = await storage.updateTreasury(req.params.id, req.body, { userId, ip: req.ip || "" });

      // Update user score if status changed to verified, etc.
      if (item.userId) {
        await gamificationService.updateUserScoreAndBadges(item.userId).catch(console.error);
      }

      res.json(item);
    } catch (error) {
      res.status(404).json({ message: "Treasury not found" });
    }
  });

  app.delete("/api/treasury/:id", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "system";
      const result = await storage.deleteTreasury(req.params.id, { userId, ip: req.ip || "" });

      // Return balance in response for frontend to use immediately
      res.json({
        success: true,
        message: "Data berhasil dihapus",
        newBalance: result.newBalance
      });
    } catch (error: any) {
      if (error.message.includes("tidak ditemukan") || error.message.includes("terhapus")) {
        return res.status(404).json({ message: "Data tidak ditemukan atau sudah terhapus" });
      }
      res.status(500).json({ message: error.message || "Gagal menghapus data" });
    }
  });
  app.delete("/api/treasury-all", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || "system";
      const result = await storage.deleteAllTreasury({ userId, ip: req.ip || "" });

      res.json({
        success: true,
        message: "Semua data treasury berhasil dihapus",
        newBalance: result.newBalance
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Gagal reset data" });
    }
  });

  app.delete("/api/treasury/bulk", async (req, res) => {
    try {
      const { target } = req.query;
      const userId = req.headers['x-user-id'] as string || "system";

      let filter: any = {};
      if (target === 'queue') {
        filter = { status: 'pending' };
      } else if (target === 'expenses') {
        filter = { type: 'out', status: 'verified' };
      } else if (target === 'income') {
        filter = { type: 'in' };
      } else if (target === 'payments') {
        filter = { category: 'pembayaran' };
      } else {
        return res.status(400).json({ message: "Target tidak valid" });
      }

      const result = await storage.deleteTreasuryBulk(filter, { userId, ip: req.ip || "" });

      res.json({
        success: true,
        message: "Data berhasil dihapus",
        deletedCount: result.deletedCount,
        newBalance: result.newBalance
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Gagal membersihkan data" });
    }
  });

  app.get("/api/treasury/balance", async (_req, res) => {
    try {
      const balanceData = await storage.calculateTreasuryBalance();
      res.json(balanceData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export Compliance Report
  app.get("/api/treasury/export/compliance", async (req, res) => {
    try {
      const items = await storage.getAllTreasury();
      const report = generateComplianceReport(items);

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename=compliance-report.md');
      res.send(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const keys = ["whatsapp_auto_notif"];
      const settings = await Promise.all(keys.map(async key => {
        const s = await storage.getSetting(key);
        return s || { key, value: "true", description: "Otomatis kirim WA prestasi" };
      }));
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const setting = await storage.updateSetting(key, value);
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // News Routes
  app.get("/api/news", async (_req, res) => {
    const news = await storage.getNews();
    res.json(news);
  });

  app.post("/api/news", async (req, res) => {
    try {
      const data = insertNewsSchema.parse(req.body);
      const news = await storage.createNews(data);
      res.status(201).json(news);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.delete("/api/news/:id", async (req, res) => {
    await storage.deleteNews(req.params.id);
    res.status(204).end();
  });

  app.patch("/api/user/password", async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      if (!userId || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Data tidak valid (Password min. 8 karakter)" });
      }
      await storage.updateUserPassword(userId, newPassword);
      res.json({ message: "Password berhasil diperbarui" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Volunteer Routes
  app.get("/api/volunteers", async (_req, res) => {
    try {
      const vol = await storage.getAllVolunteers();
      res.json(vol);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/volunteers", async (req, res) => {
    try {
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Hanya pengurus (admin) yang bisa mengelola program." });
      }

      const userId = req.headers['x-user-id'] as string || "system";

      const validation = insertVolunteerSchema.safeParse(req.body);
      if (!validation.success) {
        console.error("Validation Error:", validation.error.flatten());
        return res.status(400).json({
          message: "Data pendaftaran tidak valid",
          errors: validation.error.flatten()
        });
      }

      const vol = await storage.createVolunteer(validation.data, { userId, ip: req.ip || "" });
      res.status(201).json(vol);
    } catch (error: any) {
      console.error("Volunteer Creator Error:", error);
      res.status(500).json({ message: "Gagal menyimpan ke database (Internal Server Error)" });
    }
  });

  app.patch("/api/volunteers/:id", async (req, res) => {
    try {
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak" });
      }

      const userId = req.headers['x-user-id'] as string || "system";

      // We don't necessarily need the full schema if we only update status, 
      // but let's at least check that the body isn't malformed
      const vol = await storage.updateVolunteer(req.params.id, req.body, { userId, ip: req.ip || "" });
      res.json(vol);
    } catch (error: any) {
      console.error("Volunteer Update Error:", error);
      res.status(404).json({ message: "Gagal memperbarui: Program tidak ditemukan atau data tidak valid" });
    }
  });

  app.delete("/api/volunteers/:id", async (req, res) => {
    try {
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak" });
      }

      const userId = req.headers['x-user-id'] as string || "system";
      await storage.deleteVolunteer(req.params.id, { userId, ip: req.ip || "" });
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Database Backup (Admin Only)
  app.get("/api/admin/export-database", async (req, res) => {
    try {
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak. Hanya admin yang dapat mengunduh backup." });
      }

      const backupData = await storage.exportFullBackup();

      // Set headers for file download
      const filename = `meraki-full-backup-${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(backupData);
    } catch (error: any) {
      res.status(500).json({ message: `Backup gagal: ${error.message}` });
    }
  });

  // Database Restore (Admin Only)
  app.post("/api/admin/import-database", async (req, res) => {
    try {
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak" });
      }

      const { backupData } = req.body;
      if (!backupData || !backupData.tables) {
        return res.status(400).json({ message: "Format backup tidak valid" });
      }

      await storage.importFullBackup(backupData);

      const userId = req.headers['x-user-id'] as string || "system";
      await storage.createAuditLog({
        userId,
        action: "RESTORE_DATABASE",
        entity: "system",
        entityId: "all",
        details: JSON.stringify({ timestamp: backupData.timestamp, version: backupData.version }),
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null
      });

      res.json({ message: "Database berhasil dipulihkan" });
    } catch (error: any) {
      res.status(500).json({ message: `Restore gagal: ${error.message}` });
    }
  });

  // Admin Intelligence Dashboard
  app.get("/api/admin/intelligence", async (req, res) => {
    try {
      // Admin role check
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak. Hanya admin yang dapat mengakses Intelligence Dashboard."
        });
      }

      // Fetch all required data
      const users = await storage.getAllUsers();
      const attendance = await storage.getAllAttendance();
      const treasury = await storage.getAllTreasury();
      const documents = await storage.getAllDocuments();

      // Fetch anomaly detection settings
      const thresholdSetting = await storage.getSetting('anomaly_threshold_amount');
      const duplicateSetting = await storage.getSetting('anomaly_duplicate_hours');

      const anomalyConfig = {
        thresholdAmount: thresholdSetting ? parseInt(thresholdSetting.value) : 1000000,
        duplicateHours: duplicateSetting ? parseInt(duplicateSetting.value) : 24
      };

      // Generate intelligence data using service with config and documents
      const intelligenceData = generateIntelligenceData(users, attendance, treasury, documents, anomalyConfig);

      // Transform to match frontend DashboardData interface
      const response = {
        success: true,
        data: {
          riskScore: intelligenceData.riskScore,
          alerts: intelligenceData.anomalies.map(anomaly => ({
            id: anomaly.id,
            type: anomaly.type,
            severity: anomaly.severity,
            title: anomaly.title,
            description: anomaly.description,
            recommendations: anomaly.recommendations
          })),
          habits: intelligenceData.habitInsights,
          summary: intelligenceData.summary,
          predictions: [], // Placeholder for future predictive analytics
          predictedPeriods: [], // Placeholder for future predictive analytics
          actionPlan: intelligenceData.actionPlan,
          // Additional metadata for frontend
          learningMode: intelligenceData.isLearning,
          efficiencyScore: intelligenceData.efficiencyScore.score,
          complianceRate: intelligenceData.complianceMetrics.rate
        }
      };

      res.json(response);
    } catch (error: any) {
      console.error("Intelligence Dashboard Error:", error);
      res.status(500).json({
        success: false,
        message: `Gagal mengambil data intelligence: ${error.message}`
      });
    }
  });

  // Admin Intelligence PDF Export
  app.get("/api/admin/intelligence/export-pdf", async (req, res) => {
    try {
      // Admin role check
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Akses ditolak. Hanya admin yang dapat mengekspor laporan intelligence."
        });
      }

      // Fetch all required data using storage
      const users = await storage.getAllUsers();
      const attendance = await storage.getAllAttendance();
      const treasury = await storage.getAllTreasury();
      const documents = await storage.getAllDocuments();

      // Fetch anomaly detection settings
      const thresholdSetting = await storage.getSetting('anomaly_threshold_amount');
      const duplicateSetting = await storage.getSetting('anomaly_duplicate_hours');

      const anomalyConfig = {
        thresholdAmount: thresholdSetting ? parseInt(thresholdSetting.value) : 1000000,
        duplicateHours: duplicateSetting ? parseInt(duplicateSetting.value) : 24
      };

      // Generate intelligence data with config and documents
      const intelligenceData = generateIntelligenceData(users, attendance, treasury, documents, anomalyConfig);

      // Generate PDF buffer
      const pdfBuffer = generateIntelligencePDF(intelligenceData);
      const filename = generatePDFFilename();

      // Set headers for auto-download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("PDF Export Error:", error);
      res.status(500).json({
        success: false,
        message: `Gagal mengekspor PDF: ${error.message}`
      });
    }
  });

  // Manual Recalculate Scores (Admin Only)
  app.post("/api/admin/recalculate-scores", async (req, res) => {
    try {
      const userRole = req.headers['x-user-role'] as string;
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak" });
      }

      await gamificationService.recalculateAllUsers();
      res.json({ message: "Semua skor dan badge berhasil diperbarui" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PAYMENT REMINDER SYSTEM =====
  // POST /api/admin/remind-user/:userId - Send payment reminder to member
  // POST /api/admin/remind-user/:userId - Send payment reminder to member
  app.post("/api/admin/remind-user/:userId", async (req, res) => {
    // Force JSON content-type to prevent HTML error pages
    res.type('json');

    try {
      const adminRole = req.headers['x-user-role'] as string;
      const adminId = req.headers['x-user-id'] as string || "system";
      const targetUserId = req.params.userId;

      // Get custom data from body
      const { amount, note } = req.body;

      // Security: Only admin can send reminders
      if (adminRole !== "admin") {
        return res.status(403).json({ message: "Hanya admin yang dapat mengirim pengingat" });
      }

      // Get target user info
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      // Format custom message
      let message = "Harap segera melakukan pembayaran kas rutin.";
      if (amount) {
        // Format to Rupiah: "Rp 50.000"
        const formattedAmount = new Intl.NumberFormat('id-ID').format(Number(amount));
        message = `Tagihan kas sebesar Rp ${formattedAmount} belum dibayar.`;
      }

      if (note && note.trim()) {
        message += ` ${note.trim()}`;
      }

      // Create payment reminder notification
      const notification = await storage.createNotification({
        userId: targetUserId,
        type: 'payment_reminder',
        title: 'Peringatan Tunggakan Kas',
        message: message,
        relatedId: null,
        isRead: 0
      });

      // Create audit log
      await storage.createAuditLog({
        userId: adminId,
        action: "SEND_REMINDER",
        entity: "notifications",
        entityId: notification.id,
        details: JSON.stringify({
          targetUser: targetUser.name,
          targetUserId,
          reminderType: 'payment_reminder',
          amount: amount || 0,
          note: note || ""
        }),
        ipAddress: req.ip || null,
        userAgent: null
      });

      return res.status(200).json({
        success: true,
        message: `Pengingat berhasil dikirim ke ${targetUser.name}`,
        notificationId: notification.id
      });

    } catch (error: any) {
      console.error("Remind User Error:", error);
      return res.status(500).json({
        message: "Gagal mengirim pengingat",
        error: error.message
      });
    }
  });



  // ===== USER NOTES SYSTEM =====
  // GET /api/user-notes/:userId - Get notes for a user (admin or user themselves)
  app.get("/api/user-notes/:userId", async (req, res) => {
    res.type('json');

    try {
      const requestingUserId = req.headers['x-user-id'] as string;
      const requestingUserRole = req.headers['x-user-role'] as string;
      const targetUserId = req.params.userId;

      // Security: Admin can see any user's notes, users can only see their own
      if (requestingUserRole !== "admin" && requestingUserId !== targetUserId) {
        return res.status(403).json({ message: "Tidak memiliki akses" });
      }

      const notes = await storage.getUserNotes(targetUserId);
      return res.status(200).json(notes);
    } catch (error: any) {
      console.error("Get User Notes Error:", error);
      return res.status(500).json({
        message: "Gagal mengambil catatan",
        error: error.message
      });
    }
  });

  // POST /api/admin/user-notes/:userId - Create note for user (admin only)
  app.post("/api/admin/user-notes/:userId", async (req, res) => {
    res.type('json');

    try {
      const adminRole = req.headers['x-user-role'] as string;
      const adminId = req.headers['x-user-id'] as string || "system";

      // Security: Only admin can create notes
      if (adminRole !== "admin") {
        return res.status(403).json({ message: "Hanya admin yang dapat membuat catatan" });
      }

      const targetUserId = req.params.userId;
      const { note } = req.body;

      if (!note || note.trim().length === 0) {
        return res.status(400).json({ message: "Catatan tidak boleh kosong" });
      }

      if (note.length > 500) {
        return res.status(400).json({ message: "Catatan maksimal 500 karakter" });
      }

      // Create note
      const newNote = await storage.createUserNote({
        userId: targetUserId,
        adminId,
        note: note.trim(),
      });

      // Audit log
      await storage.createAuditLog({
        userId: adminId,
        action: "CREATE_USER_NOTE",
        entity: "user_notes",
        entityId: newNote.id,
        details: JSON.stringify({
          targetUserId,
          notePreview: note.substring(0, 50)
        }),
        ipAddress: req.ip || null,
        userAgent: null
      });

      return res.status(201).json({
        success: true,
        message: "Catatan berhasil ditambahkan",
        note: newNote
      });
    } catch (error: any) {
      console.error("Create User Note Error:", error);
      return res.status(500).json({
        message: "Gagal membuat catatan",
        error: error.message
      });
    }
  });

  // DELETE /api/admin/user-notes/:noteId - Delete note (admin only)
  app.delete("/api/admin/user-notes/:noteId", async (req, res) => {
    res.type('json');

    try {
      const adminRole = req.headers['x-user-role'] as string;
      const adminId = req.headers['x-user-id'] as string || "system";

      // Security: Only admin can delete notes
      if (adminRole !== "admin") {
        return res.status(403).json({ message: "Hanya admin yang dapat menghapus catatan" });
      }

      const noteId = req.params.noteId;

      // Delete note
      await storage.deleteUserNote(noteId);

      // Audit log
      await storage.createAuditLog({
        userId: adminId,
        action: "DELETE_USER_NOTE",
        entity: "user_notes",
        entityId: noteId,
        details: JSON.stringify({ noteId }),
        ipAddress: req.ip || null,
        userAgent: null
      });

      return res.status(200).json({
        success: true,
        message: "Catatan berhasil dihapus"
      });
    } catch (error: any) {
      console.error("Delete User Note Error:", error);
      return res.status(500).json({
        message: "Gagal menghapus catatan",
        error: error.message
      });
    }
  });

  // ===== CUSTOM NOTIFICATIONS =====
  // POST /api/admin/send-notification - Send custom notification to specific user
  app.post("/api/admin/send-notification", async (req, res) => {
    res.type('json');

    try {
      const adminRole = req.headers['x-user-role'] as string;
      const adminId = req.headers['x-user-id'] as string || "system";

      // Security: Only admin can send notifications
      if (adminRole !== "admin") {
        return res.status(403).json({ message: "Hanya admin yang dapat mengirim notifikasi" });
      }

      const { userId, title, message, type = 'info' } = req.body;

      if (!userId || !title || !message) {
        return res.status(400).json({ message: "userId, title, dan message wajib diisi" });
      }

      // Get target user
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      // Create notification
      const notification = await storage.createNotification({
        userId,
        type,
        title,
        message,
        relatedId: null,
        isRead: 0
      });

      // Audit log
      await storage.createAuditLog({
        userId: adminId,
        action: "SEND_CUSTOM_NOTIFICATION",
        entity: "notifications",
        entityId: notification.id,
        details: JSON.stringify({
          targetUser: targetUser.name,
          targetUserId: userId,
          notificationType: type,
          titlePreview: title.substring(0, 30)
        }),
        ipAddress: req.ip || null,
        userAgent: null
      });

      return res.status(200).json({
        success: true,
        message: `Notifikasi berhasil dikirim ke ${targetUser.name}`,
        notificationId: notification.id
      });
    } catch (error: any) {
      console.error("Send Notification Error:", error);
      return res.status(500).json({
        message: "Gagal mengirim notifikasi",
        error: error.message
      });
    }
  });

  // POST /api/admin/broadcast-notification - Broadcast notification to all active users
  app.post("/api/admin/broadcast-notification", async (req, res) => {
    res.type('json');

    try {
      const adminRole = req.headers['x-user-role'] as string;
      const adminId = req.headers['x-user-id'] as string || "system";

      // Security: Only admin can broadcast
      if (adminRole !== "admin") {
        return res.status(403).json({ message: "Hanya admin yang dapat broadcast notifikasi" });
      }

      const { title, message, type = 'info' } = req.body;

      if (!title || !message) {
        return res.status(400).json({ message: "title dan message wajib diisi" });
      }

      // Get all active users (except admins)
      const allUsers = await storage.getAllUsers();
      const activeMembers = allUsers.filter(u => u.isActive === 1 && u.role !== 'admin');

      // Create notifications for all active members
      const notificationPromises = activeMembers.map(user =>
        storage.createNotification({
          userId: user.id,
          type,
          title,
          message,
          relatedId: null,
          isRead: 0
        })
      );

      await Promise.all(notificationPromises);

      // Audit log
      await storage.createAuditLog({
        userId: adminId,
        action: "BROADCAST_NOTIFICATION",
        entity: "notifications",
        entityId: "",
        details: JSON.stringify({
          recipientCount: activeMembers.length,
          notificationType: type,
          titlePreview: title.substring(0, 30)
        }),
        ipAddress: req.ip || null,
        userAgent: null
      });

      return res.status(200).json({
        success: true,
        message: `Notifikasi berhasil dikirim ke ${activeMembers.length} anggota`,
        recipientCount: activeMembers.length
      });
    } catch (error: any) {
      console.error("Broadcast Notification Error:", error);
      return res.status(500).json({
        message: "Gagal broadcast notifikasi",
        error: error.message
      });
    }
  });

  // ===== NOTIFICATION SYSTEM =====
  app.get("/api/notifications", async (req, res) => {
    // If user is not logged in, return existing notifications logic usually handles 401, but here we can check query param of user ID or session
    // However, the queryKey is ["/api/notifications", user.id]
    // We should expect the user to be authenticated.
    // Since we don't have middleware here shown, we might need to rely on the query param or session if available.
    // But typically we use req.user or similar if using passport/session.
    // The previous code used headers['x-user-id'] for some things.
    // Let's see if we can get the user ID from the query or headers.
    // The queryKey implies a GET request.

    try {
      // Trying to get user ID from session/passport first if available
      let userId: string | undefined;

      if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
        userId = (req as any).user?.id;
      }

      // Fallback: Check if passed as query param (common in some setups) or client passes it?
      // But for security, better to use the session user.
      // If we are "admin" impersonating or viewing, we might need flexibility.
      // But the requirement is for the "member dashboard" to see "their own" notifications.

      if (!userId) {
        // Check if passed in query string for now (client query key sends user.id but that might just be for cache key)
        // Actually React Query by default doesn't send the key args as params unless we build the URL that way.
        // Current code: queryKey: ["/api/notifications", user?.id]
        // The fetcher `apiRequest` in `client/src/lib/queryClient.ts` likely handles this?
        // No, usually apiRequest takes (method, url, body).
        // The queryFn was NOT defined in the useQuery hooks I saw, so it uses the DEFAULT queryFn.
        // Default queryFn calls `apiRequest` with the queryKey[0]. 
        // IT DOES NOT AUTOMATICALLY APPEND queryKey[1] as a param unless customized!
        // Wait, verifying `queryClient.ts` would confirm this.
        // If `queryClient.ts` default function ignores args, then `GET /api/notifications` is called WITHOUT params.,
        // effectively needing `req.user`.

        // Let's assume req.user is populated by some auth middleware.
        // If not, we might be in trouble.
        // But `req.headers['x-user-id']` was used in `user-notes`.
        // Let's try to support that too for safety.
        userId = (req.headers['x-user-id'] as string) || (req as any).user?.id;
      }

      if (!userId) {
        return res.status(401).json({ message: "Login required" });
      }

      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const targetUserId = req.params.userId;

      // Auto-auth check: if session exists, verify match
      if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
        const sessionUserId = (req as any).user?.id;
        const sessionRole = (req as any).user?.role;

        // Allow if own profile OR if admin
        if (String(sessionUserId) !== String(targetUserId) && sessionRole !== 'admin') {
          return res.status(403).json({ message: "Forbidden Access" });
        }
      }

      const notifications = await storage.getNotifications(targetUserId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}

