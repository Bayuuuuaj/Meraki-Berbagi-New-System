import { addDays, subDays, format } from "date-fns";

export type AttendanceStatus = "hadir" | "izin" | "sakit" | "alpha";

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  checkInTime?: string;
}

export interface TreasuryRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  amount: number;
  type: "in" | "out"; // Pemasukan (Iuran) vs Pengeluaran
  category: "iuran_wajib" | "iuran_sukarela" | "denda" | "lainnya";
  notes?: string;
  status: "pending" | "verified";
}

const CURRENT_DATE = new Date();

export const MOCK_ATTENDANCE: AttendanceRecord[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `att-${i}`,
  userId: `user-${i % 5}`,
  userName: i % 5 === 0 ? "Admin User" : `Anggota ${i % 5}`,
  date: format(subDays(CURRENT_DATE, i % 7), "yyyy-MM-dd"),
  status: i % 10 === 0 ? "sakit" : i % 15 === 0 ? "izin" : "hadir",
  checkInTime: "08:00",
  notes: i % 10 === 0 ? "Demam tinggi" : undefined,
}));

export const MOCK_TREASURY: TreasuryRecord[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `trs-${i}`,
  userId: `user-${i % 5}`,
  userName: i % 5 === 0 ? "Admin User" : `Anggota ${i % 5}`,
  date: format(subDays(CURRENT_DATE, i % 10), "yyyy-MM-dd"),
  amount: 20000,
  type: "in",
  category: "iuran_wajib",
  status: "verified",
  notes: "Iuran Bulan November",
}));

export const MOCK_USERS = [
  { id: "1", name: "Admin Meraki", email: "admin@meraki.org", role: "admin", status: "active" },
  { id: "2", name: "Budi Santoso", email: "budi@meraki.org", role: "anggota", status: "active" },
  { id: "3", name: "Siti Aminah", email: "siti@meraki.org", role: "anggota", status: "active" },
  { id: "4", name: "Rizky Fauzan", email: "rizky@meraki.org", role: "anggota", status: "inactive" },
  { id: "5", name: "Dewi Lestari", email: "dewi@meraki.org", role: "anggota", status: "active" },
];

export interface UnpaidMember {
  id: string;
  userId: string;
  userName: string;
  month: string;
  amount: number;
}

export const MOCK_UNPAID: UnpaidMember[] = [
  { id: "up-1", userId: "2", userName: "Budi Santoso", month: "November 2025", amount: 20000 },
  { id: "up-2", userId: "4", userName: "Rizky Fauzan", month: "Oktober 2025", amount: 20000 },
  { id: "up-3", userId: "4", userName: "Rizky Fauzan", month: "November 2025", amount: 20000 },
];
