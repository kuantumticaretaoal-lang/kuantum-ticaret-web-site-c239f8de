import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Download, FileJson, RefreshCw, Shield, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Row = {
  id: string; created_at: string; user_email: string | null; prompt: string;
  response: string | null; model: string | null; status_code: number | null;
  error_code: string | null; latency_ms: number | null; message_count: number | null;
  ip_address: string | null; user_agent: string | null;
};

const csvEscape = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/\r?\n/g, " ");
  return `"${s.replace(/"/g, '""')}"`;
};

export const AdminAdvisorAuditLog = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("security_advisor_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Yüklenemedi", description: error.message, variant: "destructive" });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.user_email, r.prompt, r.response, r.error_code, r.model].some((x) => (x || "").toLowerCase().includes(s));
  });

  const stats = {
    total: rows.length,
    errors: rows.filter((r) => r.error_code).length,
    avgLatency: rows.length ? Math.round(rows.reduce((a, r) => a + (r.latency_ms || 0), 0) / rows.length) : 0,
    uniqueUsers: new Set(rows.map((r) => r.user_email).filter(Boolean)).size,
  };

  const exportCSV = () => {
    const headers = ["created_at","user_email","model","status_code","error_code","latency_ms","message_count","ip_address","prompt","response"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push(headers.map((h) => csvEscape((r as any)[h])).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ai-guvenlik-denetim-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Dışa aktarıldı", description: `${filtered.length} kayıt CSV olarak indirildi.` });
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), stats, rows: filtered }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ai-guvenlik-denetim-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Dışa aktarıldı", description: `${filtered.length} kayıt JSON olarak indirildi.` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          AI Güvenlik Danışmanı Denetim Günlüğü
          <Badge variant="secondary" className="ml-2">{stats.total} kayıt</Badge>
        </CardTitle>
        <CardDescription>
          Her yapay zeka güvenlik danışmanı çalıştırması — istem, model yanıtı, durum kodu, hata kodu ve gecikme — kayıt altındadır. CSV/JSON olarak dışa aktarabilirsiniz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Toplam Çağrı" value={stats.total} />
          <Stat label="Hatalı" value={stats.errors} tone={stats.errors ? "warn" : "ok"} />
          <Stat label="Ortalama Gecikme" value={`${stats.avgLatency} ms`} />
          <Stat label="Tekil Kullanıcı" value={stats.uniqueUsers} />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="E-posta, prompt, hata kodu ara..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
            aria-label="Denetim günlüğü ara"
          />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Yenile
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON} disabled={!filtered.length}>
            <FileJson className="h-4 w-4 mr-1" /> JSON
          </Button>
          <Button variant="default" size="sm" onClick={exportCSV} disabled={!filtered.length} className="ml-auto">
            <Download className="h-4 w-4 mr-1" /> Güvenlik Raporunu İndir
          </Button>
        </div>

        <ScrollArea className="h-[520px] rounded-lg border">
          <div className="divide-y">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Henüz kayıt yok.</div>
            )}
            {filtered.map((r) => (
              <div key={r.id} className="p-3 hover:bg-muted/30">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-mono">{new Date(r.created_at).toLocaleString("tr-TR")}</span>
                  {r.user_email && <Badge variant="outline">{r.user_email}</Badge>}
                  {r.model && <Badge variant="secondary">{r.model}</Badge>}
                  <Badge variant={r.error_code ? "destructive" : "outline"}>
                    {r.error_code ? `HATA: ${r.error_code}` : `OK ${r.status_code ?? 200}`}
                  </Badge>
                  {r.latency_ms != null && <span>{r.latency_ms} ms</span>}
                  {r.message_count != null && <span>{r.message_count} mesaj</span>}
                </div>
                <div className="text-sm font-medium line-clamp-2 mb-1">
                  <span className="text-primary">Prompt:</span> {r.prompt}
                </div>
                {r.response && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">Yanıtı göster ({r.response.length} karakter)</summary>
                    <pre className="whitespace-pre-wrap mt-2 p-2 bg-muted rounded max-h-64 overflow-auto">{r.response}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" }) => (
  <div className={`rounded-lg border p-3 ${tone === "warn" ? "bg-destructive/10 border-destructive/30" : "bg-muted/30"}`}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default AdminAdvisorAuditLog;
