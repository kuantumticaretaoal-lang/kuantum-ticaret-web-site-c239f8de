import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logger } from "@/lib/logger";

export const AdminProductQuestions = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadQuestions();

    const channel = supabase
      .channel("admin-questions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_questions" }, () => {
        loadQuestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadQuestions = async () => {
    // Fetch questions without relying on FK joins (they are not defined)
    const { data, error } = await supabase
      .from("product_questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Sorular yüklenemedi", error);
      setQuestions([]);
      return;
    }

    const productIds = Array.from(new Set((data || []).map((q) => q.product_id).filter(Boolean)));
    const userIds = Array.from(new Set((data || []).map((q) => q.user_id).filter(Boolean)));

    let productsMap: Record<string, { title: string }> = {};
    let profilesMap: Record<string, { first_name: string; last_name: string }> = {};

    if (productIds.length > 0) {
      const { data: productsData } = await (supabase as any)
        .from("products")
        .select("id, title")
        .in("id", productIds);
      productsMap = (productsData || []).reduce((acc: any, p: any) => {
        acc[p.id] = { title: p.title };
        return acc;
      }, {} as Record<string, { title: string }>);
    }

    if (userIds.length > 0) {
      const { data: profilesData } = await (supabase as any)
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);
      profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
        acc[p.id] = { first_name: p.first_name, last_name: p.last_name };
        return acc;
      }, {} as Record<string, { first_name: string; last_name: string }>);
    }

    const enriched = (data || []).map((q: any) => ({
      ...q,
      productTitle: q.product_id ? productsMap[q.product_id]?.title : undefined,
      profile: q.user_id ? profilesMap[q.user_id] : undefined,
    }));

    setQuestions(enriched);
  };

  const answerQuestion = async () => {
    if (!answer.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen cevap yazın",
      });
      return;
    }

    const { error } = await supabase
      .from("product_questions")
      .update({
        answer,
        answered_at: new Date().toISOString(),
      })
      .eq("id", selectedQuestion.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Cevap gönderilemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Cevap gönderildi",
      });
      setSelectedQuestion(null);
      setAnswer("");
      loadQuestions();
    }
  };

  const unansweredCount = questions.filter((q) => !q.answer).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Ürün Soruları
            {unansweredCount > 0 && (
              <span className="ml-2 text-sm text-destructive">
                ({unansweredCount} cevaplanmamış)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz soru yok</p>
          ) : (
            questions.map((question) => (
              <Card key={question.id} className={!question.answer ? "border-destructive" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {question.profile?.first_name && question.profile?.last_name
                          ? `${question.profile.first_name} ${question.profile.last_name}`
                          : "Kullanıcı"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ürün: {question.productTitle || "Bilinmiyor"}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(question.created_at).toLocaleDateString("tr-TR")} {new Date(question.created_at).toLocaleTimeString("tr-TR")}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Soru:</p>
                    <p>{question.question}</p>
                  </div>
                  {question.answer ? (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Cevap:</p>
                      <p>{question.answer}</p>
                      {question.answered_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(question.answered_at).toLocaleDateString("tr-TR")} {new Date(question.answered_at).toLocaleTimeString("tr-TR")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setSelectedQuestion(question);
                        setAnswer("");
                      }}
                    >
                      Cevapla
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Soruyu Cevapla</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Soru:</p>
                <p className="font-medium">{selectedQuestion.question}</p>
              </div>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Cevabınızı yazın"
                rows={4}
              />
              <Button onClick={answerQuestion} className="w-full">
                Gönder
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
