import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Star, Copy, Gift, Users, RefreshCw, Ticket } from "lucide-react";

export const LoyaltyCard = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [totalPoints, setTotalPoints] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [hasRedeemed, setHasRedeemed] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    const { data: points } = await (supabase as any)
      .from("loyalty_points")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (points) {
      setHistory(points);
      setTotalPoints(points.reduce((s: number, p: any) => s + p.points, 0));
    }

    const { data: ref } = await (supabase as any)
      .from("referral_codes")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (ref) {
      setReferralCode(ref.code);
      setReferralCount(ref.used_by_count || 0);
    } else {
      setReferralCode(null);
      setReferralCount(0);
    }

    const { data: usage } = await (supabase as any)
      .from("referral_usages")
      .select("id")
      .eq("referred_id", userId)
      .maybeSingle();
    setHasRedeemed(!!usage);
  };

  const generateReferralCode = async () => {
    const code = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const { error } = await (supabase as any)
      .from("referral_codes")
      .insert({ user_id: userId, code });

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Kod oluşturulamadı" });
    } else {
      setReferralCode(code);
      toast({ title: "Davet kodunuz oluşturuldu", description: code });
    }
  };

  const regenerateCode = async () => {
    if (referralCount > 0) {
      toast({ variant: "destructive", title: "Yenilenemez", description: "Kullanılmış kod yenilenemez." });
      return;
    }
    const { error } = await (supabase as any).from("referral_codes").delete().eq("user_id", userId);
    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
      return;
    }
    setReferralCode(null);
    await generateReferralCode();
  };

  const redeemCode = async () => {
    const code = redeemInput.trim().toUpperCase();
    if (!code) return;
    if (code === referralCode) {
      toast({ variant: "destructive", title: "Hata", description: "Kendi kodunuzu kullanamazsınız" });
      return;
    }
    setRedeeming(true);
    const { data, error } = await (supabase as any).rpc("redeem_referral_code", { p_code: code });
    setRedeeming(false);
    if (error || !data?.ok) {
      toast({ variant: "destructive", title: "Hata", description: data?.error || error?.message || "Geçersiz kod" });
      return;
    }
    toast({ title: "Başarılı", description: "Davet kodu uygulandı ve bonus puanlar verildi!" });
    setRedeemInput("");
    setHasRedeemed(true);
    loadData();
  };

  const copyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast({ title: "Kopyalandı" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Sadakat Puanları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary mb-1">{totalPoints} Puan</div>
          <p className="text-xs text-muted-foreground">Her 10 birim alışverişte 1 puan kazanın (1 puan = 1 birim).</p>

          {history.length > 0 && (
            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
              {history.map(h => (
                <div key={h.id} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground truncate flex-1">{h.description}</span>
                  <Badge variant="secondary" className="ml-2">+{h.points}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Davet Kodum
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referralCode ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input value={referralCode} readOnly className="font-mono text-center" />
                <Button size="icon" variant="outline" onClick={copyCode} title="Kopyala">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={regenerateCode}
                  disabled={referralCount > 0}
                  title={referralCount > 0 ? "Kullanılmış — yenilenemez" : "Yenile"}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Gift className="h-4 w-4 text-green-500" />
                <span>{referralCount} kişi davet kodunuzu kullandı</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Arkadaşlarınız bu kodla bonus puan kazanır, siz de her kullanım için +100 puan alırsınız.
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">Davet kodunuzu oluşturun ve paylaşın</p>
              <Button onClick={generateReferralCode} className="gap-2">
                <Gift className="h-4 w-4" /> Kod Oluştur
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ticket className="h-5 w-5 text-primary" />
            Davet Kodu Kullan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasRedeemed ? (
            <p className="text-sm text-muted-foreground">Daha önce bir davet kodu kullandınız. Teşekkürler!</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Bir arkadaşınızdan aldığınız davet kodunu girin ve +50 puan kazanın.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="REF-XXXXXX"
                  value={redeemInput}
                  onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Button onClick={redeemCode} disabled={redeeming || !redeemInput.trim()}>
                  {redeeming ? "..." : "Kullan"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
