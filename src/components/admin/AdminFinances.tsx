import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const AdminFinances = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", type: "expense" });
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, profit: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadFinances();

    const channel = supabase
      .channel("expenses-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        loadFinances();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadFinances();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadFinances = async () => {
    // Load manual expenses
    const { data: expensesData } = await (supabase as any)
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    // Load order incomes
    const { data: ordersData } = await (supabase as any)
      .from("orders")
      .select(`
        id,
        created_at,
        order_items(quantity, price)
      `)
      .in("status", ["confirmed", "preparing", "ready", "in_delivery", "delivered"]);

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;

    // Calculate from orders
    const orderIncomes = ordersData?.map((order: any) => {
      const orderTotal = order.order_items?.reduce(
        (sum: number, item: any) => sum + (item.quantity * parseFloat(item.price)),
        0
      ) || 0;
      totalIncome += orderTotal;
      return {
        id: order.id,
        description: `Sipariş #${order.id.slice(0, 8)}`,
        amount: orderTotal,
        type: "income",
        created_at: order.created_at,
      };
    }) || [];

    // Calculate from manual entries
    expensesData?.forEach((exp: any) => {
      const amount = parseFloat(exp.amount);
      if (exp.type === "income") {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }
    });

    // Combine and sort
    const allTransactions = [...orderIncomes, ...(expensesData || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setExpenses(allTransactions);
    setStats({
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
    });
  };

  const addExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen tüm alanları doldurun",
      });
      return;
    }

    const { error } = await (supabase as any).from("expenses").insert({
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      type: newExpense.type,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "İşlem eklenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "İşlem eklendi",
      });
      setNewExpense({ description: "", amount: "", type: "expense" });
    }
  };

  const deleteExpense = async (id: string) => {
    const { error } = await (supabase as any).from("expenses").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "İşlem silinemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "İşlem silindi",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Toplam Gelir</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {stats.totalIncome.toFixed(2)} ₺
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Toplam Gider</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {stats.totalExpense.toFixed(2)} ₺
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net Kar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${stats.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {stats.profit.toFixed(2)} ₺
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Gelir-Gider Geçmişi</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Manuel İşlem Ekle</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni İşlem</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Açıklama *</Label>
                    <Textarea
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder="İşlem açıklaması..."
                    />
                  </div>
                  <div>
                    <Label>Tutar *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Tür *</Label>
                    <Select
                      value={newExpense.type}
                      onValueChange={(value) => setNewExpense({ ...newExpense, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Gelir</SelectItem>
                        <SelectItem value="expense">Gider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addExpense} className="w-full">
                    Ekle
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{new Date(expense.created_at).toLocaleDateString("tr-TR")}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    <span className={expense.type === "income" ? "text-green-600" : "text-red-600"}>
                      {expense.type === "income" ? "Gelir" : "Gider"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={expense.type === "income" ? "text-green-600" : "text-red-600"}>
                      {expense.type === "income" ? "+" : "-"}
                      {parseFloat(expense.amount).toFixed(2)} ₺
                    </span>
                  </TableCell>
                  <TableCell>
                    {!expense.description.includes("Sipariş #") && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteExpense(expense.id)}
                      >
                        Sil
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
