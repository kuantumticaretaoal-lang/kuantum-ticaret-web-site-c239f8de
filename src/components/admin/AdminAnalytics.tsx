import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { logger } from "@/lib/logger";

export const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [stats, setStats] = useState({ 
    online: 0, 
    lastAdminVisit: "-", 
    lastOtherVisit: "-", 
    totalAdmin: 0,
    totalOthers: 0,
    avgDurationAll: 0,
    avgDurationExAdmin: 0,
  });

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
      .limit(200);

    if (error) {
      logger.error("Analytics yükleme hatası", error);
      setAnalytics([]);
      return;
    }

    if (data) {
      // Enrich with profile names
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

      // Fetch admin ids for breakdown
      const { data: adminRoles } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminSet = new Set((adminRoles || []).map((r: any) => r.user_id));

      const enriched = (data || []).map((v: any) => ({ ...v, profile: v.user_id ? profilesMap[v.user_id] : null }));
      setAnalytics(enriched);

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const onlineVisitors = enriched.filter((v: any) => {
        const visitTime = new Date(v.visited_at);
        return visitTime > fiveMinutesAgo && !v.left_at;
      }).length;

      const isAdminVisit = (v: any) => v.user_id && adminSet.has(v.user_id);

      const lastAdmin = enriched.find(isAdminVisit);
      const lastOther = enriched.find((v: any) => !isAdminVisit(v));

      const durationsAll = enriched.filter((v: any) => v.duration).map((v: any) => v.duration);
      const durationsOthers = enriched.filter((v: any) => v.duration && !isAdminVisit(v)).map((v: any) => v.duration);

      const avgAll = durationsAll.length > 0 ? (durationsAll.reduce((a: number, b: number) => a + b, 0) / durationsAll.length) : 0;
      const avgOthers = durationsOthers.length > 0 ? (durationsOthers.reduce((a: number, b: number) => a + b, 0) / durationsOthers.length) : 0;

      const totalAdmin = enriched.filter(isAdminVisit).length;
      const totalOthers = enriched.length - totalAdmin;

      setStats({
        online: onlineVisitors,
        lastAdminVisit: lastAdmin ? new Date(lastAdmin.visited_at).toLocaleString("tr-TR") : "-",
        lastOtherVisit: lastOther ? new Date(lastOther.visited_at).toLocaleString("tr-TR") : "-",
        totalAdmin,
        totalOthers,
        avgDurationAll: Math.round(avgAll / 60),
        avgDurationExAdmin: Math.round(avgOthers / 60),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <CardTitle>Son Ziyaret (Admin)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{stats.lastAdminVisit}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son Ziyaret (Diğer)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{stats.lastOtherVisit}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Toplam Ziyaret (Admin)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalAdmin}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Toplam Ziyaret (Diğer)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalOthers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ort. Süre (Tümü)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgDurationAll} dk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ort. Süre (Admin Hariç)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgDurationExAdmin} dk</p>
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
