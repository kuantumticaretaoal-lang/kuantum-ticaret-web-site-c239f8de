import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Shield, Cookie, RefreshCw } from "lucide-react";

interface Policy {
  id: string;
  policy_type: string;
  title: string;
  content: string | null;
  is_active: boolean;
}

export const AdminPolicies = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});

  const loadPolicies = async () => {
    const { data, error } = await supabase
      .from('site_policies')
      .select('*')
      .order('policy_type');

    if (error) {
      toast.error('Politikalar yüklenirken hata oluştu');
      return;
    }

    setPolicies(data || []);
    const contents: Record<string, string> = {};
    data?.forEach(p => {
      contents[p.id] = p.content || '';
    });
    setEditedContents(contents);
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const savePolicy = async (policy: Policy) => {
    setLoading(true);
    const { error } = await supabase
      .from('site_policies')
      .update({
        content: editedContents[policy.id],
        updated_at: new Date().toISOString(),
      })
      .eq('id', policy.id);

    setLoading(false);

    if (error) {
      toast.error('Politika kaydedilirken hata oluştu');
      return;
    }

    toast.success(`${policy.title} güncellendi`);
    loadPolicies();
  };

  const getPolicyIcon = (type: string) => {
    switch (type) {
      case 'privacy': return <Shield className="h-5 w-5" />;
      case 'cookie': return <Cookie className="h-5 w-5" />;
      case 'return': return <RefreshCw className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getPolicyDescription = (type: string) => {
    switch (type) {
      case 'privacy': return 'Kullanıcı verilerinin nasıl toplandığı ve kullanıldığı hakkında bilgi';
      case 'cookie': return 'Çerez kullanımı ve çerez türleri hakkında bilgi';
      case 'return': return 'İade ve iptal süreçleri hakkında bilgi';
      case 'terms': return 'Site kullanım koşulları ve kurallar';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <FileText className="h-6 w-6" />
        Politikalar ve Yasal Metinler
      </h2>

      <Tabs defaultValue={policies[0]?.policy_type || 'privacy'}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          {policies.map(policy => (
            <TabsTrigger key={policy.id} value={policy.policy_type} className="flex items-center gap-2">
              {getPolicyIcon(policy.policy_type)}
              <span className="hidden sm:inline">{policy.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {policies.map(policy => (
          <TabsContent key={policy.id} value={policy.policy_type}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getPolicyIcon(policy.policy_type)}
                  {policy.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {getPolicyDescription(policy.policy_type)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>İçerik</Label>
                  <Textarea
                    value={editedContents[policy.id] || ''}
                    onChange={(e) => setEditedContents({ 
                      ...editedContents, 
                      [policy.id]: e.target.value 
                    })}
                    placeholder={`${policy.title} içeriğini buraya yazın...`}
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Markdown formatını kullanabilirsiniz.
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Son güncelleme: {policy.is_active ? new Date().toLocaleDateString('tr-TR') : 'Henüz güncellenmedi'}
                  </p>
                  <Button onClick={() => savePolicy(policy)} disabled={loading}>
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
