import {
  type User, type InsertUser,
  type News, type InsertNews,
  type Attendance, type InsertAttendance,
  type Treasury, type InsertTreasury,
  type AiAuditLog, type InsertAiAuditLog,
  type FinancialSimulation, type InsertFinancialSimulation,
  type NotificationLog, type InsertNotificationLog,
  type Notification, type InsertNotification,
  type UserNote, type InsertUserNote,
  type Setting, type InsertSetting,
  type AuditLog, type InsertAuditLog,
  type Volunteer, type InsertVolunteer,
  users, attendance, treasury, news, aiAuditLogs, financialSimulations, notificationLogs, settings, auditLogs, notifications, userNotes,
  riskAlerts, documents, meetings, unpaidMembers, volunteers
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
  deleteAttendance(id: string, context?: { userId: string, ip: string }): Promise<{ deleted: boolean }>;
  deleteAllAttendance(context?: { userId: string, ip: string }): Promise<{ deleted: boolean }>;

  // Treasury
  getTreasury(id: string): Promise<Treasury | undefined>;
  getAllTreasury(): Promise<Treasury[]>;
  createTreasury(treasury: InsertTreasury, context?: { userId: string, ip: string }): Promise<Treasury>;
  updateTreasury(id: string, updates: Partial<Treasury>, context?: { userId: string, ip: string }): Promise<Treasury>;
  calculateTreasuryBalance(): Promise<{
    balance: number;
    details: { income: number; expensesVerified: number; pending: number };
  }>;
  deleteTreasury(id: string, context?: { userId: string, ip: string }): Promise<{ deleted: boolean; newBalance: number }>;
  deleteTreasuryBulk(filter: { type?: string, verificationStatus?: string, status?: string }, context?: { userId: string, ip: string }): Promise<{ deletedCount: number; newBalance: number }>;
  deleteAllTreasury(context?: { userId: string, ip: string }): Promise<{ deleted: boolean; newBalance: number }>;

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
  getNotifications(userId: string): Promise<Notification[]>;
  getAllNotifications(): Promise<Notification[]>;
  createNotification(notif: InsertNotification): Promise<Notification>;
  getNotificationLogs(userId: string, tier: string): Promise<NotificationLog[]>;
  createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog>;
  updateNotificationLogStatus(id: string, status: string, error?: string): Promise<NotificationLog>;
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: string): Promise<Setting>;
  updateUserPassword(userId: string, newPassword: string): Promise<void>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAllAuditLogs(): Promise<AuditLog[]>;

  // AI & Extra Tables for Backup
  getAllRiskAlerts(): Promise<any[]>;
  getAllDocuments(): Promise<any[]>;
  getAllMeetings(): Promise<any[]>;
  getAllUnpaidMembers(): Promise<any[]>;
  getAllFinancialSimulationsAllUsers(): Promise<FinancialSimulation[]>;
  getAllNotificationLogsAllUsers(): Promise<NotificationLog[]>;
  getAllSettings(): Promise<Setting[]>;

  // Volunteers
  getAllVolunteers(): Promise<Volunteer[]>;
  createVolunteer(volunteer: InsertVolunteer, context?: { userId: string, ip: string }): Promise<Volunteer>;
  updateVolunteer(id: string, updates: Partial<Volunteer>, context?: { userId: string, ip: string }): Promise<Volunteer>;
  deleteVolunteer(id: string, context?: { userId: string, ip: string }): Promise<void>;

  // Backup & Restore
  exportFullBackup(): Promise<any>;
  importFullBackup(data: any): Promise<void>;
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

  async deleteAttendance(id: string, context?: { userId: string, ip: string }): Promise<{ deleted: boolean }> {
    // Validate existence BEFORE deletion
    const [oldData] = await db.select().from(attendance).where(eq(attendance.id, id));

    if (!oldData) {
      throw new Error("Data absensi tidak ditemukan atau sudah terhapus");
    }

    // Perform deletion
    await db.delete(attendance).where(eq(attendance.id, id));

    if (context) {
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

    return { deleted: true };
  }

  async deleteAllAttendance(context?: { userId: string, ip: string }): Promise<{ deleted: boolean }> {
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

    return { deleted: true };
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

  async calculateTreasuryBalance(): Promise<{
    balance: number;
    details: { income: number; expensesVerified: number; pending: number };
  }> {
    const transactions = await db.select().from(treasury);

    const sumIncome = transactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.amount, 0);

    const sumExpensesVerified = transactions
      .filter(t => t.type === 'out' && t.status === 'verified')
      .reduce((sum, t) => sum + t.amount, 0);

    const sumPending = transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = sumIncome - (sumExpensesVerified + sumPending);

    return {
      balance,
      details: {
        income: sumIncome,
        expensesVerified: sumExpensesVerified,
        pending: sumPending
      }
    };
  }

  async deleteTreasury(id: string, context?: { userId: string, ip: string }): Promise<{ deleted: boolean; newBalance: number }> {
    // Validate existence BEFORE deletion
    const [oldData] = await db.select().from(treasury).where(eq(treasury.id, id));

    if (!oldData) {
      throw new Error("Data tidak ditemukan atau sudah terhapus");
    }

    // Perform deletion
    await db.delete(treasury).where(eq(treasury.id, id));

    // Recalculate balance from database (NOT from cache)
    const balanceData = await this.calculateTreasuryBalance();

    if (context) {
      await this.createAuditLog({
        userId: context.userId,
        action: "DELETE",
        entity: "treasury",
        entityId: id,
        details: JSON.stringify({
          deletedData: oldData,
          newBalance: balanceData.balance
        }),
        ipAddress: context.ip || null,
        userAgent: null
      });
    }

    return { deleted: true, newBalance: balanceData.balance };
  }

  async deleteTreasuryBulk(filter: { type?: string, verificationStatus?: string, status?: string }, context?: { userId: string, ip: string }): Promise<{ deletedCount: number; newBalance: number }> {
    const conditions = [];
    if (filter.type) conditions.push(eq(treasury.type, filter.type));
    if (filter.verificationStatus) conditions.push(eq(treasury.verificationStatus, filter.verificationStatus));
    if (filter.status) conditions.push(eq(treasury.status, filter.status));

    if (conditions.length === 0) {
      const balanceData = await this.calculateTreasuryBalance();
      return { deletedCount: 0, newBalance: balanceData.balance };
    }

    // Count items to be deleted
    const itemsToDelete = await db.select().from(treasury).where(and(...conditions));
    const deletedCount = itemsToDelete.length;

    // Perform deletion
    await db.delete(treasury).where(and(...conditions));

    // Recalculate balance from database
    const balanceData = await this.calculateTreasuryBalance();

    if (context) {
      await this.createAuditLog({
        userId: context.userId,
        action: "DELETE_BULK",
        entity: "treasury",
        entityId: "bulk",
        details: JSON.stringify({
          filter,
          deletedCount,
          newBalance: balanceData.balance
        }),
        ipAddress: context.ip || null,
        userAgent: null
      });
    }

    return { deletedCount, newBalance: balanceData.balance };
  }

  async deleteAllTreasury(context?: { userId: string, ip: string }): Promise<{ deleted: boolean; newBalance: number }> {
    // 1. Delete all relevant data tables
    await db.delete(treasury);
    await db.delete(aiAuditLogs);
    await db.delete(riskAlerts);
    await db.delete(financialSimulations);
    await db.delete(auditLogs);
    await db.delete(documents);
    await db.delete(meetings);
    await db.delete(unpaidMembers);

    // 2. Calculate new balance (should be 0)
    const balanceData = await this.calculateTreasuryBalance();

    // 3. Create a fresh audit log for the reset action if context is provided
    if (context) {
      await this.createAuditLog({
        userId: context.userId,
        action: "GLOBAL_RESET",
        entity: "system",
        entityId: "all",
        details: JSON.stringify({
          message: "Global Treasury and AI data reset executed - AI memory wiped",
          tablesCleared: ["treasury", "ai_audit_logs", "risk_alerts", "financial_simulations", "audit_logs", "documents", "meetings", "unpaid_members"],
          newBalance: balanceData.balance
        }),
        ipAddress: context.ip || null,
        userAgent: null
      });
    }

    return { deleted: true, newBalance: balanceData.balance };
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

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getAllNotifications(): Promise<Notification[]> {
    return db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async createNotification(insert: InsertNotification): Promise<Notification> {
    const [record] = await db.insert(notifications).values(insert).returning();
    return record;
  }

  // --- User Notes Methods ---
  async getUserNotes(userId: string): Promise<any[]> {
    // Join with users table to get admin name
    const notes = await db
      .select({
        id: userNotes.id,
        userId: userNotes.userId,
        adminId: userNotes.adminId,
        note: userNotes.note,
        createdAt: userNotes.createdAt,
        adminName: users.name,
      })
      .from(userNotes)
      .leftJoin(users, eq(userNotes.adminId, users.id))
      .where(eq(userNotes.userId, userId))
      .orderBy(desc(userNotes.createdAt));

    return notes;
  }

  async createUserNote(insert: InsertUserNote): Promise<UserNote> {
    const [record] = await db.insert(userNotes).values(insert).returning();
    return record;
  }

  async deleteUserNote(noteId: string): Promise<void> {
    await db.delete(userNotes).where(eq(userNotes.id, noteId));
  }

  async getNotificationLogs(userId: string, tier: string): Promise<NotificationLog[]> {
    return db.select().from(notificationLogs).where(and(eq(notificationLogs.userId, userId), eq(notificationLogs.tierReached, tier)));
  }



  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id));
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

  // --- Volunteer Methods ---
  async getAllVolunteers(): Promise<Volunteer[]> {
    return db.select().from(volunteers).orderBy(desc(volunteers.createdAt));
  }

  async createVolunteer(insert: InsertVolunteer, context?: { userId: string, ip: string }): Promise<Volunteer> {
    const [record] = await db.insert(volunteers).values(insert).returning();

    if (context) {
      await this.createAuditLog({
        userId: context.userId,
        action: "CREATE",
        entity: "volunteers",
        entityId: record.id,
        details: JSON.stringify({ data: record }),
        ipAddress: context.ip || null,
        userAgent: null
      });
    }

    return record;
  }

  async updateVolunteer(id: string, updates: Partial<Volunteer>, context?: { userId: string, ip: string }): Promise<Volunteer> {
    const [oldData] = await db.select().from(volunteers).where(eq(volunteers.id, id));
    const [record] = await db.update(volunteers).set(updates).where(eq(volunteers.id, id)).returning();
    if (!record) throw new Error("Volunteer program not found");

    if (context && oldData) {
      await this.createAuditLog({
        userId: context.userId,
        action: "UPDATE",
        entity: "volunteers",
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

  async deleteVolunteer(id: string, context?: { userId: string, ip: string }): Promise<void> {
    const [oldData] = await db.select().from(volunteers).where(eq(volunteers.id, id));
    await db.delete(volunteers).where(eq(volunteers.id, id));

    if (context && oldData) {
      await this.createAuditLog({
        userId: context.userId,
        action: "DELETE",
        entity: "volunteers",
        entityId: id,
        details: JSON.stringify({ deletedData: oldData }),
        ipAddress: context.ip || null,
        userAgent: null
      });
    }
  }

  // --- Backup & Export Methods ---
  async getAllAuditLogs(): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
  }

  async getAllRiskAlerts(): Promise<any[]> {
    const { riskAlerts } = await import("@shared/schema.ts");
    return db.select().from(riskAlerts);
  }

  async getAllDocuments(): Promise<any[]> {
    const { documents } = await import("@shared/schema.ts");
    return db.select().from(documents);
  }

  async getAllMeetings(): Promise<any[]> {
    const { meetings } = await import("@shared/schema.ts");
    return db.select().from(meetings);
  }

  async getAllUnpaidMembers(): Promise<any[]> {
    const { unpaidMembers } = await import("@shared/schema.ts");
    return db.select().from(unpaidMembers);
  }

  async getAllFinancialSimulationsAllUsers(): Promise<FinancialSimulation[]> {
    return db.select().from(financialSimulations);
  }

  async getAllNotificationLogsAllUsers(): Promise<NotificationLog[]> {
    return db.select().from(notificationLogs);
  }

  async getAllSettings(): Promise<Setting[]> {
    return db.select().from(settings);
  }

  async exportFullBackup(): Promise<any> {
    const [
      usersData, treasuryData, attendanceData, newsData,
      aiAuditLogsData, simulationsData, notifLogsData,
      settingsData, auditLogsData, riskData, docData,
      meetingData, unpaidData, notificationsData, volunteersData
    ] = await Promise.all([
      this.getAllUsers(),
      this.getAllTreasury(),
      this.getAllAttendance(),
      this.getNews(),
      this.getAiAuditLogs(),
      this.getAllFinancialSimulationsAllUsers(),
      this.getAllNotificationLogsAllUsers(),
      this.getAllSettings(),
      this.getAllAuditLogs(),
      this.getAllRiskAlerts(),
      this.getAllDocuments(),
      this.getAllMeetings(),
      this.getAllUnpaidMembers(),
      this.getAllNotifications(),
      this.getAllVolunteers()
    ]);

    return {
      version: "2.1",
      timestamp: new Date().toISOString(),
      tables: {
        users: usersData,
        treasury: treasuryData,
        attendance: attendanceData,
        news: newsData,
        aiAuditLogs: aiAuditLogsData,
        financialSimulations: simulationsData,
        notificationLogs: notifLogsData,
        settings: settingsData,
        auditLogs: auditLogsData,
        riskAlerts: riskData,
        documents: docData,
        meetings: meetingData,
        unpaidMembers: unpaidData,
        notifications: notificationsData,
        volunteers: volunteersData
      },
      stats: {
        users: usersData.length,
        treasury: treasuryData.length,
        attendance: attendanceData.length,
        notifications: notificationsData.length
      }
    };
  }

  async importFullBackup(data: any): Promise<void> {
    const {
      users: u, treasury: t, attendance: a, news: n,
      aiAuditLogs: ai, financialSimulations: fs,
      notificationLogs: nl, settings: st, auditLogs: al,
      riskAlerts: ra, documents: d, meetings: m,
      unpaidMembers: um, notifications: nt, volunteers: v
    } = data.tables;

    const {
      users, treasury, attendance, news, aiAuditLogs,
      financialSimulations, notificationLogs, settings,
      auditLogs, riskAlerts, documents, meetings,
      unpaidMembers, notifications, volunteers
    } = await import("@shared/schema.ts");

    await db.transaction(async (tx) => {
      // Clear existing child data first
      await tx.delete(auditLogs);
      await tx.delete(treasury);
      await tx.delete(attendance);
      await tx.delete(financialSimulations);
      await tx.delete(notificationLogs);
      await tx.delete(riskAlerts);
      await tx.delete(documents);
      await tx.delete(meetings);
      await tx.delete(unpaidMembers);
      await tx.delete(notifications);
      await tx.delete(news);
      await tx.delete(settings);
      await tx.delete(volunteers);

      // Clear parent table last
      await tx.delete(users);

      // Restore parent first
      if (u.length) await tx.insert(users).values(u);

      // Restore others
      if (t.length) await tx.insert(treasury).values(t);
      if (a.length) await tx.insert(attendance).values(a);
      if (n.length) await tx.insert(news).values(n);
      if (ai.length) await tx.insert(aiAuditLogs).values(ai);
      if (fs.length) await tx.insert(financialSimulations).values(fs);
      if (nl.length) await tx.insert(notificationLogs).values(nl);
      if (st.length) await tx.insert(settings).values(st);
      if (al.length) await tx.insert(auditLogs).values(al);
      if (ra.length) await tx.insert(riskAlerts).values(ra);
      if (d.length) await tx.insert(documents).values(d);
      if (m.length) await tx.insert(meetings).values(m);
      if (um.length) await tx.insert(unpaidMembers).values(um);
      if (nt && nt.length) await tx.insert(notifications).values(nt);
      if (v && v.length) await tx.insert(volunteers).values(v);
    });
  }
}

export const storage = new DatabaseStorage();
