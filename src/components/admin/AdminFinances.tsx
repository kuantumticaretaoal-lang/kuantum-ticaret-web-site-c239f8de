import { useState } from "react";
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
import { exportToExcel, formatDateForExport, formatCurrencyForExport } from "@/lib/excel-export";
import { Download } from "lucide-react";
import { useFinances } from "./finances/useFinances";
import { DeleteExpenseWithVerificationDialog } from "./finances/DeleteExpenseWithVerificationDialog";

export const AdminFinances = () => {
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", type: "expense" });
  const { toast } = useToast();

  const { transactions, stats, reload } = useFinances();

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
      reload();
    }
  };

  const exportFinances = () => {
    const exportData = transactions.map((expense) => ({
      "Tarih": new Date(expense.created_at).toLocaleDateString("tr-TR"),
      "Açıklama": expense.description,
      "Tür": expense.type === "income" ? "Gelir" : "Gider",
      "Tutar": formatCurrencyForExport(expense.amount),
    }));
    exportToExcel(exportData, 'gelir-gider-raporu', 'Finansal Rapor');
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
            <div className="flex gap-2">
              <Button onClick={exportFinances} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Excel İndir
              </Button>
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
            </div>
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
              {transactions.map((expense) => (
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
                      {Number(expense.amount).toFixed(2)} ₺
                    </span>
                  </TableCell>
                  <TableCell>
                    {!expense.order_id && (
                      <DeleteExpenseWithVerificationDialog
                        expenseId={expense.id}
                        onDeleted={reload}
                      />
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
