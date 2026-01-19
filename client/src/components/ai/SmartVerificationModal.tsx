import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Check, X, FileText, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SmartVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    receiptData: {
        id?: string;
        amount: number;
        category: string;
        date: string;
        merchantName?: string;
        proof?: string;
        aiNotes?: string;
        confidenceScore?: number;
    } | null;
    onVerify: (updatedData: any) => Promise<void>;
}

export default function SmartVerificationModal({
    isOpen,
    onClose,
    receiptData,
    onVerify
}: SmartVerificationModalProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (receiptData) {
            setFormData({
                amount: receiptData.amount || 0,
                category: receiptData.category || "Lain-lain",
                date: receiptData.date || format(new Date(), "yyyy-MM-dd"),
                merchantName: receiptData.merchantName || "",
            });
        }
    }, [receiptData]);

    const handleVerify = async () => {
        if (!formData.amount || formData.amount <= 0) {
            toast({ title: "Error", description: "Nominal harus lebih dari 0", variant: "destructive" });
            return;
        }

        setIsProcessing(true);
        try {
            await onVerify({ ...receiptData, ...formData });
            toast({ title: "Berhasil", description: "Transaksi telah diverifikasi oleh Bendahara." });
            onClose();
        } catch (error) {
            toast({ title: "Error", description: "Gagal memverifikasi transaksi", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!receiptData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-md border-primary/20">
                <DialogHeader className="p-6 pb-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-heading">Verifikasi AI Smart</DialogTitle>
                                <DialogDescription>Human-in-the-Loop: Tinjau hasil ekstraksi AI sebelum disimpan.</DialogDescription>
                            </div>
                        </div>
                        <Badge variant={receiptData.confidenceScore! > 0.7 ? "default" : "secondary"} className="text-xs py-1">
                            Confidence: {Math.round(receiptData.confidenceScore! * 100)}%
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden mt-6 border-t border-border/50">
                    {/* Left: Receipt Preview */}
                    <div className="w-full md:w-1/2 bg-muted/30 p-4 flex items-center justify-center overflow-hidden border-r border-border/50">
                        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-inner bg-black/5 border border-dashed border-muted-foreground/20">
                            {receiptData.proof ? (
                                <img
                                    src={receiptData.proof}
                                    alt="Foto Nota"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                                    <FileText className="w-12 h-12 opacity-20" />
                                    <p className="text-sm font-medium">Foto Nota Tidak Tersedia</p>
                                </div>
                            )}
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[10px] font-bold uppercase tracking-widest border border-white/10">
                                Original Proof
                            </div>
                        </div>
                    </div>

                    {/* Right: AI Extraction Form */}
                    <ScrollArea className="w-full md:w-1/2 p-6">
                        <div className="space-y-6">
                            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-primary uppercase tracking-tight">AI Note</p>
                                        <p className="text-sm text-foreground/80 italic mt-1 leading-relaxed">
                                            "{receiptData.aiNotes || "Data berhasil diekstrak dengan akurasi tinggi."}"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-5">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Merchant / Toko</Label>
                                    <Input
                                        value={formData?.merchantName}
                                        onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                                        className="h-11 bg-background/50 border-primary/10 focus:border-primary transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Nominal (Rp)</Label>
                                    <Input
                                        type="number"
                                        value={formData?.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
                                        className="h-11 bg-background/50 border-primary/10 focus:border-primary transition-all font-bold text-lg text-primary"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Kategori</Label>
                                        <select
                                            value={formData?.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full h-11 bg-background/50 border border-primary/10 rounded-md px-3 text-sm focus:border-primary transition-all outline-none"
                                        >
                                            {["Program Kerja", "Operasional", "Logistik", "Transportasi", "Konsumsi", "Lain-lain"].map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Tanggal</Label>
                                        <Input
                                            type="date"
                                            value={formData?.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="h-11 bg-background/50 border-primary/10 focus:border-primary transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 p-4 border border-dashed border-muted-foreground/20 rounded-xl bg-muted/5">
                                <p className="text-[10px] text-muted-foreground text-center font-medium leading-relaxed">
                                    Data ini akan masuk ke Laporan Keuangan resmi Meraki-Berbagi sebagai status <span className="text-foreground font-bold">TERVERIFIKASI</span> setelah anda menekan tombol Setujui.
                                </p>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="p-6 border-t border-border/50 gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isProcessing} className="flex-1 font-bold">
                        <X className="w-4 h-4 mr-2" /> Batal
                    </Button>
                    <Button onClick={handleVerify} disabled={isProcessing} className="flex-1 font-bold shadow-lg shadow-primary/20">
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                        Setujui & Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
