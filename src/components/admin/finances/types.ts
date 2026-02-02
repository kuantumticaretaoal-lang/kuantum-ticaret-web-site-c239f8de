export type FinanceTransactionType = "income" | "expense";

export type FinanceTransaction = {
  id: string;
  created_at: string;
  description: string;
  type: FinanceTransactionType;
  amount: number;
  order_id: string | null;
};

export type FinanceStats = {
  totalIncome: number;
  totalExpense: number;
  profit: number;
};
