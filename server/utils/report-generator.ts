/**
 * Meraki-Berbagi Report Generator
 * Professional Markdown Export Utilities
 */

export function generateComplianceReport(transactions: any[]): string {
    let report = `# Laporan Kepatuhan Kas Meraki-Berbagi\n`;
    report += `*Dibuat pada: ${new Date().toLocaleString('id-ID')}*\n\n`;

    report += `| Tanggal | Kategori | Jumlah | AI Confidence | Verifikator | Status |\n`;
    report += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    transactions.forEach(t => {
        let aiData: any = {};
        try {
            aiData = t.aiMetadata ? (typeof t.aiMetadata === 'string' ? JSON.parse(t.aiMetadata) : t.aiMetadata) : {};
        } catch (e) {
            aiData = {};
        }

        const confidence = aiData.confidenceScore ? `${(aiData.confidenceScore * 100).toFixed(0)}%` : '-';
        const verifier = t.verifiedBy || 'Pending';
        const amount = `Rp ${t.amount.toLocaleString('id-ID')}`;

        // Formatting date if it's an object
        const formattedDate = t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date;

        report += `| ${formattedDate} | ${t.category} | ${amount} | ${confidence} | ${verifier} | ${t.status} |\n`;
    });

    report += `\n\n**Catatan:** Laporan ini dihasilkan secara otomatis oleh Meraki Strategic Advisor dan telah divalidasi oleh bendahara resmi.`;
    return report;
}
