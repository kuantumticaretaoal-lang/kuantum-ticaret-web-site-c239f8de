import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Edit2, Languages, RefreshCw } from "lucide-react";

interface Translation {
  id: string;
  language_code: string;
  translation_key: string;
  translation_value: string;
}

interface Language {
  code: string;
  name: string;
  native_name: string;
}

export const AdminTranslations = () => {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
  const [formData, setFormData] = useState({
    language_code: "tr",
    translation_key: "",
    translation_value: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [translationsRes, languagesRes] = await Promise.all([
      supabase.from("translations").select("*").order("translation_key"),
      supabase.from("supported_languages").select("code, name, native_name").eq("is_active", true),
    ]);

    if (translationsRes.data) setTranslations(translationsRes.data);
    if (languagesRes.data) setLanguages(languagesRes.data);
  };

  const filteredTranslations = translations.filter((t) => {
    const matchesLanguage = selectedLanguage === "all" || t.language_code === selectedLanguage;
    const matchesSearch =
      t.translation_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.translation_value.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLanguage && matchesSearch;
  });

  // Çevirileri anahtar bazında grupla
  const groupedTranslations = filteredTranslations.reduce((acc, t) => {
    if (!acc[t.translation_key]) {
      acc[t.translation_key] = {};
    }
    acc[t.translation_key][t.language_code] = t;
    return acc;
  }, {} as Record<string, Record<string, Translation>>);

  const handleSave = async () => {
    if (!formData.translation_key || !formData.translation_value) {
      toast({ variant: "destructive", title: "Hata", description: "Tüm alanları doldurun" });
      return;
    }

    if (editingTranslation) {
      const { error } = await supabase
        .from("translations")
        .update({
          translation_value: formData.translation_value,
        })
        .eq("id", editingTranslation.id);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: "Çeviri güncellenemedi" });
      } else {
        toast({ title: "Başarılı", description: "Çeviri güncellendi" });
        setEditingTranslation(null);
      }
    } else {
      const { error } = await supabase.from("translations").insert([formData]);

      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "Hata", description: "Bu anahtar zaten mevcut" });
        } else {
          toast({ variant: "destructive", title: "Hata", description: "Çeviri eklenemedi" });
        }
      } else {
        toast({ title: "Başarılı", description: "Çeviri eklendi" });
        setIsAddDialogOpen(false);
      }
    }

    setFormData({ language_code: "tr", translation_key: "", translation_value: "" });
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("translations").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Çeviri silinemedi" });
    } else {
      toast({ title: "Başarılı", description: "Çeviri silindi" });
      loadData();
    }
  };

  const handleEdit = (translation: Translation) => {
    setEditingTranslation(translation);
    setFormData({
      language_code: translation.language_code,
      translation_key: translation.translation_key,
      translation_value: translation.translation_value,
    });
  };

  const handleAddForAllLanguages = async () => {
    if (!formData.translation_key || !formData.translation_value) {
      toast({ variant: "destructive", title: "Hata", description: "Anahtar ve değer gerekli" });
      return;
    }

    const inserts = languages.map((lang) => ({
      language_code: lang.code,
      translation_key: formData.translation_key,
      translation_value: lang.code === "tr" ? formData.translation_value : `[${lang.code}] ${formData.translation_value}`,
    }));

    const { error } = await supabase.from("translations").insert(inserts);

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Çeviriler eklenemedi" });
    } else {
      toast({ title: "Başarılı", description: "Tüm diller için çeviri eklendi" });
      setIsAddDialogOpen(false);
      setFormData({ language_code: "tr", translation_key: "", translation_value: "" });
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Çeviri Yönetimi
          </CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Çeviri
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Çeviri Ekle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Dil</Label>
                  <Select
                    value={formData.language_code}
                    onValueChange={(v) => setFormData({ ...formData, language_code: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.native_name} ({lang.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Çeviri Anahtarı</Label>
                  <Input
                    value={formData.translation_key}
                    onChange={(e) => setFormData({ ...formData, translation_key: e.target.value })}
                    placeholder="nav.home, products.title vb."
                  />
                </div>
                <div>
                  <Label>Çeviri Değeri</Label>
                  <Textarea
                    value={formData.translation_value}
                    onChange={(e) => setFormData({ ...formData, translation_value: e.target.value })}
                    placeholder="Çevrilmiş metin..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">
                    Kaydet
                  </Button>
                  <Button variant="outline" onClick={handleAddForAllLanguages} className="flex-1">
                    Tüm Dillere Ekle
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Anahtar veya değer ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Dil seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Diller</SelectItem>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.native_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </div>

          {/* Translations Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Anahtar</TableHead>
                  <TableHead>Dil</TableHead>
                  <TableHead>Değer</TableHead>
                  <TableHead className="w-[100px]">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTranslations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Çeviri bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTranslations.map((translation) => (
                    <TableRow key={translation.id}>
                      <TableCell className="font-mono text-sm">{translation.translation_key}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                          {translation.language_code.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {editingTranslation?.id === translation.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={formData.translation_value}
                              onChange={(e) => setFormData({ ...formData, translation_value: e.target.value })}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={handleSave}>
                              Kaydet
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingTranslation(null)}>
                              İptal
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm">{translation.translation_value}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!editingTranslation && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(translation)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(translation.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Toplam {filteredTranslations.length} çeviri bulundu
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
