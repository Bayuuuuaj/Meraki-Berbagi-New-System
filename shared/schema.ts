import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("anggota"), // "admin" or "anggota"
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = inactive
  isSuperAdmin: integer("is_super_admin").notNull().default(0), // 1 = super admin (cannot be kicked)
  phone: text("phone"),
  skills: text("skills"), // comma separated tags (e.g., "Logistik, Pengajar, IT")
  contributionScore: integer("contribution_score").notNull().default(0),
  badges: text("badges"), // JSON string array of achieved tiers
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return [
    index("email_idx").on(table.email),
    index("role_idx").on(table.role),
  ];
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const selectUserSchema = createSelectSchema(users);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Attendance table
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: text("status").notNull(), // "hadir", "izin", "sakit", "alpha"
  notes: text("notes"),
  checkInTime: text("check_in_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const selectAttendanceSchema = createSelectSchema(attendance);

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

// Treasury table
export const treasury = pgTable("treasury", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // "in" or "out"
  category: text("category").notNull(), // "iuran_wajib", "iuran_sukarela", "denda", "lainnya"
  notes: text("notes"),
  proof: text("proof"), // base64 encoded proof/receipt
  status: text("status").notNull().default("verified"), // "pending", "verified", or "flagged"
  verificationStatus: text("verification_status").notNull().default("verified"), // Human-in-the-Loop status: "pending", "verified", "flagged"
  verifiedBy: text("verified_by"), // ID or Nama pengguna yang menyetujui
  verifiedAt: timestamp("verified_at"), // Waktu persetujuan
  createdBy: text("created_by").notNull().default("user"), // "user" or "AI_EXTRACTOR"
  aiMetadata: text("ai_metadata"), // JSON array of extracted items/confidence
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return [
    index("verification_status_idx").on(table.verificationStatus),
    index("verified_by_idx").on(table.verifiedBy),
  ];
});

export const insertTreasurySchema = createInsertSchema(treasury).omit({
  id: true,
  createdAt: true,
});

export const selectTreasurySchema = createSelectSchema(treasury);

export type InsertTreasury = z.infer<typeof insertTreasurySchema>;
export type Treasury = typeof treasury.$inferSelect;

// Audit Logs table (for accountability and security)
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // "CREATE", "UPDATE", "DELETE"
  entity: text("entity").notNull(), // "treasury", "attendance", "users"
  entityId: varchar("entity_id").notNull(), // ID of the affected record
  details: text("details"), // JSON string with before/after values
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => {
  return [
    index("audit_user_idx").on(table.userId),
    index("audit_timestamp_idx").on(table.timestamp),
    index("audit_entity_idx").on(table.entity),
  ];
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const selectAuditLogSchema = createSelectSchema(auditLogs);

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Unpaid Members table (managed by admin)
export const unpaidMembers = pgTable("unpaid_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: text("month").notNull(), // "November 2025"
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUnpaidMemberSchema = createInsertSchema(unpaidMembers).omit({
  id: true,
  createdAt: true,
});

export const selectUnpaidMemberSchema = createSelectSchema(unpaidMembers);

export type InsertUnpaidMember = z.infer<typeof insertUnpaidMemberSchema>;
export type UnpaidMember = typeof unpaidMembers.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "unpaid_kas"
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: varchar("related_id"), // treasury/attendance id
  isRead: integer("is_read").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const selectNotificationSchema = createSelectSchema(notifications);

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// News table
export const news = pgTable("news", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  imageUrl: text("image_url"),
  tags: text("tags"), // comma separated tags
});

export const insertNewsSchema = createInsertSchema(news).omit({
  id: true,
  date: true,
});

export const selectNewsSchema = createSelectSchema(news);

export type InsertNews = z.infer<typeof insertNewsSchema>;
export type News = typeof news.$inferSelect;

// Notification Logs table
export const notificationLogs = pgTable("notification_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tierReached: text("tier_reached").notNull(),
  status: text("status").notNull(), // sent, failed, retry
  message: text("message").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({
  id: true,
  createdAt: true,
});

export const selectNotificationLogSchema = createSelectSchema(notificationLogs);

export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type NotificationLog = typeof notificationLogs.$inferSelect;

// Settings table
export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g., "whatsapp_auto_notif"
  value: text("value").notNull(), // stored as string (can be "true"/"false" or JSON)
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const selectSettingSchema = createSelectSchema(settings);

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// ==================== AI FEATURE TABLES ====================

// Documents table for AI Document Management
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category"), // AI-classified: laporan_kegiatan, proposal, keuangan, notulen, surat, dokumentasi, lainnya
  keywords: text("keywords"), // AI-extracted keywords (JSON array)
  summary: text("summary"), // AI-generated summary
  fileType: text("file_type"), // pdf, doc, txt, etc
  fileUrl: text("file_url"),
  confidence: integer("confidence"), // AI classification confidence (0-100)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const selectDocumentSchema = createSelectSchema(documents);

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Meetings table for AI Meeting Management
export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60), // in minutes
  participants: text("participants"), // JSON array of user IDs
  location: text("location"),
  notes: text("notes"),
  summary: text("summary"), // AI-generated summary
  actionItems: text("action_items"), // AI-extracted action items (JSON)
  sentimentScore: integer("sentiment_score"), // AI sentiment (0-100)
  sentimentLabel: text("sentiment_label"), // positive, neutral, negative
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
});

export const selectMeetingSchema = createSelectSchema(meetings);

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

// Risk Alerts table for AI Risk Management
export const riskAlerts = pgTable("risk_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // fraud, compliance, prediction, anomaly
  severity: text("severity").notNull(), // low, medium, high, critical
  title: text("title").notNull(),
  description: text("description").notNull(),
  relatedData: text("related_data"), // JSON with related IDs and metadata
  recommendations: text("recommendations"), // JSON array of recommendations
  isResolved: integer("is_resolved").notNull().default(0),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRiskAlertSchema = createInsertSchema(riskAlerts).omit({
  id: true,
  createdAt: true,
});

export const selectRiskAlertSchema = createSelectSchema(riskAlerts);

export type InsertRiskAlert = z.infer<typeof insertRiskAlertSchema>;
export type RiskAlert = typeof riskAlerts.$inferSelect;

// AI Audit Logs Table
export const aiAuditLogs = pgTable("ai_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: text("month").notNull(), // "YYYY-MM"
  efficiencyScore: integer("efficiency_score").notNull(), // 1-10
  anomalies: text("anomalies"), // JSON array of findings
  meetingSummary: text("meeting_summary"), // Markdown summary
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return [
    index("month_idx").on(table.month),
  ];
});

export const insertAiAuditLogSchema = createInsertSchema(aiAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const selectAiAuditLogSchema = createSelectSchema(aiAuditLogs);

export type InsertAiAuditLog = z.infer<typeof insertAiAuditLogSchema>;
export type AiAuditLog = typeof aiAuditLogs.$inferSelect;

// Financial Simulations Table
export const financialSimulations = pgTable("financial_simulations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scenarioName: text("scenario_name").notNull(),
  inputModifiers: text("input_modifiers").notNull(), // JSON of SimulationModifiers
  results: text("results").notNull(), // JSON of results
  advisorNote: text("advisor_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFinancialSimulationSchema = createInsertSchema(financialSimulations).omit({
  id: true,
  createdAt: true,
});

export const selectFinancialSimulationSchema = createSelectSchema(financialSimulations);


export type InsertFinancialSimulation = z.infer<typeof insertFinancialSimulationSchema>;
export type FinancialSimulation = typeof financialSimulations.$inferSelect;
