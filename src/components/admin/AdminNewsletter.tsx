import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Mail, Trash2, Download, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const AdminNewsletter = () => {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await (supabase as any).from("newsletters").select("*").order("subscribed_at", { ascending: false });
    setSubscribers(data || []);
    setLoading(false);
  };

  const remove = async (id: string) => {
    await (supabase as any).from("newsletters").delete().eq("id", id);
    toast({ title: "Silindi" });
    load();
  };

  const exportEmails = () => {
    const active = subscribers.filter(s => s.is_active);
    const csv = "email\n" + active.map(s => s.email).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "newsletter_subscribers.csv"; a.click();
  };

  if (loading) return <p className="text-center py-8">Yükleniyor...</p>;

  const activeCount = subscribers.filter(s => s.is_active).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Bülten Aboneleri ({activeCount} aktif)</CardTitle>
        <Button size="sm" variant="outline" onClick={exportEmails}><Download className="h-4 w-4 mr-1" /> CSV İndir</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-posta</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.email}</TableCell>
                <TableCell className="text-sm">{new Date(s.subscribed_at).toLocaleDateString("tr-TR")}</TableCell>
                <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Aktif" : "Pasif"}</Badge></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
