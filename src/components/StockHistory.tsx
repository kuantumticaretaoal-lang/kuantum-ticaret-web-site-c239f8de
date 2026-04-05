import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

interface StockHistoryProps {
  productId: string;
}

export const StockHistory = ({ productId }: StockHistoryProps) => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => { load(); }, [productId]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("stock_history")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory(data || []);
  };

  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4" /> Stok Geçmişi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {history.map(h => (
            <div key={h.id} className="flex items-center justify-between p-2 border rounded text-sm">
              <div>
                <Badge variant={h.change_amount > 0 ? "default" : "destructive"} className="text-xs mr-2">
                  {h.change_amount > 0 ? `+${h.change_amount}` : h.change_amount}
                </Badge>
                <span className="text-muted-foreground">{h.reason || "—"}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {h.previous_quantity} → {h.new_quantity} | {new Date(h.created_at).toLocaleString("tr-TR")}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
