import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to mark notification as read");
    }
  };

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
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      notification.isRead === 0
                        ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-primary/20 rounded-full mt-0.5">
                          <Bell className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{notification.title}</h3>
                            {notification.isRead === 0 && (
                              <Badge variant="default" className="bg-blue-600">
                                Baru
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
                          </p>
                        </div>
                      </div>
                      {notification.isRead === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Tandai Dibaca
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
