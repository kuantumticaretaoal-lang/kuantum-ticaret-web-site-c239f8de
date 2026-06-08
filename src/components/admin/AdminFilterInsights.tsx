import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Filter, MousePointerClick, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilterEvent {
  id: string;
  event_type: string;
  filter_key: string;
  filter_value: string | null;
  result_count: number | null;
  created_at: string;
}

const labelMap: Record<string, string> = {
  category: "Kategori",
  promotion: "Promosyon",
  sort: "Sıralama",
  in_stock: "Sadece Stokta",
  price: "Fiyat",
  search: "Arama",
  all: "Tümünü Temizle",
  page: "Sonuç",
};

export const AdminFilterInsights = () => {
  const [events, setEvents] = useState<FilterEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("filter_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setEvents(data || []);
      setLoading(false);
    })();
  }, []);

  const summary = events.reduce<Record<string, { count: number; values: Record<string, number> }>>((acc, e) => {
    const k = e.filter_key;
    if (!acc[k]) acc[k] = { count: 0, values: {} };
    acc[k].count++;
    const v = e.filter_value || "(boş)";
    acc[k].values[v] = (acc[k].values[v] || 0) + 1;
    return acc;
  }, {});

  const sortedSummary = Object.entries(summary).sort((a, b) => b[1].count - a[1].count);
  const totalEvents = events.length;
  const clears = events.filter(e => e.event_type === "clear").length;
  const chipRemoves = events.filter(e => e.event_type === "chip_remove").length;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Toplam Etkileşim</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <MousePointerClick className="h-6 w-6 text-primary" />{totalEvents}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Çip Kaldırma</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-amber-500" />{chipRemoves}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tümünü Temizle</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Filter className="h-6 w-6 text-destructive" />{clears}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>En Çok Kullanılan Filtreler</CardTitle>
          <CardDescription>Hangi filtre/değer kombinasyonları daha çok ilgi görüyor?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz etkileşim verisi yok.</p>
          ) : sortedSummary.map(([key, info]) => (
            <div key={key} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{labelMap[key] || key}</h3>
                <Badge variant="secondary">{info.count} tıklama</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(info.values)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([v, c]) => (
                    <Badge key={v} variant="outline" className="text-xs">{v} — {c}</Badge>
                  ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son Olaylar</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[380px]">
            <div className="space-y-1">
              {events.slice(0, 100).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm border-b py-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{e.event_type}</Badge>
                    <span className="font-medium">{labelMap[e.filter_key] || e.filter_key}</span>
                    {e.filter_value && <span className="text-muted-foreground">→ {e.filter_value}</span>}
                    {e.result_count != null && <span className="text-xs text-muted-foreground">({e.result_count} sonuç)</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("tr-TR")}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFilterInsights;
