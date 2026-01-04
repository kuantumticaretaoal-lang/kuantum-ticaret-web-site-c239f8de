import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Globe, RefreshCw, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

interface Language {
  id: string;
  code: string;
  name: string;
  native_name: string;
  currency_code: string;
  currency_symbol: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

export const AdminLanguages = () => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    native_name: '',
    currency_code: '',
    currency_symbol: '',
    is_active: true,
  });

  const loadData = async () => {
    const [langRes, ratesRes] = await Promise.all([
      supabase.from('supported_languages').select('*').order('sort_order'),
      supabase.from('exchange_rates').select('*').order('to_currency'),
    ]);

    setLanguages(langRes.data || []);
    setExchangeRates(ratesRes.data || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchExchangeRates = async () => {
    setLoading(true);
    try {
      // Edge function üzerinden canlı döviz kurlarını çek
      const { error } = await supabase.functions.invoke('fetch-exchange-rates');
      
      if (error) {
        toast.error('Döviz kurları güncellenirken hata oluştu');
      } else {
        toast.success('Döviz kurları güncellendi');
        loadData();
      }
    } catch (error) {
      toast.error('Döviz kurları güncellenirken hata oluştu');
    }
    setLoading(false);
  };

  const addLanguage = async () => {
    if (!formData.code || !formData.name || !formData.currency_code) {
      toast.error('Zorunlu alanları doldurun');
      return;
    }

    const { error } = await supabase.from('supported_languages').insert([{
      ...formData,
      sort_order: languages.length + 1,
    }]);

    if (error) {
      toast.error('Dil eklenirken hata oluştu');
      return;
    }

    toast.success('Dil eklendi');
    setIsDialogOpen(false);
    setFormData({
      code: '',
      name: '',
      native_name: '',
      currency_code: '',
      currency_symbol: '',
      is_active: true,
    });
    loadData();
  };

  const toggleLanguage = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('supported_languages')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast.error('Durum değiştirilirken hata oluştu');
      return;
    }

    loadData();
  };

  const setDefaultLanguage = async (id: string) => {
    // Önce tümünün default'unu kaldır
    await supabase.from('supported_languages').update({ is_default: false }).neq('id', '');
    
    // Yeni default'u ayarla
    const { error } = await supabase
      .from('supported_languages')
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      toast.error('Varsayılan dil ayarlanırken hata oluştu');
      return;
    }

    toast.success('Varsayılan dil değiştirildi');
    loadData();
  };

  const deleteLanguage = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error('Varsayılan dil silinemez');
      return;
    }

    const { error } = await supabase
      .from('supported_languages')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Dil silinirken hata oluştu');
      return;
    }

    toast.success('Dil silindi');
    loadData();
  };

  const updateRate = async (id: string, rate: number) => {
    const { error } = await supabase
      .from('exchange_rates')
      .update({ rate, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Kur güncellenirken hata oluştu');
      return;
    }

    toast.success('Kur güncellendi');
    loadData();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Globe className="h-6 w-6" />
        Dil ve Para Birimi Ayarları
      </h2>

      {/* Diller */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Desteklenen Diller</CardTitle>
              <CardDescription>Site dilleri ve para birimleri</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Dil
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Dil Ekle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Dil Kodu *</Label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                        placeholder="tr, en, de..."
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label>Dil Adı *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Turkish, English..."
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Yerel Adı</Label>
                    <Input
                      value={formData.native_name}
                      onChange={(e) => setFormData({ ...formData, native_name: e.target.value })}
                      placeholder="Türkçe, English, Deutsch..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Para Birimi Kodu *</Label>
                      <Input
                        value={formData.currency_code}
                        onChange={(e) => setFormData({ ...formData, currency_code: e.target.value.toUpperCase() })}
                        placeholder="TRY, USD, EUR..."
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <Label>Para Birimi Sembolü</Label>
                      <Input
                        value={formData.currency_symbol}
                        onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                        placeholder="₺, $, €..."
                        maxLength={5}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Aktif</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={addLanguage}>Ekle</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Dil</TableHead>
                <TableHead>Para Birimi</TableHead>
                <TableHead>Varsayılan</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {languages.map((lang) => (
                <TableRow key={lang.id}>
                  <TableCell className="font-mono">{lang.code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lang.name}</div>
                      <div className="text-sm text-muted-foreground">{lang.native_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{lang.currency_symbol}</span>
                    <span className="text-muted-foreground ml-1">({lang.currency_code})</span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={lang.is_default}
                      onCheckedChange={() => setDefaultLanguage(lang.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={lang.is_active}
                      onCheckedChange={() => toggleLanguage(lang.id, lang.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteLanguage(lang.id, lang.is_default)}
                      disabled={lang.is_default}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Döviz Kurları */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Döviz Kurları</CardTitle>
              <CardDescription>TRY bazlı döviz kurları</CardDescription>
            </div>
            <Button onClick={fetchExchangeRates} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Kurları Güncelle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Para Birimi</TableHead>
                <TableHead>Kur (1 TRY = ?)</TableHead>
                <TableHead>Son Güncelleme</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exchangeRates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">{rate.to_currency}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      value={rate.rate}
                      onChange={(e) => updateRate(rate.id, parseFloat(e.target.value))}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(rate.updated_at).toLocaleString('tr-TR')}
                  </TableCell>
                </TableRow>
              ))}
              {exchangeRates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Henüz döviz kuru eklenmemiş. Kurları güncellemek için butona tıklayın.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
