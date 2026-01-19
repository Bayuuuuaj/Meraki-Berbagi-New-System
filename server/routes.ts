import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { insertNewsSchema, insertAttendanceSchema, insertTreasurySchema, insertUserSchema } from "@shared/schema.ts";
import { generateComplianceReport } from "./utils/report-generator.ts";
import { loginLimiter } from "./middleware/rate-limiter.ts";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
      const data = insertAttendanceSchema.parse(req.body);
      const userId = req.headers['x-user-id'] as string || "system";
      const item = await storage.createAttendance(data, { userId, ip: req.ip || "" });
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
    const userId = req.headers['x-user-id'] as string || "system";
    await storage.deleteAttendance(req.params.id, { userId, ip: req.ip || "" });
    res.status(204).end();
  });

  app.delete("/api/attendance-all", async (req, res) => {
    const userId = req.headers['x-user-id'] as string || "system";
    await storage.deleteAllAttendance({ userId, ip: req.ip || "" });
    res.status(204).end();
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
      const data = insertTreasurySchema.parse(req.body);
      const userId = req.headers['x-user-id'] as string || "system";
      const item = await storage.createTreasury(data, { userId, ip: req.ip || "" });
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
      res.json(item);
    } catch (error) {
      res.status(404).json({ message: "Treasury not found" });
    }
  });

  app.delete("/api/treasury/:id", async (req, res) => {
    const userId = req.headers['x-user-id'] as string || "system";
    await storage.deleteTreasury(req.params.id, { userId, ip: req.ip || "" });
    res.status(204).end();
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

  // Database Backup (Admin Only)
  app.get("/api/admin/export-database", async (req, res) => {
    try {
      // TODO: Add proper authentication middleware
      // For now, check via query param or header
      const userRole = req.headers['x-user-role'] as string;

      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Akses ditolak. Hanya admin yang dapat mengunduh backup." });
      }

      // Get all data
      const users = await storage.getAllUsers();
      const treasury = await storage.getAllTreasury();
      const attendance = await storage.getAllAttendance();

      // Sanitize users - NEVER export passwords
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        phone: user.phone,
        skills: user.skills,
        contributionScore: user.contributionScore,
        badges: user.badges,
        createdAt: user.createdAt,
        // password is intentionally excluded for security
      }));

      const backupData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: "admin",
        data: {
          users: sanitizedUsers,
          treasury,
          attendance,
        },
        stats: {
          totalUsers: sanitizedUsers.length,
          totalTreasury: treasury.length,
          totalAttendance: attendance.length,
        }
      };

      // Set headers for file download
      const filename = `meraki-backup-${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(backupData);
    } catch (error: any) {
      res.status(500).json({ message: `Backup gagal: ${error.message}` });
    }
  });

  return httpServer;
}
