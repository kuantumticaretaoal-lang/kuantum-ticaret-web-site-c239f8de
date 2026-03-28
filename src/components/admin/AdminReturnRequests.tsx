import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { RotateCcw, Check, X } from "lucide-react";

export const AdminReturnRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data } = await (supabase as any)
      .from("return_requests")
      .select(`*, orders (order_code, total_amount, user_id, profiles:user_id (first_name, last_name, email))`)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string, orderCode: string) => {
    const note = adminNotes[id] || null;
    const { error } = await (supabase as any)
      .from("return_requests")
      .update({ status, admin_note: note, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Güncelleme başarısız" });
      return;
    }

    // Send notification to user
    const request = requests.find(r => r.id === id);
    if (request) {
      const statusText = status === "approved" ? "onaylandı" : "reddedildi";
      await (supabase as any).from("notifications").insert({
        user_id: request.orders?.user_id || request.user_id,
        message: `İade talebiniz (Sipariş #${orderCode}) ${statusText}.${note ? ` Not: ${note}` : ""}`,
      });
    }

    await logAdminActivity("return_request_update", `İade talebi ${status} - Sipariş #${orderCode}`, "return_requests", id);
    toast({ title: "Başarılı", description: `İade talebi ${status === "approved" ? "onaylandı" : "reddedildi"}` });
    loadRequests();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Beklemede</Badge>;
      case "approved": return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Onaylandı</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Reddedildi</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <p className="text-center py-8">Yükleniyor...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          İade Talepleri ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Henüz iade talebi yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Sebep</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Admin Notu</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const profile = req.orders?.profiles;
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-sm">{req.orders?.order_code || "—"}</TableCell>
                      <TableCell>{profile ? `${profile.first_name} ${profile.last_name}` : "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{req.reason}</TableCell>
                      <TableCell className="text-sm">{format(new Date(req.created_at), "dd MMM yyyy", { locale: tr })}</TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell>
                        {req.status === "pending" ? (
                          <Textarea
                            placeholder="Admin notu..."
                            value={adminNotes[req.id] || ""}
                            onChange={(e) => setAdminNotes({ ...adminNotes, [req.id]: e.target.value })}
                            className="min-h-[60px] text-sm"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">{req.admin_note || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {req.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateStatus(req.id, "approved", req.orders?.order_code)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateStatus(req.id, "rejected", req.orders?.order_code)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
