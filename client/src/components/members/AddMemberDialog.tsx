import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";

const userSchema = z.object({
    name: z.string().min(1, "Nama tidak boleh kosong"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    role: z.enum(["admin", "anggota"]),
    phone: z.string().optional(),
    skills: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface AddMemberDialogProps {
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function AddMemberDialog({ trigger, onSuccess }: AddMemberDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: "anggota",
            phone: "",
            skills: "",
        },
    });

    const createMutation = useMutation({
        mutationFn: async (values: UserFormData) => {
            const res = await apiRequest("POST", "/api/users", values);
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            toast({
                title: "Berhasil!",
                description: `User ${data.name} berhasil dibuat.`,
            });
            form.reset();
            setOpen(false);
            if (onSuccess) onSuccess();
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal",
                description: error.message || "Tidak bisa membuat user.",
                variant: "destructive",
            });
        },
    });

    function onSubmit(values: UserFormData) {
        createMutation.mutate(values);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="shadow-md shadow-primary/20">
                        <UserPlus className="mr-2 h-4 w-4" /> Tambah Anggota
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Tambah Anggota Baru</DialogTitle>
                    <DialogDescription>
                        Buat akun baru untuk anggota atau admin.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-20">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                            id="name"
                            placeholder="Contoh: Budi Santoso"
                            className="h-[48px] rounded-2xl"
                            {...form.register("name")}
                        />
                        {form.formState.errors.name && (
                            <p className="text-sm text-red-500">
                                {form.formState.errors.name.message}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="contoh@meraki.org"
                            className="h-[48px] rounded-2xl"
                            {...form.register("email")}
                        />
                        {form.formState.errors.email && (
                            <p className="text-sm text-red-500">
                                {form.formState.errors.email.message}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Minimal 6 karakter"
                            className="h-[48px] rounded-2xl"
                            {...form.register("password")}
                        />
                        {form.formState.errors.password && (
                            <p className="text-sm text-red-500">
                                {form.formState.errors.password.message}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Role (Debug Mode)</Label>
                        <Select
                            value={form.watch("role")}
                            onValueChange={(value) =>
                                form.setValue("role", value as "admin" | "anggota")
                            }
                        >
                            <SelectTrigger className="h-[48px] rounded-2xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin System</SelectItem>
                                <SelectItem value="anggota">Anggota Biasa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Nomor WhatsApp</Label>
                        <Input
                            id="phone"
                            placeholder="Contoh: 08123456789"
                            className="h-[48px] rounded-2xl"
                            {...form.register("phone")}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="skills">Keahlian (Pisahkan dengan koma)</Label>
                        <Input
                            id="skills"
                            placeholder="Contoh: Logistik, Pengajar, IT"
                            className="h-[48px] rounded-2xl"
                            {...form.register("skills")}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Membuat...
                                </>
                            ) : (
                                "Buat Akun"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
