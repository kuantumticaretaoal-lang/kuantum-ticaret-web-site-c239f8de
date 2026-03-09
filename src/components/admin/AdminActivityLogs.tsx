import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";

export const AdminActivityLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [adminProfiles, setAdminProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const { data, error } = await (supabase as any)
      .from("admin_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) {
      setLogs(data);
      // Load admin profiles
      const adminIds = [...new Set(data.map((l: any) => l.admin_id))];
      const profiles: Record<string, string> = {};
      for (const id of adminIds) {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", id)
          .maybeSingle();
        if (profile) {
          profiles[id as string] = `${profile.first_name} ${profile.last_name}`;
        }
      }
      setAdminProfiles(profiles);
    }
    setLoading(false);
  };

  const getActionColor = (type: string) => {
    if (type.includes("create") || type.includes("add")) return "default";
    if (type.includes("update") || type.includes("edit")) return "secondary";
    if (type.includes("delete") || type.includes("remove")) return "destructive";
    return "outline";
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      create: "Oluşturma",
      update: "Güncelleme",
      delete: "Silme",
      status_change: "Durum Değişikliği",
      login: "Giriş",
      export: "Dışa Aktarma",
    };
    return labels[type] || type;
  };

  const filteredLogs = filter === "all" ? logs : logs.filter((l) => l.action_type === filter);
  const actionTypes = [...new Set(logs.map((l) => l.action_type))];

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Aktivite Logları
          </CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {actionTypes.map((type) => (
                <SelectItem key={type} value={type}>{getActionLabel(type)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Henüz aktivite kaydı bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Yönetici</TableHead>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Tablo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("tr-TR")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {adminProfiles[log.admin_id] || log.admin_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.action_type) as any}>
                        {getActionLabel(log.action_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">
                      {log.action_description}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.target_table || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
