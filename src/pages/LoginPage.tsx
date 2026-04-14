import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { signIn } from "@/lib/auth";
import { verifyBackupCode, createBackupCode } from "@/lib/backup-codes";
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

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);

  // 2FA state
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAEmail, setTwoFAEmail] = useState("");
  const [twoFAPassword, setTwoFAPassword] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAFallback, setTwoFAFallback] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const backupForm = useForm<z.infer<typeof backupCodeSchema>>({
    resolver: zodResolver(backupCodeSchema),
    defaultValues: { email: "", code: "" },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && !twoFAStep) {
        navigate("/");
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
    return () => subscription.unsubscribe();
  }, [navigate, twoFAStep]);

  useEffect(() => {
    const checkRateLimit = () => {
      const email = form.watch("email");
      if (!email) return;
      const rateLimitData = getRateLimitData(email);
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const rateLimitData = getRateLimitData(values.email);
    if (rateLimitData && rateLimitData.lockUntil > Date.now()) {
      toast({ variant: "destructive", title: "Çok Fazla Başarısız Deneme", description: `Lütfen ${formatTime(rateLimitData.lockUntil - Date.now())} bekleyiniz` });
      return;
    }

    setIsLoading(true);
    try {
      // First check if 2FA is enabled for this user
      const { data: checkData } = await supabase.functions.invoke("send-login-code", {
        body: { step: "check", email: values.email },
      });

      if (checkData?.twoFactorEnabled) {
        // Verify password first by attempting sign in
        const { error } = await signIn(values.email, values.password);
        if (error) {
          handleFailedLogin(values.email, rateLimitData);
          setIsLoading(false);
          return;
        }

        // Password correct - sign out and request 2FA code
        await supabase.auth.signOut();

        const { data: sendData } = await supabase.functions.invoke("send-login-code", {
          body: { step: "send", email: values.email },
        });

        if (sendData?.fallback_code) {
          setTwoFAFallback(sendData.fallback_code);
          setTwoFACode(sendData.fallback_code);
          toast({ title: "Bilgi", description: "E-posta servisi kullanılamıyor. Kod otomatik dolduruldu." });
        } else if (sendData?.ok) {
          toast({ title: "Doğrulama Kodu Gönderildi", description: "E-posta adresinize 6 haneli kod gönderildi." });
        }

        setTwoFAEmail(values.email);
        setTwoFAPassword(values.password);
        setTwoFAStep(true);
        setIsLoading(false);
        return;
      }

      // No 2FA - normal login
      const { error } = await signIn(values.email, values.password);
      if (error) {
        handleFailedLogin(values.email, rateLimitData);
      } else {
        localStorage.removeItem(`rateLimit_${values.email}`);
        toast({ title: "Giriş Başarılı", description: "Hoş geldiniz!" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu, lütfen tekrar deneyin" });
    } finally {
      setIsLoading(false);
    }
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
      toast({ variant: "destructive", title: "Çok Fazla Başarısız Deneme", description: `Lütfen ${formatTime(LOCK_DURATIONS[currentData.level])} bekleyiniz` });
    } else {
      setRateLimitData(currentData);
      toast({ variant: "destructive", title: "Giriş Başarısız", description: `E-posta veya şifre hatalı (${3 - currentData.attempts} deneme hakkınız kaldı)` });
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
      const { data } = await supabase.functions.invoke("send-login-code", {
        body: { step: "verify", email: twoFAEmail, code: cleanCode },
      });

      if (!data?.verified) {
        toast({ variant: "destructive", title: "Doğrulama Başarısız", description: data?.error || "Kod geçersiz veya süresi dolmuş" });
        setTwoFALoading(false);
        return;
      }

      // Code verified - now sign in
      const { error } = await signIn(twoFAEmail, twoFAPassword);
      if (error) {
        toast({ variant: "destructive", title: "Giriş Hatası", description: error.message });
      } else {
        localStorage.removeItem(`rateLimit_${twoFAEmail}`);
        toast({ title: "Giriş Başarılı", description: "Hoş geldiniz!" });
        setTwoFAStep(false);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Hata", description: "Doğrulama sırasında hata oluştu" });
    } finally {
      setTwoFALoading(false);
    }
  };

  const resend2FA = async () => {
    setTwoFALoading(true);
    try {
      const { data } = await supabase.functions.invoke("send-login-code", {
        body: { step: "send", email: twoFAEmail },
      });
      if (data?.fallback_code) {
        setTwoFAFallback(data.fallback_code);
        setTwoFACode(data.fallback_code);
        toast({ title: "Bilgi", description: "Kod otomatik dolduruldu." });
      } else {
        toast({ title: "Kod Gönderildi", description: "Yeni doğrulama kodu e-postanıza gönderildi." });
      }
    } catch {
      toast({ variant: "destructive", title: "Hata", description: "Kod gönderilemedi" });
    } finally {
      setTwoFALoading(false);
    }
  };

  const onBackupCodeSubmit = async (values: z.infer<typeof backupCodeSchema>) => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.from("profiles").select("id").eq("email", values.email.toLowerCase()).maybeSingle();
      if (!userData) {
        toast({ variant: "destructive", title: "Hata", description: "Bu email adresi ile kayıtlı bir kullanıcı bulunamadı" });
        setIsLoading(false);
        return;
      }
      const { valid, error: verifyError } = await verifyBackupCode(userData.id, values.code);
      if (verifyError || !valid) {
        toast({ variant: "destructive", title: "Kod Geçersiz", description: "Yedek kod geçersiz veya kullanılmış" });
        setIsLoading(false);
        return;
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email.toLowerCase(), { redirectTo: `${window.location.origin}/account` });
      if (resetError) {
        toast({ variant: "destructive", title: "Email Gönderilemedi", description: resetError.message });
        setIsLoading(false);
        return;
      }
      await createBackupCode(userData.id);
      toast({ title: "Hesabınız Kurtarıldı!", description: "Email adresinize şifre sıfırlama linki gönderildi.", duration: 8000 });
      backupForm.reset();
    } catch {
      toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({ variant: "destructive", title: "Hata", description: "Lütfen email adresinizi girin" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.toLowerCase(), { redirectTo: `${window.location.origin}/account` });
    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Email gönderilemedi: " + error.message });
      return;
    }
    toast({ title: "Başarılı", description: "Şifre sıfırlama linki email adresinize gönderildi.", duration: 8000 });
    setShowForgotPassword(false);
    setForgotPasswordEmail("");
  };

  const isLocked = lockRemaining > 0;

  // 2FA verification screen
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
                <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-3 rounded-md">
                  E-posta servisi kullanılamıyor. Kod otomatik dolduruldu.
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
              <div className="flex justify-between">
                <Button variant="link" size="sm" onClick={resend2FA} disabled={twoFALoading}>
                  Kodu Tekrar Gönder
                </Button>
                <Button variant="link" size="sm" onClick={() => { setTwoFAStep(false); setTwoFACode(""); setTwoFAFallback(null); }}>
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
                  <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-md">
                    <p className="text-sm font-semibold text-destructive">⏱️ Güvenlik nedeniyle geçici olarak kilitlendi</p>
                    <p className="text-sm text-destructive mt-1">Kalan süre: {formatTime(lockRemaining)}</p>
                  </div>
                )}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-posta</FormLabel>
                        <FormControl><Input type="email" placeholder="E-posta adresiniz" {...field} disabled={isLocked} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şifre</FormLabel>
                        <FormControl><Input type="password" placeholder="Şifreniz" {...field} disabled={isLocked} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
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
                    <FormField control={backupForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-posta</FormLabel>
                        <FormControl><Input type="email" placeholder="E-posta adresiniz" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={backupForm.control} name="code" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yedek Kod</FormLabel>
                        <FormControl><Input placeholder="AB12-CD3-456E" className="font-mono uppercase" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <p className="text-xs text-muted-foreground">Email adresinize şifre sıfırlama linki gönderilecektir.</p>
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
