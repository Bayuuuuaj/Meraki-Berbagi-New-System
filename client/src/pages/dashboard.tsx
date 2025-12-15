import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";
import { CalendarCheck, Wallet, Users, TrendingUp, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [treasury, setTreasury] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attendRes, treasuryRes, usersRes] = await Promise.all([
        fetch("/api/attendance"),
        fetch("/api/treasury"),
        fetch("/api/users"),
      ]);

      if (attendRes.ok) setAttendance(await attendRes.json());
      if (treasuryRes.ok) setTreasury(await treasuryRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const totalAttendance = attendance.length;
    const hadirCount = attendance.filter(a => a.status === "hadir").length;
    const attendanceRate = totalAttendance > 0 ? Math.round((hadirCount / totalAttendance) * 100) : 0;

    const totalIncome = treasury
      .filter(t => t.type === "in" && t.status === "verified")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalMembers = users.filter(u => u.role === "anggota").length;

    return {
      attendanceRate,
      totalIncome,
      totalMembers,
      hadirCount,
      totalAttendance
    };
  };

  // Get member summary with totals
  const getMemberSummary = () => {
    const memberMap = new Map<string, any>();

    users.forEach(u => {
      if (u.role === "anggota") {
        memberMap.set(u.id, {
          id: u.id,
          name: u.name,
          email: u.email,
          attendanceCount: 0,
          hadirCount: 0,
          kasTotal: 0,
          kasPending: 0
        });
      }
    });

    // Add attendance data
    attendance.forEach(a => {
      const member = memberMap.get(a.userId);
      if (member) {
        member.attendanceCount += 1;
        if (a.status === "hadir") member.hadirCount += 1;
      }
    });

    // Add treasury data
    treasury.forEach(t => {
      if (t.type === "in") {
        const member = memberMap.get(t.userId);
        if (member) {
          if (t.status === "verified") {
            member.kasTotal += t.amount;
          } else {
            member.kasPending += t.amount;
          }
        }
      }
    });

    return Array.from(memberMap.values()).sort((a, b) => b.kasTotal - a.kasTotal);
  };

  // Attendance chart data
  const getAttendanceChartData = () => {
    const groupedByDate: Record<string, any> = {};

    attendance.forEach(a => {
      const date = new Date(a.date).toLocaleDateString('id-ID', { 
        month: 'short', 
        day: 'numeric' 
      });

      if (!groupedByDate[date]) {
        groupedByDate[date] = { date, hadir: 0, izin: 0, sakit: 0, alpha: 0 };
      }

      groupedByDate[date][a.status] += 1;
    });

    return Object.values(groupedByDate).slice(-7);
  };

  // Treasury chart data
  const getTreasuryChartData = () => {
    const memberTotals = getMemberSummary();
    return memberTotals.slice(0, 10).map(m => ({
      name: m.name.substring(0, 10),
      kas: m.kasTotal,
      pending: m.kasPending
    }));
  };

  const stats = calculateStats();
  const members = getMemberSummary();
  const attendanceChart = getAttendanceChartData();
  const treasuryChart = getTreasuryChartData();

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">
              Dashboard
            </h2>
            <p className="text-muted-foreground">
              Selamat datang kembali, <span className="font-semibold text-foreground">{user?.name}</span>!
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} className="w-full sm:w-auto">
            Refresh Data
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tingkat Kehadiran</CardTitle>
              <div className="p-2 bg-primary/20 rounded-full">
                <CalendarCheck className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.hadirCount} dari {stats.totalAttendance} absensi
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Kas Terverifikasi</CardTitle>
              <div className="p-2 bg-emerald-100 rounded-full dark:bg-emerald-900/30">
                <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp {(stats.totalIncome / 1000).toFixed(0)}K</div>
              <p className="text-xs text-muted-foreground mt-1">
                Dari {members.length} anggota
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anggota Aktif</CardTitle>
              <div className="p-2 bg-blue-100 rounded-full dark:bg-blue-900/30">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total anggota terdaftar
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Absensi</CardTitle>
              <div className="p-2 bg-orange-100 rounded-full dark:bg-orange-900/30">
                <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttendance}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total laporan absensi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Attendance Chart */}
          {attendanceChart.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Statistik Absensi</CardTitle>
                <CardDescription>
                  Tren kehadiran anggota (7 hari terakhir)
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceChart}>
                      <defs>
                        <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: 'var(--radius)',
                          boxShadow: 'var(--shadow-md)' 
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="hadir" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorHadir)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Treasury Chart */}
          {treasuryChart.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Kas Terverifikasi Per Anggota</CardTitle>
                <CardDescription>
                  Total kas yang sudah terverifikasi
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={treasuryChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: 'var(--radius)',
                          boxShadow: 'var(--shadow-md)' 
                        }}
                        formatter={(value) => [`Rp ${value.toLocaleString()}`, "Kas"]}
                      />
                      <Bar 
                        dataKey="kas" 
                        fill="hsl(var(--primary))" 
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Member Summary Table */}
        {members.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan Data Anggota</CardTitle>
              <CardDescription>
                Total absensi dan kas per anggota
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Nama Anggota</th>
                      <th className="px-4 py-3 text-center font-medium">Absensi</th>
                      <th className="px-4 py-3 text-center font-medium">Hadir</th>
                      <th className="px-4 py-3 text-right font-medium">Kas Terverifikasi</th>
                      <th className="px-4 py-3 text-right font-medium">Kas Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map(member => (
                      <tr key={member.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline">{member.attendanceCount}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            {member.hadirCount}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          Rp {member.kasTotal.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {member.kasPending > 0 ? (
                            <Badge variant="secondary">Rp {member.kasPending.toLocaleString()}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Submissions */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Attendance */}
          {attendance.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Absensi Terbaru</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendance.slice(-5).reverse().map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between pb-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{item.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.date).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <Badge variant={
                        item.status === "hadir" ? "default" :
                        item.status === "izin" ? "secondary" :
                        item.status === "sakit" ? "outline" : "destructive"
                      }>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Treasury */}
          {treasury.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Kas Terbaru</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {treasury.slice(-5).reverse().map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between pb-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{item.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.date).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">Rp {item.amount.toLocaleString()}</p>
                        <Badge variant={item.status === "verified" ? "default" : "secondary"} className="mt-1">
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
