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
  DialogDescription,
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
  const [requestError, setRequestError] = useState<string | null>(null);
  const [fallbackInfo, setFallbackInfo] = useState<string | null>(null);

  const canVerify = useMemo(() => code.replace(/\D/g, "").length === 6, [code]);

  const requestCode = async () => {
    if (disabled) return;

    setRequesting(true);
    setRequestError(null);
    setFallbackInfo(null);
    setCode("");
    setCodeDialogOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-expense-delete", {
        body: { step: "request", expenseId },
      });

      if (error) {
        throw new Error(error.message || "Bağlantı hatası");
      }
      
      if (!data?.ok) {
        throw new Error(data?.error || "Kod gönderilemedi");
      }

      // If fallback_code is returned (email couldn't be sent), auto-fill it
      if (data.fallback_code) {
        setCode(data.fallback_code);
        setFallbackInfo("E-posta gönderilemedi. Kod otomatik olarak dolduruldu.");
        toast({ title: "Bilgi", description: "E-posta servisi kullanılamıyor. Kod otomatik dolduruldu." });
      } else {
        toast({ title: "Doğrulama kodu gönderildi", description: "Admin e-posta adresine kod iletildi." });
      }
    } catch (e: any) {
      const msg = e?.message || String(e || "Kod gönderilemedi");
      setRequestError(msg);
      toast({ variant: "destructive", title: "Hata", description: msg });
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

      if (error) {
        throw new Error(error.message || "Sunucu hatası");
      }
      
      if (!data?.ok) {
        throw new Error(data?.error || "Kod doğrulanamadı");
      }

      toast({ title: "Başarılı", description: "İşlem silindi" });
      setCodeDialogOpen(false);
      setCode("");
      setFallbackInfo(null);
      onDeleted?.();
    } catch (e: any) {
      const msg = e?.message || String(e || "İşlem silinemedi");
      toast({ variant: "destructive", title: "Hata", description: msg });
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
              Bu işlem için doğrulama gereklidir. Devam ederseniz bir doğrulama kodu oluşturulacaktır.
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
            <DialogDescription>
              {fallbackInfo 
                ? "Kod otomatik olarak dolduruldu. Onaylamak için butona basın."
                : "Admin e-postanıza gönderilen 6 haneli kodu girin."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {requestError && (
              <div className="text-sm text-destructive">
                {requestError}
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={requestCode} disabled={requesting}>
                    {requesting ? "..." : "Tekrar Dene"}
                  </Button>
                </div>
              </div>
            )}

            {fallbackInfo && (
              <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-3 rounded-md">
                {fallbackInfo}
              </div>
            )}

            <div className="space-y-1">
              <Label>6 haneli doğrulama kodu</Label>
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
