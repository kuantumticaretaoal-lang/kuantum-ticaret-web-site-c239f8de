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
import { useToast } from "@/hooks/use-toast";

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
  level: number; // 0: no lock, 1: 30s, 2: 2m, 3: 5m, 4: 30m, 5: 24h
}

const LOCK_DURATIONS = [0, 30000, 120000, 300000, 1800000, 86400000]; // in milliseconds

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const backupForm = useForm<z.infer<typeof backupCodeSchema>>({
    resolver: zodResolver(backupCodeSchema),
    defaultValues: {
      email: "",
      code: "",
    },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check rate limit on component mount and set up timer
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

    // Check if locked
    if (rateLimitData && rateLimitData.lockUntil > Date.now()) {
      const remaining = rateLimitData.lockUntil - Date.now();
      toast({
        variant: "destructive",
        title: "Çok Fazla Başarısız Deneme",
        description: `Güvenlik için lütfen ${formatTime(remaining)} bekleyiniz`,
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(values.email, values.password);
      
      if (error) {
        // Failed login - update rate limit
        const currentData = rateLimitData || { email: values.email, attempts: 0, lockUntil: 0, level: 0 };
        currentData.attempts += 1;

        if (currentData.attempts >= 3) {
          // Lock the account
          currentData.level = Math.min(currentData.level + 1, LOCK_DURATIONS.length - 1);
          currentData.lockUntil = Date.now() + LOCK_DURATIONS[currentData.level];
          currentData.attempts = 0;

          setRateLimitData(currentData);
          setLockRemaining(currentData.lockUntil - Date.now());

          toast({
            variant: "destructive",
            title: "Çok Fazla Başarısız Deneme",
            description: `Güvenlik için lütfen ${formatTime(LOCK_DURATIONS[currentData.level])} bekleyiniz`,
          });
        } else {
          setRateLimitData(currentData);
          toast({
            variant: "destructive",
            title: "Giriş Başarısız",
            description: `E-posta veya şifre hatalı (${3 - currentData.attempts} deneme hakkınız kaldı)`,
          });
        }
      } else {
        // Successful login - reset rate limit
        localStorage.removeItem(`rateLimit_${values.email}`);
        toast({
          title: "Giriş Başarılı",
          description: "Hoş geldiniz!",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bir hata oluştu, lütfen tekrar deneyin",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onBackupCodeSubmit = async (values: z.infer<typeof backupCodeSchema>) => {
    setIsLoading(true);
    try {
      // Get user ID from email first
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", values.email.toLowerCase())
        .maybeSingle();
      
      if (userError || !userData) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Bu email adresi ile kayıtlı bir kullanıcı bulunamadı",
        });
        setIsLoading(false);
        return;
      }

      // Verify backup code with user ID
      const { valid, error: verifyError } = await verifyBackupCode(userData.id, values.code);
      
      if (verifyError || !valid) {
        toast({
          variant: "destructive",
          title: "Kod Geçersiz",
          description: "Yedek kod geçersiz veya kullanılmış",
        });
        setIsLoading(false);
        return;
      }

      // Send password reset email - Supabase will only send if email matches the user
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        values.email.toLowerCase(),
        {
          redirectTo: `${window.location.origin}/account`,
        }
      );

      if (resetError) {
        toast({
          variant: "destructive",
          title: "Email Gönderilemedi",
          description: "Şifre sıfırlama linki gönderilemedi: " + resetError.message,
        });
        setIsLoading(false);
        return;
      }

      // Generate new backup code immediately after successful recovery
      await createBackupCode(userData.id);

      toast({
        title: "Hesabınız Güvenli Bir Şekilde Kurtarıldı!",
        description: "Email adresinize şifre sıfırlama linki gönderildi. Lütfen email'inizi kontrol edin ve yeni şifrenizi belirleyin. Yeni yedek kodunuz oluşturuldu.",
        duration: 8000,
      });
      
      backupForm.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bir hata oluştu, lütfen tekrar deneyin",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen email adresinizi girin",
      });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      forgotPasswordEmail.toLowerCase(),
      {
        redirectTo: `${window.location.origin}/account`,
      }
    );

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Email gönderilemedi: " + error.message,
      });
      return;
    }

    toast({
      title: "Başarılı",
      description: "Şifre sıfırlama linki email adresinize gönderildi. Birisi şifrenizi sıfırlama isteği gönderdi. Eğer bu işlem bilginiz / rızanız dışında ise lütfen bu maili görmezden geliniz. Hiçbir şey etkilenmeyecektir.",
      duration: 8000,
    });

    setShowForgotPassword(false);
    setForgotPasswordEmail("");
  };

  const isLocked = lockRemaining > 0;

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
                    <p className="text-sm font-semibold text-destructive">
                      ⏱️ Güvenlik nedeniyle geçici olarak kilitlendi
                    </p>
                    <p className="text-sm text-destructive mt-1">
                      Kalan süre: {formatTime(lockRemaining)}
                    </p>
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
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="E-posta adresiniz" 
                              {...field} 
                              disabled={isLocked}
                            />
                          </FormControl>
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
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Şifreniz" 
                              {...field} 
                              disabled={isLocked}
                            />
                          </FormControl>
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
                  <Button
                    variant="link"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm"
                  >
                    Şifremi Unuttum
                  </Button>
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
                          <FormControl>
                            <Input type="email" placeholder="E-posta adresiniz" {...field} />
                          </FormControl>
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
                          <FormControl>
                            <Input placeholder="AB12-CD3-456E" className="font-mono uppercase" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      Email adresinize şifre sıfırlama linki gönderilecektir.
                    </p>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "İşleniyor..." : "Hesabı Kurtar"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Hesabınız yok mu? </span>
              <Link to="/register" className="text-primary hover:underline">
                Kayıt Ol
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifremi Unuttum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="forgot-email">Email Adresi</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="ornek@email.com"
              />
            </div>
            <Button onClick={handleForgotPassword} className="w-full">
              Şifre Sıfırlama Linki Gönder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default LoginPage;
