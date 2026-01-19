import {
  type User, type InsertUser,
  type News, type InsertNews,
  type Attendance, type InsertAttendance,
  type Treasury, type InsertTreasury,
  type AiAuditLog, type InsertAiAuditLog,
  type FinancialSimulation, type InsertFinancialSimulation,
  type NotificationLog, type InsertNotificationLog,
  type Setting, type InsertSetting,
  type AuditLog, type InsertAuditLog,
  users, attendance, treasury, news, aiAuditLogs, financialSimulations, notificationLogs, settings, auditLogs
} from "@shared/schema.ts";
import { db } from "./db.ts";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Users
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser, context?: { userId: string, ip: string }): Promise<User>;
  updateUser(id: string, user: Partial<User>, context?: { userId: string, ip: string }): Promise<User>;
  deleteUser(id: string, context?: { userId: string, ip: string }): Promise<void>;

  // Attendance
  getAllAttendance(): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance, context?: { userId: string, ip: string }): Promise<Attendance>;
  deleteAttendance(id: string, context?: { userId: string, ip: string }): Promise<void>;
  deleteAllAttendance(context?: { userId: string, ip: string }): Promise<void>;

  // Treasury
  getTreasury(id: string): Promise<Treasury | undefined>;
  getAllTreasury(): Promise<Treasury[]>;
  createTreasury(treasury: InsertTreasury, context?: { userId: string, ip: string }): Promise<Treasury>;
  updateTreasury(id: string, updates: Partial<Treasury>, context?: { userId: string, ip: string }): Promise<Treasury>;
  deleteTreasury(id: string, context?: { userId: string, ip: string }): Promise<void>;

  // News
  getNews(): Promise<News[]>;
  createNews(news: InsertNews): Promise<News>;
  deleteNews(id: string): Promise<void>;

  // AI Analytics
  getAiAuditLogs(): Promise<AiAuditLog[]>;
  createAiAuditLog(log: InsertAiAuditLog): Promise<AiAuditLog>;

  // Financial Simulations
  getFinancialSimulations(userId: string): Promise<FinancialSimulation[]>;
  createFinancialSimulation(sim: InsertFinancialSimulation): Promise<FinancialSimulation>;

  // Notifications & Settings
  getNotificationLogs(userId: string, tier: string): Promise<NotificationLog[]>;
  createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog>;
  updateNotificationLogStatus(id: string, status: string, error?: string): Promise<NotificationLog>;
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: string): Promise<Setting>;
  updateUserPassword(userId: string, newPassword: string): Promise<void>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeOfficialMembers();
  }

  private async initializeOfficialMembers() {
    const existingUsers = await this.getAllUsers();
    if (existingUsers.length > 0) return;

    console.log("Empty database detected. Seeding official members...");

    const officials = [
      { name: "N. Syifa Wildaini, S.Ked", role: "admin", skills: "Leadership, Medical, Operations" },
      { name: "Muhammad Rehan, S.Ds", role: "admin", skills: "Design Strategy, Photography, Project Mgmt" },
      { name: "Adisti Tristania F, S.Ak", role: "admin", skills: "Accounting, Auditing, Finance" },
      { name: "N Sahla Julianti, S.M", role: "admin", skills: "Management, Budgeting, Treasury" },
      { name: "Hafizhah Nasywa Zahira", role: "admin", skills: "Administration, Documentation, Secretariat" },
      { name: "Fatmah Al Hulaibi", role: "anggota", skills: "Communication, Branding, PR" },
      { name: "Ibrahim Sabit Agustian", role: "anggota", skills: "Communication, Public Speaking" },
      { name: "Theana Ryandianita Putri", role: "anggota", skills: "Communication, Branding, Social" },
      { name: "Citra Aisyah Maulin", role: "anggota", skills: "Event Planning, Coordination" },
      { name: "Elsa Silalahi", role: "anggota", skills: "Event Planning, Logistics" },
      { name: "Rahma Saharani", role: "anggota", skills: "Event Planning, Logistics" },
      { name: "Salma Safira Adawiyah", role: "anggota", skills: "Event Planning, Coordination" },
      { name: "Tina Putri Septiyani", role: "anggota", skills: "Event Planning, Logistics" },
      { name: "Dita Dara Dinanti, S.Ds", role: "anggota", skills: "Photography, Graphic Design" },
      { name: "Idzni Syauqina Filzah, S.Ds", role: "anggota", skills: "Photography, Graphic Design" },
      { name: "Muhammad Ilham Naufal, S.Ds", role: "anggota", skills: "Photography, Video Editing" },
      { name: "Bayu Ajie Julian", role: "anggota", skills: "IT Development, Copywriting" },
      { name: "M. Raffa Aryadipta", role: "socmed Strategy, Project Management" },
      { name: "Nurul Aulia Annisa", role: "anggota", skills: "Copywriting, Socmed Strategy" },
      { name: "Andhika Zhandhy Anantha", role: "anggota", skills: "Supply Chain, Logistics" },
      { name: "Ade Tita", role: "anggota", skills: "Logistics, General Affairs" },
      { name: "Denisa Agustian, S.Ab", role: "anggota", skills: "Administration, Logistics" },
      { name: "Ega Winia Asyifa, S.Mp", role: "anggota", skills: "Management, Logistics, Agribusiness" },
    ];

    for (const off of officials) {
      const parts = off.name.split(/[ ,.]+/).filter(p => p.length > 1);
      const firstNameShort = (parts[0] || "member").toLowerCase();
      const email = off.name.toLowerCase().split(/[ ,.]+/).filter(Boolean).join(".") + "@meraki.org";
      const tempPassword = "meraki_" + firstNameShort;

      await this.createUser({
        email,
        password: tempPassword,
        name: off.name,
        role: off.role as any,
        isActive: 1,
        isSuperAdmin: off.role === "admin" ? 1 : 0,
        phone: "08123456789",
        skills: off.skills || "",
        contributionScore: 0,
        badges: "[]",
      });
    }

    // Default admin
    await this.createUser({
      email: "admin@meraki.org",
      password: "admin123",
      name: "Admin Meraki",
      role: "admin",
      isActive: 1,
      isSuperAdmin: 1,
      phone: "08111111111",
      skills: "System Admin",
      contributionScore: 0,
      badges: "[]",
    });

    console.log("Official members seeded successfully.");
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser, context?: { userId: string, ip: string }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();

    if (context) {
      await this.createAuditLog({
        userId: context.userId,
        action: "CREATE",
        entity: "users",
        entityId: user.id,
        details: JSON.stringify({ data: { ...user, password: "[REDACTED]" } }),
        ipAddress: context.ip,
        userAgent: null
      });
    }

    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUser(id: string, updates: Partial<User>, context?: { userId: string, ip: string }): Promise<User> {
    const [oldData] = await db.select().from(users).where(eq(users.id, id));
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!user) throw new Error("User not found");

    if (context && oldData) {
      await this.createAuditLog({
        userId: context.userId,
        action: "UPDATE",
        entity: "users",
        entityId: id,
        details: JSON.stringify({
          before: { ...oldData, password: "[REDACTED]" },
          after: { ...user, password: "[REDACTED]" },
          changes: Object.keys(updates)
        }),
        ipAddress: context.ip,
        userAgent: null
      });
    }

    return user;
  }

  async deleteUser(id: string, context?: { userId: string, ip: string }): Promise<void> {
    const [oldData] = await db.select().from(users).where(eq(users.id, id));
    await db.delete(users).where(eq(users.id, id));

    if (context && oldData) {
      await this.createAuditLog({
        userId: context.userId,
        action: "DELETE",
        entity: "users",
        entityId: id,
        details: JSON.stringify({ deletedData: { ...oldData, password: "[REDACTED]" } }),
        ipAddress: context.ip,
        userAgent: null
      });
    }
  }

  async getAllAttendance(): Promise<Attendance[]> {
    return db.select().from(attendance);
  }

  async createAttendance(insert: InsertAttendance, context?: { userId: string, ip: string }): Promise<Attendance> {
    const [record] = await db.insert(attendance).values(insert).returning();

    if (context) {
      await this.createAuditLog({
        userId: context.userId,
        action: "CREATE",
        entity: "attendance",
        entityId: record.id,
        details: JSON.stringify({ data: record }),
        ipAddress: context.ip,
        userAgent: null
      });
    }

    return record;
  }

  async deleteAttendance(id: string, context?: { userId: string, ip: string }): Promise<void> {
    const [oldData] = await db.select().from(attendance).where(eq(attendance.id, id));
    await db.delete(attendance).where(eq(attendance.id, id));

    if (context && oldData) {
      await this.createAuditLog({
        userId: context.userId,
        action: "DELETE",
        entity: "attendance",
        entityId: id,
        details: JSON.stringify({ deletedData: oldData }),
        ipAddress: context.ip,
        userAgent: null
      });
    }
  }

  async deleteAllAttendance(context?: { userId: string, ip: string }): Promise<void> {
    await db.delete(attendance);

    if (context) {
      await this.createAuditLog({
        userId: context.userId,
        action: "DELETE_ALL",
        entity: "attendance",
        entityId: "all",
        details: JSON.stringify({ message: "All attendance records cleared" }),
        ipAddress: context.ip,
        userAgent: null
      });
    }
  }

  async getTreasury(id: string): Promise<Treasury | undefined> {
    const [record] = await db.select().from(treasury).where(eq(treasury.id, id));
    return record;
  }

  async getAllTreasury(): Promise<Treasury[]> {
    return db.select().from(treasury).orderBy(desc(treasury.date));
  }

  async createTreasury(insert: InsertTreasury, context?: { userId: string, ip: string }): Promise<Treasury> {
    const [record] = await db.insert(treasury).values(insert).returning();

    if (context) {
      await this.createAuditLog({
        userId: context.userId,
        action: "CREATE",
        entity: "treasury",
        entityId: record.id,
        details: JSON.stringify({ data: record }),
        ipAddress: context.ip || null,
        userAgent: null
      });
    }

    return record;
  }

  async updateTreasury(id: string, updates: Partial<Treasury>, context?: { userId: string, ip: string }): Promise<Treasury> {
    const [oldData] = await db.select().from(treasury).where(eq(treasury.id, id));
    const [record] = await db.update(treasury).set(updates).where(eq(treasury.id, id)).returning();
    if (!record) throw new Error("Treasury not found");

    if (context && oldData) {
      await this.createAuditLog({
        userId: context.userId,
        action: "UPDATE",
        entity: "treasury",
        entityId: id,
        details: JSON.stringify({
          before: oldData,
          after: record,
          changes: Object.keys(updates)
        }),
        ipAddress: context.ip || null,
        userAgent: null
      });
    }
    return record;
  }

  async deleteTreasury(id: string, context?: { userId: string, ip: string }): Promise<void> {
    const [oldData] = await db.select().from(treasury).where(eq(treasury.id, id));
    await db.delete(treasury).where(eq(treasury.id, id));

    if (context && oldData) {
      await this.createAuditLog({
        userId: context.userId,
        action: "DELETE",
        entity: "treasury",
        entityId: id,
        details: JSON.stringify({ deletedData: oldData }),
        ipAddress: context.ip || null,
        userAgent: null
      });
    }
  }

  async createAuditLog(insert: InsertAuditLog): Promise<AuditLog> {
    const [record] = await db.insert(auditLogs).values(insert).returning();
    return record;
  }

  async getNews(): Promise<News[]> {
    return db.select().from(news).orderBy(desc(news.date));
  }

  async createNews(insert: InsertNews): Promise<News> {
    const [record] = await db.insert(news).values(insert).returning();
    return record;
  }

  async deleteNews(id: string): Promise<void> {
    await db.delete(news).where(eq(news.id, id));
  }

  async getAiAuditLogs(): Promise<AiAuditLog[]> {
    return db.select().from(aiAuditLogs).orderBy(desc(aiAuditLogs.createdAt));
  }

  async createAiAuditLog(insert: InsertAiAuditLog): Promise<AiAuditLog> {
    const [record] = await db.insert(aiAuditLogs).values(insert).returning();
    return record;
  }

  async getFinancialSimulations(userId: string): Promise<FinancialSimulation[]> {
    return db.select().from(financialSimulations).where(eq(financialSimulations.userId, userId)).orderBy(desc(financialSimulations.createdAt));
  }

  async createFinancialSimulation(insert: InsertFinancialSimulation): Promise<FinancialSimulation> {
    const [record] = await db.insert(financialSimulations).values(insert).returning();
    return record;
  }

  async getNotificationLogs(userId: string, tier: string): Promise<NotificationLog[]> {
    return db.select().from(notificationLogs).where(and(eq(notificationLogs.userId, userId), eq(notificationLogs.tierReached, tier)));
  }

  async createNotificationLog(insert: InsertNotificationLog): Promise<NotificationLog> {
    const id = randomUUID();
    const [record] = await db.insert(notificationLogs).values({ ...insert, id }).returning();
    return record;
  }

  async updateNotificationLogStatus(id: string, status: string, error?: string): Promise<NotificationLog> {
    const [record] = await db.update(notificationLogs).set({ status, error }).where(eq(notificationLogs.id, id)).returning();
    if (!record) throw new Error("Log not found");
    return record;
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [record] = await db.select().from(settings).where(eq(settings.key, key));
    return record;
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [record] = await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key)).returning();
      return record;
    } else {
      const id = randomUUID();
      const [record] = await db.insert(settings).values({ id, key, value }).returning();
      return record;
    }
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    await db.update(users).set({ password: newPassword }).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
