import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: number;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  // Use the same query key logic as dashboard.tsx for consistency
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/notifications/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 0, // Always fetch fresh data as requested
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}`, { isRead: 1 });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications", user?.id] });
    },
  });

  const unreadCount = notifications.filter(n => n.isRead === 0).length;

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">
            Notifikasi
          </h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `Anda memiliki ${unreadCount} notifikasi baru` : "Tidak ada notifikasi baru"}
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Daftar Notifikasi ({notifications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const isPaymentReminder = notification.type === 'payment_reminder';

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg transition-colors ${notification.isRead === 0
                          ? isPaymentReminder
                            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
                            : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
                          : "bg-muted/30 border-border"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-full mt-0.5 ${isPaymentReminder ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-primary/20'}`}>
                            {isPaymentReminder ? (
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                            ) : (
                              <Bell className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-semibold text-sm ${isPaymentReminder ? 'text-amber-800 dark:text-amber-400' : ''}`}>
                                {notification.title}
                              </h3>
                              {notification.isRead === 0 && (
                                <Badge variant="default" className={isPaymentReminder ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}>
                                  Baru
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                              {notification.message}
                            </p>

                            {/* Action Button for Payment Reminders */}
                            {isPaymentReminder && (
                              <div className="mt-3">
                                <Button
                                  size="sm"
                                  className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs shadow-sm"
                                  onClick={() => setLocation('/treasury')}
                                >
                                  Bayar Sekarang 💸
                                </Button>
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(notification.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
                            </p>
                          </div>
                        </div>
                        {notification.isRead === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            disabled={markAsReadMutation.isPending}
                          >
                            {markAsReadMutation.isPending ? "..." : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Tandai Dibaca
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Tidak ada notifikasi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
