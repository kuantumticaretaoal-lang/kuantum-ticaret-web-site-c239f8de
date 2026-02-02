import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";

export function DeleteExpenseWithVerificationDialog({
  expenseId,
  disabled,
  onDeleted,
}: {
  expenseId: string;
  disabled?: boolean;
  onDeleted?: () => void;
}) {
  const { toast } = useToast();
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");

  const canVerify = useMemo(() => code.replace(/\D/g, "").length === 6, [code]);

  const requestCode = async () => {
    setRequesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-expense-delete", {
        body: { step: "request", expenseId },
      });

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "Kod gönderilemedi");
      }

      toast({ title: "Doğrulama kodu gönderildi", description: "Admin e-posta adresine kod iletildi." });
      setCode("");
      setCodeDialogOpen(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Hata", description: e?.message || "Kod gönderilemedi" });
    } finally {
      setRequesting(false);
    }
  };

  const verifyAndDelete = async () => {
    if (!canVerify) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-expense-delete", {
        body: { step: "confirm", expenseId, code },
      });

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "Kod doğrulanamadı");
      }

      toast({ title: "Başarılı", description: "İşlem silindi" });
      setCodeDialogOpen(false);
      onDeleted?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Hata", description: e?.message || "İşlem silinemedi" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={disabled || requesting}>
            {requesting ? "..." : "Sil"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem için e-posta doğrulaması gereklidir. Devam ederseniz admin e-posta adresine tek kullanımlık bir kod
              gönderilecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hayır</AlertDialogCancel>
            <AlertDialogAction onClick={requestCode}>Evet</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Doğrulama Kodu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Admin e-postasına gelen 6 haneli kod</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCodeDialogOpen(false)} disabled={verifying}>
                Vazgeç
              </Button>
              <Button className="flex-1" onClick={verifyAndDelete} disabled={!canVerify || verifying}>
                {verifying ? "..." : "Onayla ve Sil"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
