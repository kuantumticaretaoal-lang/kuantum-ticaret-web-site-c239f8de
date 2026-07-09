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

interface SitePolicy {
  id: string;
  title: string;
  policy_type: string;
  content: string | null;
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

      // Local fast-path: if the user already consented from this device, skip the modal.
      // (RLS restricts the DB read to the authenticated owner, so we rely on localStorage
      // as the device-scoped source of truth for anonymous visitors.)
      const localConsent = localStorage.getItem('cookie_consent_v1');
      if (localConsent) {
        return;
      }

      const [categoriesRes, policyRes, allPoliciesRes] = await Promise.all([
        supabase.from('cookie_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('site_policies').select('content').eq('policy_type', 'cookie').single(),
        supabase.from('site_policies').select('id, title, policy_type, content').eq('is_active', true)
      ]);

      if (categoriesRes.data) {
        setCategories(categoriesRes.data);
        const required = new Set(
          categoriesRes.data.filter(c => c.is_required).map(c => c.id)
        );
        setSelectedCategories(required);
      }

      if (policyRes.data) {
        setCookiePolicy(policyRes.data.content || '');
      }

      if (allPoliciesRes.data) {
        setPolicies(allPoliciesRes.data as SitePolicy[]);
      }

      setIsOpen(true);
      // also reference deviceId so linter is happy
      void deviceId;
    };

    checkConsent();
  }, []);

  const persistLocal = () => {
    try { localStorage.setItem('cookie_consent_v1', new Date().toISOString()); } catch {}
  };

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
    persistLocal();
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
    persistLocal();
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
    persistLocal();
    setIsOpen(false);
  };

  const toggleCategory = (categoryId: string, isRequired: boolean) => {
    if (isRequired) return;
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
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] bg-background border-t shadow-2xl animate-in slide-in-from-bottom pb-[env(safe-area-inset-bottom)] md:bottom-4 md:left-4 md:right-4 md:rounded-2xl md:border"
      style={{ maxHeight: "min(80vh, 640px)" }}
    >
      <div className="container mx-auto max-w-4xl flex flex-col" style={{ maxHeight: "inherit" }}>
        {!showDetails ? (
          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:gap-4 md:p-5 overflow-y-auto">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1 text-sm md:text-base">🍪 Çerez Kullanımı</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Size daha iyi bir deneyim sunmak için çerezler kullanıyoruz.
                Tercihlerinizi yönetebilir veya tümünü kabul edebilirsiniz.
              </p>
              {policies.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {policies.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPolicy(p); setShowDetails(true); }}
                      className="text-[11px] md:text-xs text-primary underline hover:no-underline"
                    >
                      📄 {p.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:flex md:flex-wrap md:shrink-0">
              <Button variant="outline" size="sm" onClick={() => { setSelectedPolicy(null); setShowDetails(true); }}>
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
          <Dialog open={showDetails} onOpenChange={(open) => { setShowDetails(open); if (!open) setSelectedPolicy(null); }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedPolicy ? selectedPolicy.title : "Çerez Tercihleri"}</DialogTitle>
              </DialogHeader>
              
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4">
                  {selectedPolicy ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {selectedPolicy.content || "İçerik henüz eklenmedi."}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPolicy(null)}>
                        ← Çerez Tercihlerine Dön
                      </Button>
                    </div>
                  ) : (
                    <>
                      {cookiePolicy && (
                        <div className="p-4 bg-muted rounded-lg text-sm">
                          <p className="whitespace-pre-wrap">{cookiePolicy}</p>
                        </div>
                      )}

                      {policies.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Politikalarımız</h4>
                          <div className="flex flex-wrap gap-2">
                            {policies.map(p => (
                              <Button key={p.id} variant="outline" size="sm" onClick={() => setSelectedPolicy(p)}>
                                📄 {p.title}
                              </Button>
                            ))}
                          </div>
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
                    </>
                  )}
                </div>
              </ScrollArea>

              {!selectedPolicy && (
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
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};
