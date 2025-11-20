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

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(values.email, values.password);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Giriş Başarısız",
          description: error.message === "Invalid login credentials" 
            ? "E-posta veya şifre hatalı" 
            : error.message,
        });
      } else {
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
      // Verify backup code first
      const { userId, error: verifyError } = await verifyBackupCode(values.code);
      
      if (verifyError || !userId) {
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

      toast({
        title: "Hesabınız Güvenli Bir Şekilde Kurtarıldı!",
        description: "Email adresinize şifre sıfırlama linki gönderildi. Lütfen email'inizi kontrol edin ve yeni şifrenizi belirleyin. Giriş yaptıktan sonra yeni backup kodunuz otomatik oluşturulacak.",
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
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şifre</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Şifreniz" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
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
