import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const COOLDOWN_KEY = "exit_popup_dismissed_at";

const ExitIntentPopup = () => {
  const [popup, setPopup] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("exit_intent_popups")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted || !data) return;

      const dismissedAt = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
      const cooldownMs = (data.cooldown_hours || 24) * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < cooldownMs) return;

      setPopup(data);

      const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

      if (data.show_on_load) {
        setTimeout(() => setOpen(true), data.show_delay_ms || 0);
      }
      if (data.show_on_exit && !isMobile) {
        const handler = (e: MouseEvent) => {
          if (e.clientY < 10) setOpen(true);
        };
        document.addEventListener("mouseleave", handler);
        return () => document.removeEventListener("mouseleave", handler);
      }

    })();
    return () => { mounted = false; };
  }, []);

  const close = () => {
    setOpen(false);
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  };

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">{popup.title}</DialogTitle>
          {popup.message && <DialogDescription className="text-base">{popup.message}</DialogDescription>}
        </DialogHeader>
        {popup.image_url && <img src={popup.image_url} alt="" className="w-full rounded-lg" />}
        {popup.coupon_code && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">Kupon Kodu</div>
            <div className="text-2xl font-bold text-primary tracking-widest">{popup.coupon_code}</div>
          </div>
        )}
        {popup.cta_url && (
          <Button asChild size="lg" className="w-full" onClick={close}>
            <a href={popup.cta_url}>{popup.cta_text || "Hemen Yararlan"}</a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
