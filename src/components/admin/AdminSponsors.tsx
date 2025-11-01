import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const AdminSponsors = () => {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [newSponsor, setNewSponsor] = useState({ name: "", link: "", description: "", logo_url: "" });
  const { toast } = useToast();

  useEffect(() => {
    loadSponsors();

    const channel = supabase
      .channel("sponsors-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsors" }, () => {
        loadSponsors();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSponsors = async () => {
    const { data } = await (supabase as any).from("sponsors").select("*").order("created_at", { ascending: false });
    if (data) setSponsors(data);
  };

  const addSponsor = async () => {
    if (!newSponsor.name) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sponsor adı zorunludur",
      });
      return;
    }

    const { error } = await (supabase as any).from("sponsors").insert(newSponsor);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sponsor eklenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Sponsor eklendi",
      });
      setNewSponsor({ name: "", link: "", description: "", logo_url: "" });
      loadSponsors();
    }
  };

  const deleteSponsor = async (id: string) => {
    const { error } = await (supabase as any).from("sponsors").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sponsor silinemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Sponsor silindi",
      });
      loadSponsors();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Sponsorlar</span>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Yeni Sponsor Ekle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Sponsor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Sponsor Adı *</Label>
                  <Input
                    value={newSponsor.name}
                    onChange={(e) => setNewSponsor({ ...newSponsor, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Link</Label>
                  <Input
                    value={newSponsor.link}
                    onChange={(e) => setNewSponsor({ ...newSponsor, link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Açıklama</Label>
                  <Textarea
                    value={newSponsor.description}
                    onChange={(e) => setNewSponsor({ ...newSponsor, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Logo URL</Label>
                  <Input
                    value={newSponsor.logo_url}
                    onChange={(e) => setNewSponsor({ ...newSponsor, logo_url: e.target.value })}
                    placeholder="Logo URL"
                  />
                </div>
                <Button onClick={addSponsor} className="w-full">
                  Ekle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sponsors.map((sponsor) => (
              <TableRow key={sponsor.id}>
                <TableCell>{sponsor.name}</TableCell>
                <TableCell>{sponsor.link || "-"}</TableCell>
                <TableCell>{sponsor.description || "-"}</TableCell>
                <TableCell>
                  <Button size="sm" variant="destructive" onClick={() => deleteSponsor(sponsor.id)}>
                    Sil
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
