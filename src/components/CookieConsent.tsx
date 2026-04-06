import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CookieCategory {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
}

const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

export const CookieConsent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [cookiePolicy, setCookiePolicy] = useState<string>('');
  const [policies, setPolicies] = useState<SitePolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<SitePolicy | null>(null);

  useEffect(() => {
    const checkConsent = async () => {
      const deviceId = getDeviceId();
      
      // Daha önce onay verilmiş mi kontrol et
      const { data: consents } = await supabase
        .from('cookie_consents')
        .select('id')
        .eq('device_id', deviceId)
        .limit(1);

      if (!consents || consents.length === 0) {
        // Kategorileri ve politikayı yükle
        const [categoriesRes, policyRes, allPoliciesRes] = await Promise.all([
          supabase.from('cookie_categories').select('*').eq('is_active', true).order('sort_order'),
          supabase.from('site_policies').select('content').eq('policy_type', 'cookie').single(),
          supabase.from('site_policies').select('id, title, policy_type, content').eq('is_active', true)
        ]);

        if (categoriesRes.data) {
          setCategories(categoriesRes.data);
          // Zorunlu kategorileri otomatik seç
          const required = new Set(
            categoriesRes.data.filter(c => c.is_required).map(c => c.id)
          );
          setSelectedCategories(required);
        }

        if (policyRes.data) {
          setCookiePolicy(policyRes.data.content || '');
        }

        setIsOpen(true);
      }
    };

    checkConsent();
  }, []);

  const handleAcceptAll = async () => {
    const deviceId = getDeviceId();
    const { data: { user } } = await supabase.auth.getUser();

    const consents = categories.map(cat => ({
      device_id: deviceId,
      user_id: user?.id || null,
      category_id: cat.id,
      accepted: true,
    }));

    await supabase.from('cookie_consents').insert(consents);
    setIsOpen(false);
  };

  const handleAcceptRequired = async () => {
    const deviceId = getDeviceId();
    const { data: { user } } = await supabase.auth.getUser();

    const consents = categories.map(cat => ({
      device_id: deviceId,
      user_id: user?.id || null,
      category_id: cat.id,
      accepted: cat.is_required,
    }));

    await supabase.from('cookie_consents').insert(consents);
    setIsOpen(false);
  };

  const handleAcceptSelected = async () => {
    const deviceId = getDeviceId();
    const { data: { user } } = await supabase.auth.getUser();

    const consents = categories.map(cat => ({
      device_id: deviceId,
      user_id: user?.id || null,
      category_id: cat.id,
      accepted: selectedCategories.has(cat.id),
    }));

    await supabase.from('cookie_consents').insert(consents);
    setIsOpen(false);
  };

  const toggleCategory = (categoryId: string, isRequired: boolean) => {
    if (isRequired) return; // Zorunlu kategoriler değiştirilemez
    
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg animate-in slide-in-from-bottom">
      <div className="container mx-auto max-w-4xl">
        {!showDetails ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">🍪 Çerez Kullanımı</h3>
              <p className="text-sm text-muted-foreground">
                Size daha iyi bir deneyim sunmak için çerezler kullanıyoruz. 
                Tercihlerinizi yönetebilir veya tümünü kabul edebilirsiniz.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
                Tercihleri Yönet
              </Button>
              <Button variant="outline" size="sm" onClick={handleAcceptRequired}>
                Yalnızca Zorunlu
              </Button>
              <Button size="sm" onClick={handleAcceptAll}>
                Tümünü Kabul Et
              </Button>
            </div>
          </div>
        ) : (
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Çerez Tercihleri</DialogTitle>
              </DialogHeader>
              
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4">
                  {cookiePolicy && (
                    <div className="p-4 bg-muted rounded-lg text-sm">
                      <p className="whitespace-pre-wrap">{cookiePolicy}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {categories.map(category => (
                      <div 
                        key={category.id} 
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <Checkbox
                          id={category.id}
                          checked={selectedCategories.has(category.id)}
                          disabled={category.is_required}
                          onCheckedChange={() => toggleCategory(category.id, category.is_required)}
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor={category.id} 
                            className="font-medium cursor-pointer"
                          >
                            {category.name}
                            {category.is_required && (
                              <span className="ml-2 text-xs text-muted-foreground">(Zorunlu)</span>
                            )}
                          </label>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleAcceptRequired}>
                  Yalnızca Zorunlu
                </Button>
                <Button variant="outline" onClick={handleAcceptSelected}>
                  Seçimlerimi Kaydet
                </Button>
                <Button onClick={handleAcceptAll}>
                  Tümünü Kabul Et
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};
