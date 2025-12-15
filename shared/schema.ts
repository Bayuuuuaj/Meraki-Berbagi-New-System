import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, date } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  status: text("status").notNull().default("verified"), // "pending" or "verified"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTreasurySchema = createInsertSchema(treasury).omit({
  id: true,
  createdAt: true,
});

export const selectTreasurySchema = createSelectSchema(treasury);

export type InsertTreasury = z.infer<typeof insertTreasurySchema>;
export type Treasury = typeof treasury.$inferSelect;

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
