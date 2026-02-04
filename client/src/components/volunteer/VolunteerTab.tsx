import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
    Plus, Users, Clock, Pencil, Trash2, Upload, Loader2, ChevronRight,
    ArrowUpRight, Check, Link2, MessageCircle, CalendarCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VolunteerSkeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/utils-image";
import { type Volunteer } from "@shared/schema";

export default function VolunteerTab({ isAdmin }: { isAdmin: boolean }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const volunteerFileInputRef = useRef<HTMLInputElement>(null);

    const [isAddingVolunteer, setIsAddingVolunteer] = useState(false);
    const [editingVolunteerId, setEditingVolunteerId] = useState<string | null>(null);
    const [isProcessingVolunteerImage, setIsProcessingVolunteerImage] = useState(false);
    const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
    const [volunteerCopied, setVolunteerCopied] = useState(false);

    const [volunteerForm, setVolunteerForm] = useState({
        title: "",
        description: "",
        requirements: "",
        registrationLink: "",
        status: "open",
        imageUrl: "",
        deadline: format(new Date(), "yyyy-MM-dd")
    });

    const { data: volunteers = [], isLoading: isVolunteersLoading } = useQuery<Volunteer[]>({
        queryKey: ["/api/volunteers"],
    });

    const createVolunteerMutation = useMutation({
        mutationFn: async (data: any) => {
            const url = editingVolunteerId ? `/api/volunteers/${editingVolunteerId}` : "/api/volunteers";
            const method = editingVolunteerId ? "PATCH" : "POST";
            const payload = {
                ...data,
                deadline: data.deadline ? new Date(data.deadline).toISOString() : new Date().toISOString()
            };
            const res = await apiRequest(method, url, payload);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
            toast({
                title: "Berhasil",
                description: editingVolunteerId ? "Program berhasil diperbarui" : "Program volunteer baru telah diterbitkan.",
            });
            resetForm();
        },
        onError: (error: any) => {
            toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
        }
    });

    const updateVolunteerStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const res = await apiRequest("PATCH", `/api/volunteers/${id}`, { status });
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
            const statusLabels: Record<string, string> = {
                open: "Dibuka Kembali",
                paused: "Ditutup Sementara",
                closed: "Ditutup Permanen"
            };
            toast({ title: "Status Diperbarui", description: `Program ${statusLabels[data.status] || data.status}` });
        },
        onError: (error: any) => {
            toast({ title: "Gagal memproses", description: error.message, variant: "destructive" });
        }
    });

    const deleteVolunteerMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/volunteers/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
            toast({ title: "Berhasil", description: "Program telah dihapus" });
        },
        onError: (error: any) => {
            toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
        }
    });

    const resetForm = () => {
        setVolunteerForm({
            title: "",
            description: "",
            requirements: "",
            registrationLink: "",
            status: "open",
            imageUrl: "",
            deadline: format(new Date(), "yyyy-MM-dd")
        });
        setEditingVolunteerId(null);
        setIsAddingVolunteer(false);
        if (volunteerFileInputRef.current) volunteerFileInputRef.current.value = "";
    };

    const handleVolunteerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "File Terlalu Besar", description: "Maksimal ukuran gambar adalah 5MB.", variant: "destructive" });
            return;
        }
        setIsProcessingVolunteerImage(true);
        try {
            const compressedBase64 = await compressImage(file, 1024, 0.7);
            setVolunteerForm(prev => ({ ...prev, imageUrl: compressedBase64 }));
        } catch (error) {
            toast({ title: "Gagal memproses gambar", variant: "destructive" });
        } finally {
            setIsProcessingVolunteerImage(false);
        }
    };

    const getSafeUrl = (url: string) => {
        if (!url) return "#";
        return url.startsWith('http') ? url : `https://${url}`;
    };

    const handleCopyVolunteerLink = (url: string) => {
        navigator.clipboard.writeText(getSafeUrl(url));
        setVolunteerCopied(true);
        setTimeout(() => setVolunteerCopied(false), 2000);
        toast({ title: "Link Berhasil Disalin!" });
    };

    return (
        <div className="space-y-6">
            {/* Header Admin */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Volunteer</h2>
                    <p className="text-slate-500 text-sm font-medium">Publikasikan program relawan terbaru untuk komunitas.</p>
                </div>
                {isAdmin && (
                    <Button
                        onClick={() => { resetForm(); setIsAddingVolunteer(true); }}
                        className="rounded-2xl h-12 px-6 font-bold shadow-soft gap-2"
                    >
                        <Plus className="w-5 h-5" /> Buat Program Baru
                    </Button>
                )}
            </div>

            {/* Form Tambah/Edit */}
            {isAddingVolunteer && (
                <Card className="rounded-[2.5rem] border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden shadow-strong animate-in fade-in slide-in-from-top-4 duration-500">
                    <CardHeader>
                        <CardTitle>{editingVolunteerId ? "Edit Program" : "Publikasi Program Baru"}</CardTitle>
                        <CardDescription>Isi detail program volunteer secara lengkap agar menarik minat calon relawan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => { e.preventDefault(); createVolunteerMutation.mutate(volunteerForm); }} className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Nama Kegiatan</Label>
                                    <Input
                                        placeholder="Contoh: Meraki Mengajar #3"
                                        value={volunteerForm.title}
                                        onChange={(e) => setVolunteerForm({ ...volunteerForm, title: e.target.value })}
                                        required
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Deadline Pendaftaran</Label>
                                    <Input
                                        type="date"
                                        value={volunteerForm.deadline}
                                        onChange={(e) => setVolunteerForm({ ...volunteerForm, deadline: e.target.value })}
                                        required
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Deskripsi Singkat</Label>
                                <Textarea
                                    placeholder="Jelaskan detail kegiatan..."
                                    className="min-h-[100px] bg-background rounded-xl"
                                    value={volunteerForm.description}
                                    onChange={(e) => setVolunteerForm({ ...volunteerForm, description: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Persyaratan (Pisahkan dengan koma)</Label>
                                <Input
                                    placeholder="Contoh: Minimal 18 tahun, bersedia komitmen..."
                                    value={volunteerForm.requirements}
                                    onChange={(e) => setVolunteerForm({ ...volunteerForm, requirements: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Link Pendaftaran (G-Form/WA)</Label>
                                <Input
                                    placeholder="https://google.form/..."
                                    value={volunteerForm.registrationLink}
                                    onChange={(e) => setVolunteerForm({ ...volunteerForm, registrationLink: e.target.value })}
                                    required
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Foto Unggulan (Maks 5MB)</Label>
                                <div className="flex items-center gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-24 border-dashed border-2 flex flex-col gap-2 hover:bg-primary/5 rounded-2xl"
                                        onClick={() => volunteerFileInputRef.current?.click()}
                                        disabled={isProcessingVolunteerImage}
                                    >
                                        {isProcessingVolunteerImage ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                                        <span className="text-xs font-semibold">{volunteerForm.imageUrl ? 'Ganti Foto' : 'Pilih Foto Landscape'}</span>
                                    </Button>
                                    <input type="file" ref={volunteerFileInputRef} className="hidden" accept="image/*" onChange={handleVolunteerImageUpload} />
                                    {volunteerForm.imageUrl && (
                                        <div className="w-32 h-20 rounded-xl overflow-hidden border-2 border-primary/20 shadow-sm shrink-0">
                                            <img src={volunteerForm.imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" type="button" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setIsAddingVolunteer(false)}>Batal</Button>
                                <Button type="submit" className="flex-[2] rounded-xl h-12 font-bold shadow-soft" disabled={createVolunteerMutation.isPending}>
                                    {createVolunteerMutation.isPending ? "Menyimpan..." : editingVolunteerId ? "Simpan Perubahan" : "Posting Ke Feed"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Feed Layout */}
            <div className="space-y-6">
                {isVolunteersLoading ? (
                    <> <VolunteerSkeleton /> <VolunteerSkeleton /> </>
                ) : volunteers.length === 0 ? (
                    <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-primary/20">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground font-medium">Belum ada program volunteer terbuka.</p>
                    </div>
                ) : (
                    volunteers.map((item) => {
                        const isExpired = new Date(item.deadline) < new Date();
                        const cardStatus = isExpired ? 'closed' : item.status;

                        return (
                            <Card key={item.id} className={`relative bg-white rounded-3xl border border-primary/5 shadow-soft overflow-hidden group hover:shadow-xl transition-all duration-300 ${cardStatus === 'closed' ? 'grayscale opacity-80' : ''}`}>
                                <div className="flex flex-col md:flex-row gap-0 sm:gap-6 p-1 sm:p-4 text-left">
                                    <div className="w-full md:w-72 aspect-video rounded-2xl overflow-hidden shadow-inner flex-shrink-0 bg-muted relative min-h-[120px]">
                                        <img src={item.imageUrl || "https://images.unsplash.com/photo-1559027615-cd264c707af2?auto=format&fit=crop&q=80&w=800"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <Badge className={`border-none shadow-lg px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${cardStatus === 'open' ? 'bg-green-500 text-white' : cardStatus === 'paused' ? 'bg-yellow-500 text-white' : 'bg-slate-600 text-white'}`}>
                                                {isExpired ? 'Selesai' : cardStatus === 'open' ? 'Aktif' : cardStatus === 'paused' ? 'Ditunda' : 'Ditutup'}
                                            </Badge>
                                        </div>

                                        {isAdmin && (
                                            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <Button
                                                    size="icon" variant="secondary" className="h-8 w-8 bg-white/95 backdrop-blur shadow-soft hover:bg-white text-primary rounded-lg border border-primary/10"
                                                    onClick={() => {
                                                        setEditingVolunteerId(item.id);
                                                        setVolunteerForm({
                                                            title: item.title, description: item.description, requirements: item.requirements,
                                                            registrationLink: item.registrationLink, status: item.status, imageUrl: item.imageUrl || "",
                                                            deadline: format(new Date(item.deadline), "yyyy-MM-dd")
                                                        });
                                                        setIsAddingVolunteer(true);
                                                    }}
                                                > <Pencil className="w-3 h-3" /> </Button>
                                                <Button
                                                    size="icon" variant="secondary" className="h-8 w-8 bg-white/95 backdrop-blur shadow-soft hover:bg-destructive hover:text-white text-destructive rounded-lg border border-destructive/10"
                                                    onClick={() => deleteVolunteerMutation.mutate(item.id)}
                                                > <Trash2 className="w-3 h-3" /> </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-4 pr-4 px-4 sm:px-0">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-primary/60">
                                                <Clock className="w-3 h-3" /> Deadline: {format(new Date(item.deadline), "dd MMMM yyyy", { locale: idLocale })}
                                                {isExpired && <span className="text-destructive font-black ml-2 animate-pulse">(X)</span>}
                                            </div>
                                            <h3 className="text-2xl font-black mb-3 group-hover:text-primary transition-colors leading-tight">{item.title}</h3>
                                            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-4">{item.description}</p>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {item.requirements.split(',').slice(0, 3).map((req, i) => (
                                                    <Badge key={i} variant="outline" className="bg-primary/5 border-primary/10 text-[10px] py-0 px-2 rounded-md">{req.trim()}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                                            <div className="flex items-center text-slate-500 text-[11px] font-medium">
                                                <Clock className="w-3.5 h-3.5 mr-1.5 text-primary/60" />
                                                <span>Batas: {format(new Date(item.deadline), "dd MMM yyyy", { locale: idLocale })}</span>
                                            </div>
                                            <Button
                                                variant="link" className="p-0 h-[48px] min-w-[48px] font-bold text-[#2563eb] hover:no-underline flex items-center text-sm group/btn"
                                                onClick={() => {
                                                    if (window.navigator.vibrate) window.navigator.vibrate(10);
                                                    setSelectedVolunteer(item);
                                                }}
                                            >
                                                Daftar Sekarang <ChevronRight className="w-4 h-4 ml-0.5 transition-transform group-hover/btn:translate-x-1" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="flex items-center justify-center gap-4 py-3 bg-slate-50/80 backdrop-blur-sm border-t border-dashed border-primary/10">
                                        <Button onClick={() => updateVolunteerStatusMutation.mutate({ id: item.id, status: 'open' })} size="sm" variant="ghost" className={`text-[10px] h-8 rounded-lg font-bold ${item.status === 'open' ? 'bg-green-100 text-green-700' : 'hover:bg-green-50 text-slate-500'}`}> Buka </Button>
                                        <Button onClick={() => updateVolunteerStatusMutation.mutate({ id: item.id, status: 'paused' })} size="sm" variant="ghost" className={`text-[10px] h-8 rounded-lg font-bold ${item.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-yellow-50 text-slate-500'}`}> Jeda </Button>
                                        <Button onClick={() => updateVolunteerStatusMutation.mutate({ id: item.id, status: 'closed' })} size="sm" variant="ghost" className={`text-[10px] h-8 rounded-lg font-bold ${item.status === 'closed' ? 'bg-slate-200 text-slate-700' : 'hover:bg-slate-100 text-slate-500'}`}> Tutup </Button>
                                    </div>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Detail Dialog */}
            <Dialog open={!!selectedVolunteer} onOpenChange={(open) => !open && setSelectedVolunteer(null)}>
                <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden h-[85dvh] sm:h-auto sm:max-h-[85dvh] flex flex-col border-none shadow-strong rounded-3xl bg-white">
                    {selectedVolunteer && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar pb-12 text-left">
                            <div className="w-full bg-slate-900/5 flex items-center justify-center border-b border-slate-100 min-h-[300px]">
                                {selectedVolunteer.imageUrl ? <img src={selectedVolunteer.imageUrl} className="block w-full h-auto max-h-[60vh] object-contain mx-auto" /> : <div className="py-24 w-full flex items-center justify-center"><Users className="w-20 h-20 text-primary/20" /></div>}
                            </div>
                            <div className="p-8 md:p-12 max-w-3xl mx-auto">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Program Volunteer</span>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><Clock className="w-3.5 h-3.5" /> Batas: {format(new Date(selectedVolunteer.deadline), "dd MMMM yyyy", { locale: idLocale })}</div>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-heading font-black text-slate-900 leading-[1.1] mb-10 tracking-tight">{selectedVolunteer.title}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-8 border-y border-slate-100 mb-12">
                                    <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">M</div><div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Penyelenggara</span><p className="text-base font-bold text-slate-900 leading-tight">Admin Meraki Berbagi</p></div></div>
                                    <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><CalendarCheck className="w-6 h-6" /></div><div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Diterbitkan</span><p className="text-base font-bold text-slate-900 leading-tight">{format(new Date(selectedVolunteer.createdAt || new Date()), "EEEE, dd MMMM yyyy", { locale: idLocale })}</p></div></div>
                                </div>
                                <div className="flex flex-col gap-8">
                                    <div className="flex items-center gap-3"><div className="h-1 w-10 bg-primary rounded-full" /><span className="font-extrabold text-slate-900 tracking-[0.2em] uppercase text-[10px]">DETAIL KEGIATAN</span></div>
                                    <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-[1.8] whitespace-pre-wrap font-medium break-words">{selectedVolunteer.description}</div>
                                    {selectedVolunteer.requirements && (
                                        <div className="mt-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Check className="w-5 h-5 text-green-500" /> Persyaratan</h4>
                                            <div className="flex flex-wrap gap-2">{selectedVolunteer.requirements.split(',').map((req, i) => <Badge key={i} variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold px-3 py-1 rounded-lg">{req.trim()}</Badge>)}</div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-12">
                                    <Button
                                        className="w-full h-16 rounded-2xl font-black text-lg shadow-strong bg-[#2563eb] hover:bg-blue-700 transition-all gap-3"
                                        onClick={() => {
                                            if (window.navigator.vibrate) window.navigator.vibrate(10);
                                            window.open(getSafeUrl(selectedVolunteer.registrationLink), '_blank', 'noopener,noreferrer');
                                        }}
                                    > Klik di Sini untuk Daftar <ArrowUpRight className="w-6 h-6" /> </Button>
                                </div>
                                <div className="mt-12 pt-10 border-t border-slate-100 flex flex-col gap-4">
                                    <p className="text-sm font-bold text-slate-700">Bagikan Pendaftaran Ke :</p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Button variant="outline" className="flex-1 rounded-2xl gap-3 border-slate-200 justify-center h-14 px-8 hover:bg-slate-50 font-bold text-slate-700 shadow-sm" onClick={() => handleCopyVolunteerLink(selectedVolunteer.registrationLink)}>
                                            {volunteerCopied ? <><Check className="w-5 h-5 text-green-500" /> Tersalin!</> : <><Link2 className="w-5 h-5 text-primary" /> Salin Link</>}
                                        </Button>
                                        <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`*Ayo Jadi Bagian dari Kebaikan!* 🌟\n\nProgram: ${selectedVolunteer.title}\n\nDaftar di sini: ${getSafeUrl(selectedVolunteer.registrationLink)}`)}`} target="_blank" className="flex-1">
                                            <Button variant="outline" className="w-full rounded-2xl gap-3 border-green-200 bg-green-50 hover:bg-green-100 text-green-600 justify-center h-14 px-8 font-bold shadow-sm"><MessageCircle className="w-6 h-6 fill-green-600 text-white" /> WhatsApp</Button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
