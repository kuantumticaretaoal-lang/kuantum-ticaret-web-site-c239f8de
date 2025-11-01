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
  const [editingSponsor, setEditingSponsor] = useState<any>(null);
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

  const updateSponsor = async () => {
    if (!editingSponsor.name) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sponsor adı zorunludur",
      });
      return;
    }

    const { error } = await (supabase as any)
      .from("sponsors")
      .update({
        name: editingSponsor.name,
        link: editingSponsor.link,
        description: editingSponsor.description,
        logo_url: editingSponsor.logo_url,
      })
      .eq("id", editingSponsor.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sponsor güncellenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Sponsor güncellendi",
      });
      setEditingSponsor(null);
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
        <div className="mb-4 text-sm text-muted-foreground">
          Toplam {sponsors.length} sponsor
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Ad</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sponsors.map((sponsor) => (
              <TableRow key={sponsor.id}>
                <TableCell>
                  {sponsor.logo_url ? (
                    <img src={sponsor.logo_url} alt={sponsor.name} className="h-12 w-12 object-contain" />
                  ) : (
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs">
                      Logo Yok
                    </div>
                  )}
                </TableCell>
                <TableCell>{sponsor.name}</TableCell>
                <TableCell>{sponsor.link || "-"}</TableCell>
                <TableCell className="max-w-xs truncate">{sponsor.description || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingSponsor(sponsor)}
                        >
                          Düzenle
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Sponsor Düzenle</DialogTitle>
                        </DialogHeader>
                        {editingSponsor && (
                          <div className="space-y-4">
                            <div>
                              <Label>Sponsor Adı *</Label>
                              <Input
                                value={editingSponsor.name}
                                onChange={(e) => setEditingSponsor({ ...editingSponsor, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Link</Label>
                              <Input
                                value={editingSponsor.link || ""}
                                onChange={(e) => setEditingSponsor({ ...editingSponsor, link: e.target.value })}
                                placeholder="https://..."
                              />
                            </div>
                            <div>
                              <Label>Açıklama</Label>
                              <Textarea
                                value={editingSponsor.description || ""}
                                onChange={(e) => setEditingSponsor({ ...editingSponsor, description: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Logo URL</Label>
                              <Input
                                value={editingSponsor.logo_url || ""}
                                onChange={(e) => setEditingSponsor({ ...editingSponsor, logo_url: e.target.value })}
                                placeholder="Logo URL"
                              />
                            </div>
                            <Button onClick={updateSponsor} className="w-full">
                              Güncelle
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="destructive" onClick={() => deleteSponsor(sponsor.id)}>
                      Sil
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
