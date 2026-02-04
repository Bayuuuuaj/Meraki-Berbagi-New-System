import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { IntelligenceData } from './intelligence-service.ts';

// Meraki Berbagi Brand Colors (as tuples for jsPDF)
const MERAKI_BLUE: [number, number, number] = [37, 99, 235]; // #2563eb
const MERAKI_BLUE_LIGHT: [number, number, number] = [219, 234, 254]; // #dbeafe

/**
 * Generate Intelligence Report PDF
 * Uses helvetica font for small file size
 * Follows Meraki Berbagi branding with #2563eb primary color
 */
export function generateIntelligencePDF(intelligenceData: IntelligenceData): Buffer {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // ===== HEADER =====
    doc.setFillColor(...MERAKI_BLUE);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN INTELLIGENCE DASHBOARD', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Meraki Berbagi - Organisasi Sosial', pageWidth / 2, 25, { align: 'center' });

    yPosition = 45;

    // ===== METADATA =====
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(`Tanggal Dibuat: ${formattedDate} pukul ${formattedTime}`, 14, yPosition);
    yPosition += 10;

    // ===== EXECUTIVE SUMMARY =====
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MERAKI_BLUE);
    doc.text('RINGKASAN EKSEKUTIF', 14, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const summaryData = [
        ['Total Transaksi', intelligenceData.summary.totalTransactions.toString()],
        ['Transaksi Mencurigakan', intelligenceData.summary.suspiciousTransactions.toString()],
        ['Total Anggota', intelligenceData.summary.totalMembers.toString()],
        ['Tingkat Kepatuhan', `${intelligenceData.summary.complianceRate}%`],
        ['Tren Keuangan', intelligenceData.summary.financialTrend === 'positive' ? 'Positif' :
            intelligenceData.summary.financialTrend === 'stable' ? 'Stabil' : 'Negatif']
    ];

    autoTable(doc, {
        startY: yPosition,
        head: [['Metrik', 'Nilai']],
        body: summaryData,
        theme: 'grid',
        headStyles: {
            fillColor: MERAKI_BLUE,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
        },
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 3
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60 },
            1: { halign: 'right' }
        }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // ===== RISK SCORES =====
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MERAKI_BLUE);
    doc.text('SKOR RISIKO ORGANISASI', 14, yPosition);
    yPosition += 8;

    const riskData = [
        ['Risiko Keseluruhan', intelligenceData.riskScore.overall.toString(), intelligenceData.riskScore.details.overall],
        ['Risiko Keuangan', intelligenceData.riskScore.financial.toString(), intelligenceData.riskScore.details.financial],
        ['Risiko Kepatuhan', intelligenceData.riskScore.compliance.toString(), intelligenceData.riskScore.details.compliance],
        ['Risiko Operasional', intelligenceData.riskScore.operational.toString(), intelligenceData.riskScore.details.operational],
        ['Risiko Dokumen', intelligenceData.riskScore.document.toString(), intelligenceData.riskScore.details.document]
    ];

    autoTable(doc, {
        startY: yPosition,
        head: [['Kategori', 'Skor', 'Keterangan']],
        body: riskData,
        theme: 'grid',
        headStyles: {
            fillColor: MERAKI_BLUE,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
        },
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 3
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { halign: 'center', cellWidth: 20 },
            2: { cellWidth: 'auto' }
        }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // ===== EFFICIENCY SCORE =====
    if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MERAKI_BLUE);
    doc.text('SKOR EFISIENSI PROGRAM', 14, yPosition);
    yPosition += 8;

    const efficiencyData = [
        ['Skor Efisiensi', `${intelligenceData.efficiencyScore.score}%`],
        ['Status', intelligenceData.efficiencyScore.status === 'excellent' ? 'Sangat Baik' :
            intelligenceData.efficiencyScore.status === 'good' ? 'Baik' : 'Perlu Perbaikan'],
        ['Pengeluaran Program', `Rp ${intelligenceData.efficiencyScore.programSpending.toLocaleString('id-ID')}`],
        ['Pengeluaran Operasional', `Rp ${intelligenceData.efficiencyScore.operationalSpending.toLocaleString('id-ID')}`],
        ['Total Pengeluaran', `Rp ${intelligenceData.efficiencyScore.totalSpending.toLocaleString('id-ID')}`]
    ];

    autoTable(doc, {
        startY: yPosition,
        head: [['Metrik', 'Nilai']],
        body: efficiencyData,
        theme: 'grid',
        headStyles: {
            fillColor: MERAKI_BLUE,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
        },
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 3
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 70 },
            1: { halign: 'right' }
        }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // ===== ANOMALIES =====
    if (intelligenceData.anomalies.length > 0) {
        if (yPosition > 220) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MERAKI_BLUE);
        doc.text('TEMUAN AUDIT & ANOMALI', 14, yPosition);
        yPosition += 8;

        const anomalyData = intelligenceData.anomalies.map(anomaly => [
            anomaly.severity.toUpperCase(),
            anomaly.title,
            `Rp ${anomaly.amount.toLocaleString('id-ID')}`,
            anomaly.description.substring(0, 60) + (anomaly.description.length > 60 ? '...' : '')
        ]);

        autoTable(doc, {
            startY: yPosition,
            head: [['Tingkat', 'Judul', 'Nominal', 'Deskripsi']],
            body: anomalyData,
            theme: 'grid',
            headStyles: {
                fillColor: MERAKI_BLUE,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            styles: {
                font: 'helvetica',
                fontSize: 8,
                cellPadding: 2
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 25, halign: 'center' },
                1: { cellWidth: 45 },
                2: { cellWidth: 35, halign: 'right' },
                3: { cellWidth: 'auto' }
            }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // ===== ACTION PLAN =====
    if (intelligenceData.actionPlan.length > 0) {
        if (yPosition > 220) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MERAKI_BLUE);
        doc.text('RENCANA AKSI STRATEGIS', 14, yPosition);
        yPosition += 8;

        const actionData = intelligenceData.actionPlan.map((action, index) => [
            (index + 1).toString(),
            action
        ]);

        autoTable(doc, {
            startY: yPosition,
            head: [['No', 'Tindakan']],
            body: actionData,
            theme: 'grid',
            headStyles: {
                fillColor: MERAKI_BLUE,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10
            },
            styles: {
                font: 'helvetica',
                fontSize: 9,
                cellPadding: 3
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 15, halign: 'center' },
                1: { cellWidth: 'auto' }
            }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // ===== FOOTER =====
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.setFont('helvetica', 'italic');

        // Confidentiality notice
        doc.text('DOKUMEN RAHASIA - Hanya untuk internal Meraki Berbagi', pageWidth / 2, 285, { align: 'center' });

        // Page number
        doc.setFont('helvetica', 'normal');
        doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 14, 285, { align: 'right' });
    }

    // Convert to buffer for server response
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
}

/**
 * Generate filename for PDF export
 */
export function generatePDFFilename(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    return `Intelligence-Report-Meraki-${dateStr}-${timeStr}.pdf`;
}
