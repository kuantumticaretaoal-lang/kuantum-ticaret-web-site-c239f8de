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
    const { data, error } = await (supabase as any)
      .from("visitor_analytics")
      .select("*")
      .order("visited_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading analytics:", error);
      setAnalytics([]);
      return;
    }

    if (data) {
      // Enrich with profile names without relying on FK joins
      const userIds = Array.from(new Set((data || [])
        .map((v: any) => v.user_id)
        .filter((id: any): id is string => !!id)));

      let profilesMap: Record<string, { first_name: string; last_name: string }> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await (supabase as any)
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);
        profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
          acc[p.id] = { first_name: p.first_name, last_name: p.last_name };
          return acc;
        }, {} as Record<string, { first_name: string; last_name: string }>);
      }

      const enriched = (data || []).map((v: any) => ({ ...v, profile: v.user_id ? profilesMap[v.user_id] : null }));
      setAnalytics(enriched);
      
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const onlineVisitors = enriched.filter((v: any) => {
        const visitTime = new Date(v.visited_at);
        return visitTime > fiveMinutesAgo && !v.left_at;
      }).length;

      const durations = enriched
        .filter((v: any) => v.duration)
        .map((v: any) => v.duration);
      const avgDur = durations.length > 0
        ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
        : 0;

      setStats({
        online: onlineVisitors,
        lastVisit: enriched.length > 0 ? new Date(enriched[0].visited_at).toLocaleString("tr-TR") : "-",
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
              {analytics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Henüz ziyaretçi kaydı yok
                  </TableCell>
                </TableRow>
              ) : (
                analytics.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell>
                      {visit.profile?.first_name && visit.profile?.last_name
                        ? `${visit.profile.first_name} ${visit.profile.last_name}`
                        : "Misafir"}
                    </TableCell>
                    <TableCell>{visit.page_path}</TableCell>
                    <TableCell>{new Date(visit.visited_at).toLocaleString("tr-TR")}</TableCell>
                    <TableCell>{visit.duration ? `${Math.round(visit.duration / 60)} dk` : "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
