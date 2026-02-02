import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceStats, FinanceTransaction } from "./types";

function computeStats(transactions: FinanceTransaction[]): FinanceStats {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") totalIncome += amt;
    else totalExpense += amt;
  }

  return {
    totalIncome,
    totalExpense,
    profit: totalIncome - totalExpense,
  };
}

export function useFinances() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("expenses")
      .select("id, created_at, description, type, amount, order_id")
      .order("created_at", { ascending: false });

    if (error) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const normalized: FinanceTransaction[] = (data || []).map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      description: row.description,
      type: row.type,
      amount: Number(row.amount),
      order_id: row.order_id ?? null,
    }));

    setTransactions(normalized);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("finances-expenses-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const stats = useMemo(() => computeStats(transactions), [transactions]);

  return {
    transactions,
    stats,
    loading,
    reload: load,
  };
}
