export interface FinancialTransaction {
    id: string;
    userId: string;
    date: string | Date;
    amount: number;
    type: 'in' | 'out';
    category: string;
    status: string;
}

/**
 * Calculates the financial runway in months
 * @param balance Current cash balance
 * @param transactions All transactions
 * @returns string representation of runway (e.g., "4.2" or "∞")
 */
export function calculateRunway(balance: number, transactions: any[]): string {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const totalExpenses = transactions
        .filter(t => t.status === 'verified' && new Date(t.date) >= threeMonthsAgo && t.type === 'out')
        .reduce((sum, t) => sum + t.amount, 0);

    const avgMonthlyExpense = totalExpenses / 3;

    // ✅ Requirement: Jika saldo Rp 0 atau pengeluaran tidak ada, jangan tampilkan tak terhingga
    if (balance <= 0 || avgMonthlyExpense <= 0) return "Input Data untuk Analisis";

    return (balance / avgMonthlyExpense).toFixed(1) + " Bulan";
}
