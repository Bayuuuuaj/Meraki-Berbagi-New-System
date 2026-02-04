
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export default function ActivityFeed() {
    const { data: logs = [] } = useQuery<any[]>({
        queryKey: ["/api/audit-logs"],
        refetchInterval: 3000,
    });

    if (logs.length === 0) {
        return <div className="text-center text-muted-foreground py-8">Belum ada aktivitas baru.</div>;
    }

    // Format log message based on action
    const getLogMessage = (log: any) => {
        try {
            const details = JSON.parse(log.details || "{}");

            if (log.entity === 'treasury') {
                if (log.action === 'CREATE') return `mengirim pembayaran kas sebesar Rp ${details.data?.amount?.toLocaleString()}`;
                if (log.action === 'UPDATE') return `memperbarui data kas`;
                if (log.action === 'DELETE') return `menghapus data kas`;
            }

            if (log.entity === 'attendance') {
                // Assuming details contains data object
                const status = details.data?.status || "hadir";
                return `melakukan absensi (${status})`;
            }

            if (log.entity === 'users') {
                return `memperbarui profil pengguna`;
            }

            return `melakukan aksi ${log.action} pada ${log.entity}`;
        } catch (e) {
            return `melakukan aktivitas baru`;
        }
    };

    return (
        <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
                {logs.slice(0, 20).map((log, i) => (
                    <div key={log.id || i} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 hover:bg-muted/50 p-2 rounded-lg transition-colors">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {log.userId === 'system' ? 'SYS' : 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">
                                <span className="text-primary">{log.userId === 'system' ? 'System' : 'Seorang Anggota'}</span> {/* Since we don't have joined name in audit logs yet unless we modify backend to return it, we keep it simple or fetch users. */}
                                {/* To be more specific: Backend getAuditLogs selects * from *auditLogs*. We need to join users to get names. 
                   For now, "Seorang Anggota" is safe, or we use client-side mapping if we have users loaded. 
                   But let's assume we can improve this later. The Prompt says: "[Nama Anggota] baru saja...".
                   I'll update getAuditLogs in backend to return User Name, OR Use useQuery(['/api/users']) here and map.
                   Admin dashboard already loads users. I'll rely on cache.
                */}
                                <UserNameDisplay userId={log.userId} />
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {getLogMessage(log)}
                            </p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: id })}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}

import { useQueryClient } from "@tanstack/react-query";

function UserNameDisplay({ userId }: { userId: string }) {
    const queryClient = useQueryClient();
    const users = queryClient.getQueryData<any[]>(["/api/users"]) || [];
    const user = users.find((u: any) => u.id === userId);
    return <span className="font-semibold">{user ? user.name : (userId === 'system' ? 'System' : 'Anggota')}</span>;
}
