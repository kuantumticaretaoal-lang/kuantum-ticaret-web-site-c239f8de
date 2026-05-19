import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const NewsletterSignup = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("feature_flags").select("is_enabled").eq("key", "newsletter_signup").maybeSingle();
      setEnabled(data?.is_enabled !== false);
    })();
  }, []);

  if (!enabled) return null;

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("newsletters")
      .insert({ email: email.trim().toLowerCase(), user_id: user?.id ?? null });
    setLoading(false);
    if (error && error.code !== "23505") {
      toast({ variant: "destructive", title: "Hata", description: error.message });
      return;
    }
    toast({ title: "Abone olundu", description: "Bültenimize başarıyla abone oldunuz!" });
    setEmail("");
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Bültenimize Abone Olun</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">Yeni ürünler ve özel kampanyalardan ilk siz haberdar olun.</p>
      <form onSubmit={subscribe} className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="E-posta adresiniz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-background text-foreground placeholder:text-muted-foreground"
        />
        <Button type="submit" disabled={loading}>{loading ? "..." : "Abone Ol"}</Button>
      </form>
    </div>
  );
};

export default NewsletterSignup;
