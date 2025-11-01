import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [stats, setStats] = useState({ online: 0, lastVisit: "", avgDuration: 0 });

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    const { data } = await (supabase as any)
      .from("visitor_analytics")
      .select("*")
      .order("visited_at", { ascending: false })
      .limit(50);

    if (data) {
      setAnalytics(data);
      
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const onlineVisitors = data.filter((v) => {
        const visitTime = new Date(v.visited_at);
        return visitTime > fiveMinutesAgo && !v.left_at;
      }).length;

      const durations = data
        .filter((v) => v.duration)
        .map((v) => v.duration);
      const avgDur = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

      setStats({
        online: onlineVisitors,
        lastVisit: data.length > 0 ? new Date(data[0].visited_at).toLocaleString("tr-TR") : "-",
        avgDuration: Math.round(avgDur / 60),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Şu An Online</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.online}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son Ziyaret</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{stats.lastVisit}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ort. Süre</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgDuration} dk</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ziyaretçi Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Sayfa</TableHead>
                <TableHead>Ziyaret Zamanı</TableHead>
                <TableHead>Süre (dk)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell>
                    {visit.user_id ? "Kayıtlı Kullanıcı" : "Misafir"}
                  </TableCell>
                  <TableCell>{visit.page_path}</TableCell>
                  <TableCell>{new Date(visit.visited_at).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>{visit.duration ? Math.round(visit.duration / 60) : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
