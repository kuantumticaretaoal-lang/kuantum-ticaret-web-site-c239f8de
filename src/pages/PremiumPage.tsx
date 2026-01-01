import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Crown, Check, Clock, Star, Truck, Percent, Zap } from "lucide-react";

interface PremiumPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  discount_percent: number;
  free_shipping: boolean;
  early_access: boolean;
  premium_benefits: { id: string; benefit_text: string }[];
}

interface Membership {
  id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  is_trial: boolean;
  premium_plans: PremiumPlan;
}

interface PremiumRequest {
  id: string;
  status: string;
  created_at: string;
  rejection_reason: string | null;
  premium_plans: { name: string };
}

const PremiumPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PremiumRequest | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // Planları yükle
    const { data: plansData } = await (supabase as any)
      .from("premium_plans")
      .select(`
        *,
        premium_benefits(id, benefit_text)
      `)
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (plansData) setPlans(plansData);

    if (user) {
      // Aktif üyelik kontrolü
      const { data: membershipData } = await (supabase as any)
        .from("premium_memberships")
        .select(`
          *,
          premium_plans(*)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (membershipData) setMembership(membershipData);

      // Bekleyen başvuru kontrolü
      const { data: requestData } = await (supabase as any)
        .from("premium_requests")
        .select(`
          *,
          premium_plans(name)
        `)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (requestData) setPendingRequest(requestData);
    }

    setLoading(false);
  };

  const handleApply = async (planId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Giriş Gerekli",
        description: "Premium üyelik başvurusu için giriş yapmalısınız",
      });
      navigate("/login");
      return;
    }

    if (pendingRequest) {
      toast({
        variant: "destructive",
        title: "Bekleyen Başvuru",
        description: "Zaten bekleyen bir başvurunuz var",
      });
      return;
    }

    const { error } = await (supabase as any)
      .from("premium_requests")
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: "pending",
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Başvuru oluşturulamadı",
      });
    } else {
      toast({
        title: "Başvuru Alındı",
        description: "Premium üyelik başvurunuz incelemeye alındı",
      });
      loadData();
    }
  };

  const getDaysRemaining = () => {
    if (!membership?.expires_at) return 0;
    const diff = new Date(membership.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Yükleniyor...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Premium Üyelik</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Özel indirimler, ücretsiz kargo ve erken erişim avantajlarından yararlanın
          </p>
        </div>

        {/* Aktif Üyelik */}
        {membership && (
          <Card className="max-w-2xl mx-auto mb-12 border-2 border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-yellow-500" />
                <CardTitle>Aktif Premium Üyeliğiniz</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-semibold">{membership.premium_plans?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kalan Süre</p>
                  <p className="font-semibold">{getDaysRemaining()} gün</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bitiş Tarihi</p>
                  <p className="font-semibold">
                    {new Date(membership.expires_at).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-4">
                {membership.premium_plans?.discount_percent > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Percent className="h-3 w-3" />
                    %{membership.premium_plans.discount_percent} İndirim
                  </Badge>
                )}
                {membership.premium_plans?.free_shipping && (
                  <Badge variant="secondary" className="gap-1">
                    <Truck className="h-3 w-3" />
                    Ücretsiz Kargo
                  </Badge>
                )}
                {membership.premium_plans?.early_access && (
                  <Badge variant="secondary" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Erken Erişim
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bekleyen Başvuru */}
        {pendingRequest && !membership && (
          <Card className="max-w-2xl mx-auto mb-12 border-2 border-blue-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-blue-500" />
                <CardTitle>Başvurunuz İnceleniyor</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                <strong>{pendingRequest.premium_plans?.name}</strong> planı için başvurunuz{" "}
                {new Date(pendingRequest.created_at).toLocaleDateString("tr-TR")} tarihinde alındı.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                En kısa sürede size dönüş yapılacaktır.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Planlar */}
        {!membership && (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={plan.id} 
                className={`relative ${index === 1 ? "border-2 border-primary scale-105" : ""}`}
              >
                {index === 1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gap-1 bg-primary">
                      <Star className="h-3 w-3" />
                      En Popüler
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">₺{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.duration_days} gün</span>
                  </div>

                  <div className="space-y-3 text-left">
                    {plan.discount_percent > 0 && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>%{plan.discount_percent} indirim</span>
                      </div>
                    )}
                    {plan.free_shipping && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Ücretsiz kargo</span>
                      </div>
                    )}
                    {plan.early_access && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Yeni ürünlere erken erişim</span>
                      </div>
                    )}
                    {plan.premium_benefits?.map((benefit) => (
                      <div key={benefit.id} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{benefit.benefit_text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={index === 1 ? "default" : "outline"}
                    onClick={() => handleApply(plan.id)}
                    disabled={!!pendingRequest}
                  >
                    {pendingRequest ? "Başvuru Bekleniyor" : "Başvur"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {plans.length === 0 && !membership && (
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="py-12">
              <p className="text-muted-foreground">Henüz aktif premium planı bulunmuyor.</p>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PremiumPage;
