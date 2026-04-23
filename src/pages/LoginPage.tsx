import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { signIn } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Geçerli bir e-posta adresi girin" }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır" }),
});

const backupCodeSchema = z.object({
  email: z.string().email({ message: "Geçerli bir e-posta adresi girin" }),
  code: z.string().min(10, { message: "Geçerli bir yedek kod girin" }),
});

interface RateLimitData {
  email: string;
  attempts: number;
  lockUntil: number;
  level: number;
}

const LOCK_DURATIONS = [0, 30000, 120000, 300000, 1800000, 86400000];
const RESEND_COOLDOWN_MS = 30000;

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);

  const [twoFAStep, setTwoFAStep] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAEmail, setTwoFAEmail] = useState("");
  const [twoFAPassword, setTwoFAPassword] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAFallback, setTwoFAFallback] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const backupForm = useForm<z.infer<typeof backupCodeSchema>>({
    resolver: zodResolver(backupCodeSchema),
    defaultValues: { email: "", code: "" },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const currentEmail = form.watch("email");
    const checkRateLimit = () => {
      if (!currentEmail) return;
      const rateLimitData = getRateLimitData(currentEmail);
      if (rateLimitData && rateLimitData.lockUntil > Date.now()) {
        setLockRemaining(rateLimitData.lockUntil - Date.now());
      } else {
        setLockRemaining(0);
      }
    };

    checkRateLimit();
    const interval = setInterval(checkRateLimit, 1000);
    return () => clearInterval(interval);
  }, [form.watch("email")]);

  useEffect(() => {
    if (!twoFAStep) return;

    const interval = setInterval(() => {
      if (resendAvailableAt <= Date.now()) {
        setResendAvailableAt(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [twoFAStep, resendAvailableAt]);

  const resendRemaining = useMemo(() => Math.max(0, resendAvailableAt - Date.now()), [resendAvailableAt]);

  const getRateLimitData = (email: string): RateLimitData | null => {
    const data = localStorage.getItem(`rateLimit_${email}`);
    if (!data) return null;
    return JSON.parse(data);
  };

  const setRateLimitData = (data: RateLimitData) => {
    localStorage.setItem(`rateLimit_${data.email}`, JSON.stringify(data));
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} gün ${hours % 24} saat ${minutes % 60} dakika ${seconds % 60} saniye`;
    if (hours > 0) return `${hours} saat ${minutes % 60} dakika ${seconds % 60} saniye`;
    if (minutes > 0) return `${minutes} dakika ${seconds % 60} saniye`;
    return `${seconds} saniye`;
  };

  const resetTwoFAState = () => {
    setTwoFAStep(false);
    setTwoFACode("");
    setTwoFAEmail("");
    setTwoFAPassword("");
    setTwoFAFallback(null);
    setResendAvailableAt(0);
  };

  const handleFailedLogin = (email: string, rateLimitData: RateLimitData | null) => {
    const currentData = rateLimitData || { email, attempts: 0, lockUntil: 0, level: 0 };
    currentData.attempts += 1;

    if (currentData.attempts >= 3) {
      currentData.level = Math.min(currentData.level + 1, LOCK_DURATIONS.length - 1);
      currentData.lockUntil = Date.now() + LOCK_DURATIONS[currentData.level];
      currentData.attempts = 0;
      setRateLimitData(currentData);
      setLockRemaining(currentData.lockUntil - Date.now());
      toast({
        variant: "destructive",
        title: "Çok Fazla Başarısız Deneme",
        description: `Lütfen ${formatTime(LOCK_DURATIONS[currentData.level])} bekleyiniz`,
      });
      return;
    }

    setRateLimitData(currentData);
    toast({
      variant: "destructive",
      title: "Giriş Başarısız",
      description: `E-posta veya şifre hatalı (${3 - currentData.attempts} deneme hakkınız kaldı)`,
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const rateLimitData = getRateLimitData(values.email);
    if (rateLimitData && rateLimitData.lockUntil > Date.now()) {
      toast({
        variant: "destructive",
        title: "Çok Fazla Başarısız Deneme",
        description: `Lütfen ${formatTime(rateLimitData.lockUntil - Date.now())} bekleyiniz`,
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: prepareData, error: prepareError } = await supabase.functions.invoke("send-login-code", {
        body: {
          step: "prepare",
          email: values.email,
          password: values.password,
        },
      });

      if (prepareError) {
        throw new Error(prepareError.message || "Giriş hazırlığı başarısız");
      }

      if (!prepareData?.ok) {
        handleFailedLogin(values.email, rateLimitData);
        return;
      }

      if (prepareData?.twoFactorRequired) {
        setTwoFAEmail(values.email);
        setTwoFAPassword(values.password);
        setTwoFAStep(true);
        setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);

        if (prepareData.fallback_code) {
          setTwoFAFallback(prepareData.fallback_code);
          setTwoFACode(prepareData.fallback_code);
          toast({ title: "Kod hazır", description: "E-posta servisi çalışmadığı için kod otomatik dolduruldu." });
        } else {
          setTwoFAFallback(null);
          setTwoFACode("");
          toast({ title: "Doğrulama kodu gönderildi", description: "E-posta adresinize 6 haneli kod gönderildi." });
        }

        return;
      }

      const { error } = await signIn(values.email, values.password);
      if (error) {
        handleFailedLogin(values.email, rateLimitData);
        return;
      }

      localStorage.removeItem(`rateLimit_${values.email}`);
      toast({ title: "Giriş Başarılı", description: "Hoş geldiniz!" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu, lütfen tekrar deneyin",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verify2FA = async () => {
    const cleanCode = twoFACode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      toast({ variant: "destructive", title: "Hata", description: "6 haneli kodu girin" });
      return;
    }

    setTwoFALoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-login-code", {
        body: { step: "verify", email: twoFAEmail, code: cleanCode },
      });

      if (error) {
        throw new Error(error.message || "Doğrulama başarısız");
      }

      if (!data?.verified) {
        toast({
          variant: "destructive",
          title: "Doğrulama Başarısız",
          description: data?.error || "Kod geçersiz veya süresi dolmuş",
        });
        return;
      }

      const { error: signInError } = await signIn(twoFAEmail, twoFAPassword);
      if (signInError) {
        toast({ variant: "destructive", title: "Giriş Hatası", description: signInError.message });
        return;
      }

      localStorage.removeItem(`rateLimit_${twoFAEmail}`);
      toast({ title: "Giriş Başarılı", description: "Hoş geldiniz!" });
      resetTwoFAState();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Doğrulama sırasında hata oluştu",
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const resend2FA = async () => {
    if (resendAvailableAt > Date.now()) {
      toast({
        variant: "destructive",
        title: "Biraz bekleyin",
        description: `Kodu tekrar istemek için ${Math.ceil((resendAvailableAt - Date.now()) / 1000)} saniye bekleyin.`,
      });
      return;
    }

    setTwoFALoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-login-code", {
        body: { step: "send", email: twoFAEmail },
      });

      if (error) {
        throw new Error(error.message || "Kod gönderilemedi");
      }

      if (!data?.ok) {
        throw new Error(data?.error || "Kod gönderilemedi");
      }

      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);

      if (data?.fallback_code) {
        setTwoFAFallback(data.fallback_code);
        setTwoFACode(data.fallback_code);
        toast({ title: "Kod hazır", description: "Yeni kod otomatik dolduruldu." });
      } else {
        setTwoFAFallback(null);
        setTwoFACode("");
        toast({ title: "Kod gönderildi", description: "Yeni doğrulama kodu e-posta adresinize gönderildi." });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Kod gönderilemedi",
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const onBackupCodeSubmit = async (values: z.infer<typeof backupCodeSchema>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-login-code", {
        body: {
          step: "backup_recovery",
          email: values.email,
          code: values.code,
          redirectTo: `${window.location.origin}/account`,
        },
      });

      if (error) {
        throw new Error(error.message || "Hesap kurtarma başlatılamadı");
      }

      if (!data?.ok) {
        toast({
          variant: "destructive",
          title: "Kod Geçersiz",
          description: data?.error || "Yedek kod geçersiz veya kullanılmış",
        });
        return;
      }

      backupForm.reset();

      if (data?.reset_link) {
        toast({
          title: "Kurtarma doğrulandı",
          description: "Şifre sıfırlama bağlantısı doğrudan açılıyor.",
          duration: 5000,
        });
        window.location.assign(data.reset_link);
        return;
      }

      toast({
        title: "Hesabınız kurtarıldı",
        description: "E-posta adresinize şifre sıfırlama bağlantısı gönderildi.",
        duration: 8000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({ variant: "destructive", title: "Hata", description: "Lütfen email adresinizi girin" });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.toLowerCase(), {
      redirectTo: `${window.location.origin}/account`,
    });

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Email gönderilemedi: " + error.message });
      return;
    }

    toast({ title: "Başarılı", description: "Şifre sıfırlama linki email adresinize gönderildi.", duration: 8000 });
    setShowForgotPassword(false);
    setForgotPasswordEmail("");
  };

  const isLocked = lockRemaining > 0;

  if (twoFAStep) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">2 Adımlı Doğrulama</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                E-posta adresinize gönderilen 6 haneli kodu girin.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {twoFAFallback && (
                <div className="rounded-md border border-border bg-muted px-3 py-3 text-sm text-foreground">
                  E-posta servisi geçici olarak kullanılamadığı için doğrulama kodu otomatik dolduruldu.
                </div>
              )}
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={twoFACode} onChange={setTwoFACode}>
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
              <Button onClick={verify2FA} className="w-full" disabled={twoFALoading || twoFACode.replace(/\D/g, "").length !== 6}>
                {twoFALoading ? "Doğrulanıyor..." : "Doğrula ve Giriş Yap"}
              </Button>
              <div className="flex items-center justify-between gap-3">
                <Button variant="link" size="sm" onClick={resend2FA} disabled={twoFALoading || resendRemaining > 0}>
                  {resendRemaining > 0 ? `Tekrar gönder (${Math.ceil(resendRemaining / 1000)})` : "Kodu Tekrar Gönder"}
                </Button>
                <Button variant="link" size="sm" onClick={resetTwoFAState}>
                  Geri Dön
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Giriş Yap</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="normal" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="normal">Normal Giriş</TabsTrigger>
                <TabsTrigger value="recovery">Yedek Kod</TabsTrigger>
              </TabsList>
              <TabsContent value="normal">
                {isLocked && (
                  <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4">
                    <p className="text-sm font-semibold text-destructive">⏱️ Güvenlik nedeniyle geçici olarak kilitlendi</p>
                    <p className="mt-1 text-sm text-destructive">Kalan süre: {formatTime(lockRemaining)}</p>
                  </div>
                )}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-posta</FormLabel>
                          <FormControl><Input type="email" placeholder="E-posta adresiniz" {...field} disabled={isLocked} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şifre</FormLabel>
                          <FormControl><Input type="password" placeholder="Şifreniz" {...field} disabled={isLocked} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading || isLocked}>
                      {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </Button>
                  </form>
                </Form>
                <div className="mt-4 text-center">
                  <Button variant="link" onClick={() => setShowForgotPassword(true)} className="text-sm">Şifremi Unuttum</Button>
                </div>
              </TabsContent>
              <TabsContent value="recovery">
                <Form {...backupForm}>
                  <form onSubmit={backupForm.handleSubmit(onBackupCodeSubmit)} className="space-y-4">
                    <FormField
                      control={backupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-posta</FormLabel>
                          <FormControl><Input type="email" placeholder="E-posta adresiniz" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={backupForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yedek Kod</FormLabel>
                          <FormControl><Input placeholder="AB12-CD3-456E" className="font-mono uppercase" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-xs text-muted-foreground">Yedek kod geçerliyse şifre sıfırlama bağlantısı gönderilir veya doğrudan açılır.</p>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "İşleniyor..." : "Hesabı Kurtar"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Hesabınız yok mu? </span>
              <Link to="/register" className="text-primary hover:underline">Kayıt Ol</Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader><DialogTitle>Şifremi Unuttum</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="forgot-email">Email Adresi</Label>
              <Input id="forgot-email" type="email" value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)} placeholder="ornek@email.com" />
            </div>
            <Button onClick={handleForgotPassword} className="w-full">Şifre Sıfırlama Linki Gönder</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default LoginPage;
