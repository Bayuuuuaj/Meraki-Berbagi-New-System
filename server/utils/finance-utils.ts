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
        .filter(t => new Date(t.date) >= threeMonthsAgo && t.type === 'out')
        .reduce((sum, t) => sum + t.amount, 0);

    const avgMonthlyExpense = totalExpenses / 3;

    if (avgMonthlyExpense <= 0) return "∞";
    return (balance / avgMonthlyExpense).toFixed(1);
}
