import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw } from "lucide-react";

interface ReturnRequestFormProps {
  orderId: string;
  orderCode: string;
  onSuccess?: () => void;
}

export const ReturnRequestForm = ({ orderId, orderCode, onSuccess }: ReturnRequestFormProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "İade sebebi girmelisiniz." });
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ variant: "destructive", title: "Hata", description: "Giriş yapmanız gerekiyor." });
      setSubmitting(false);
      return;
    }

    // Check if already requested
    const { data: existing } = await (supabase as any)
      .from("return_requests")
      .select("id")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      toast({ variant: "destructive", title: "Hata", description: "Bu sipariş için zaten iade talebi oluşturdunuz." });
      setSubmitting(false);
      return;
    }

    const { error } = await (supabase as any)
      .from("return_requests")
      .insert({ order_id: orderId, user_id: user.id, reason: reason.trim() });

    setSubmitting(false);

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "İade talebi oluşturulamadı." });
    } else {
      toast({ title: "Başarılı", description: "İade talebiniz oluşturuldu. En kısa sürede değerlendirilecektir." });
      setReason("");
      setOpen(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <RotateCcw className="h-4 w-4" />
          İade Talebi
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>İade Talebi - Sipariş #{orderCode}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">İade Sebebi</label>
            <Textarea
              placeholder="Lütfen iade sebebinizi detaylı açıklayın..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Gönderiliyor..." : "İade Talebi Oluştur"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
