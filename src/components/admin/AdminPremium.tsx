import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Crown, Check, X, Clock, Gift, Truck, Zap, Plus, Trash2, UserPlus } from "lucide-react";

interface PremiumPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  discount_percent: number;
  free_shipping: boolean;
  early_access: boolean;
  is_active: boolean;
}

interface PremiumBenefit {
  id: string;
  plan_id: string;
  benefit_text: string;
  sort_order: number;
}

interface PremiumRequest {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  premium_plans?: {
    name: string;
  };
}

interface PremiumMembership {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  is_trial: boolean;
  trial_days: number | null;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  premium_plans?: {
    name: string;
  };
}

export const AdminPremium = () => {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [benefits, setBenefits] = useState<PremiumBenefit[]>([]);
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [memberships, setMemberships] = useState<PremiumMembership[]>([]);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PremiumPlan | null>(null);
  const [newBenefitText, setNewBenefitText] = useState('');
  const [planFormData, setPlanFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration_days: 30,
    discount_percent: 0,
    free_shipping: false,
    early_access: false,
    is_active: true,
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [trialDays, setTrialDays] = useState(7);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const loadData = async () => {
    // Planları yükle
    const { data: plansData } = await supabase
      .from('premium_plans')
      .select('*')
      .order('price');
    setPlans(plansData || []);

    // Avantajları yükle
    const { data: benefitsData } = await supabase
      .from('premium_benefits')
      .select('*')
      .order('sort_order');
    setBenefits(benefitsData || []);

    // İstekleri yükle
    const { data: requestsData } = await supabase
      .from('premium_requests')
      .select(`*, premium_plans:plan_id (name)`)
      .order('created_at', { ascending: false });
    
    // Profil bilgilerini ayrı çek
    if (requestsData && requestsData.length > 0) {
      const userIds = [...new Set(requestsData.map(r => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
      const enrichedRequests = requestsData.map(r => ({
        ...r,
        profiles: profilesMap.get(r.user_id) || null
      }));
      setRequests(enrichedRequests as any);
    } else {
      setRequests([]);
    }

    // Üyelikleri yükle
    const { data: membershipsData } = await supabase
      .from('premium_memberships')
      .select(`*, premium_plans:plan_id (name)`)
      .order('created_at', { ascending: false });
    
    if (membershipsData && membershipsData.length > 0) {
      const userIds = [...new Set(membershipsData.map(m => m.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
      const enrichedMemberships = membershipsData.map(m => ({
        ...m,
        profiles: profilesMap.get(m.user_id) || null
      }));
      setMemberships(enrichedMemberships as any);
    } else {
      setMemberships([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const savePlan = async () => {
    if (!planFormData.name.trim()) {
      toast.error('Plan adı zorunludur');
      return;
    }

    if (editingPlan) {
      const { error } = await supabase
        .from('premium_plans')
        .update(planFormData)
        .eq('id', editingPlan.id);

      if (error) {
        toast.error('Plan güncellenirken hata oluştu');
        return;
      }
      toast.success('Plan güncellendi');
    } else {
      const { error } = await supabase
        .from('premium_plans')
        .insert([planFormData]);

      if (error) {
        toast.error('Plan eklenirken hata oluştu');
        return;
      }
      toast.success('Plan eklendi');
    }

    setIsPlanDialogOpen(false);
    setEditingPlan(null);
    setPlanFormData({
      name: '',
      description: '',
      price: 0,
      duration_days: 30,
      discount_percent: 0,
      free_shipping: false,
      early_access: false,
      is_active: true,
    });
    loadData();
  };

  const addBenefit = async (planId: string) => {
    if (!newBenefitText.trim()) return;

    const { error } = await supabase
      .from('premium_benefits')
      .insert([{
        plan_id: planId,
        benefit_text: newBenefitText,
        sort_order: benefits.filter(b => b.plan_id === planId).length,
      }]);

    if (error) {
      toast.error('Avantaj eklenirken hata oluştu');
      return;
    }

    setNewBenefitText('');
    loadData();
  };

  const deleteBenefit = async (benefitId: string) => {
    const { error } = await supabase
      .from('premium_benefits')
      .delete()
      .eq('id', benefitId);

    if (error) {
      toast.error('Avantaj silinirken hata oluştu');
      return;
    }
    loadData();
  };

  const handleRequest = async (requestId: string, userId: string, planId: string, approve: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();

    // İsteği güncelle
    const { error: requestError } = await supabase
      .from('premium_requests')
      .update({
        status: approve ? 'approved' : 'rejected',
        rejection_reason: approve ? null : rejectionReason,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (requestError) {
      toast.error('İstek güncellenirken hata oluştu');
      return;
    }

    // Onaylandıysa üyelik oluştur
    if (approve) {
      const plan = plans.find(p => p.id === planId);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (plan?.duration_days || 30));

      const { error: membershipError } = await supabase
        .from('premium_memberships')
        .insert([{
          user_id: userId,
          plan_id: planId,
          status: 'active',
          starts_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          is_trial: false,
        }]);

      if (membershipError) {
        toast.error('Üyelik oluşturulurken hata oluştu');
        return;
      }

      // Bildirim gönder
      await supabase.from('notifications').insert([{
        user_id: userId,
        message: `Kuantum Premium üyeliğiniz onaylandı! 🎉 ${plan?.name} planına hoş geldiniz.`,
      }]);
    } else {
      // Reddedildiyse bildirim gönder
      await supabase.from('notifications').insert([{
        user_id: userId,
        message: `Premium üyelik talebiniz reddedildi. ${rejectionReason ? `Sebep: ${rejectionReason}` : ''}`,
      }]);
    }

    toast.success(approve ? 'İstek onaylandı' : 'İstek reddedildi');
    setRejectionReason('');
    loadData();
  };

  const grantTrialMembership = async (userId: string, planId: string, days: number) => {
    const plan = plans.find(p => p.id === planId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { error } = await supabase
      .from('premium_memberships')
      .insert([{
        user_id: userId,
        plan_id: planId,
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        is_trial: true,
        trial_days: days,
      }]);

    if (error) {
      toast.error('Deneme üyeliği oluşturulurken hata oluştu');
      return;
    }

    await supabase.from('notifications').insert([{
      user_id: userId,
      message: `${days} günlük ücretsiz Kuantum Premium deneme süreniz başladı! 🎁`,
    }]);

    toast.success(`${days} günlük deneme üyeliği verildi`);
    loadData();
  };

  const cancelMembership = async (membershipId: string, userId: string) => {
    const { error } = await supabase
      .from('premium_memberships')
      .update({ status: 'cancelled' })
      .eq('id', membershipId);

    if (error) {
      toast.error('Üyelik iptal edilirken hata oluştu');
      return;
    }

    await supabase.from('notifications').insert([{
      user_id: userId,
      message: 'Kuantum Premium üyeliğiniz iptal edildi.',
    }]);

    toast.success('Üyelik iptal edildi');
    loadData();
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Crown className="h-6 w-6 text-yellow-500" />
        <h2 className="text-2xl font-bold">Kuantum Premium Yönetimi</h2>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="relative">
            İstekler
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-destructive">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="memberships">Üyelikler</TabsTrigger>
          <TabsTrigger value="plans">Planlar</TabsTrigger>
        </TabsList>

        {/* İstekler */}
        <TabsContent value="requests" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {request.profiles?.first_name} {request.profiles?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.profiles?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{request.premium_plans?.name || '-'}</TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      request.status === 'approved' ? 'default' :
                      request.status === 'rejected' ? 'destructive' :
                      'secondary'
                    }>
                      {request.status === 'approved' ? 'Onaylandı' :
                       request.status === 'rejected' ? 'Reddedildi' :
                       'Bekliyor'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleRequest(request.id, request.user_id, request.plan_id, true)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Onayla
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <X className="h-4 w-4 mr-1" />
                              Reddet
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>İsteği Reddet</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Ret Nedeni (Opsiyonel)</Label>
                                <Textarea
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Kullanıcıya iletilecek ret nedeni..."
                                />
                              </div>
                              <Button 
                                variant="destructive"
                                onClick={() => handleRequest(request.id, request.user_id, request.plan_id, false)}
                              >
                                Reddet
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Henüz premium isteği yok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Üyelikler */}
        <TabsContent value="memberships" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Başlangıç</TableHead>
                <TableHead>Bitiş</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map((membership) => (
                <TableRow key={membership.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {membership.profiles?.first_name} {membership.profiles?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {membership.profiles?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{membership.premium_plans?.name || '-'}</TableCell>
                  <TableCell>
                    {new Date(membership.starts_at).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell>
                    {membership.expires_at 
                      ? new Date(membership.expires_at).toLocaleDateString('tr-TR')
                      : 'Süresiz'}
                  </TableCell>
                  <TableCell>
                    {membership.is_trial ? (
                      <Badge variant="outline">
                        <Gift className="h-3 w-3 mr-1" />
                        Deneme ({membership.trial_days} gün)
                      </Badge>
                    ) : (
                      <Badge>Tam Üyelik</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      membership.status === 'active' ? 'default' :
                      membership.status === 'expired' ? 'secondary' :
                      'destructive'
                    }>
                      {membership.status === 'active' ? 'Aktif' :
                       membership.status === 'expired' ? 'Süresi Doldu' :
                       'İptal Edildi'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {membership.status === 'active' && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => cancelMembership(membership.id, membership.user_id)}
                      >
                        İptal Et
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {memberships.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Henüz premium üye yok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Planlar */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPlan ? 'Plan Düzenle' : 'Yeni Plan Ekle'}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Plan Adı *</Label>
                    <Input
                      value={planFormData.name}
                      onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                      placeholder="Kuantum Premium"
                    />
                  </div>

                  <div>
                    <Label>Açıklama</Label>
                    <Textarea
                      value={planFormData.description}
                      onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                      placeholder="Tüm avantajlardan yararlanın..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ücret (₺)</Label>
                      <Input
                        type="number"
                        value={planFormData.price}
                        onChange={(e) => setPlanFormData({ ...planFormData, price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Süre (Gün)</Label>
                      <Input
                        type="number"
                        value={planFormData.duration_days}
                        onChange={(e) => setPlanFormData({ ...planFormData, duration_days: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>İndirim Oranı (%)</Label>
                    <Input
                      type="number"
                      value={planFormData.discount_percent}
                      onChange={(e) => setPlanFormData({ ...planFormData, discount_percent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={planFormData.free_shipping}
                        onCheckedChange={(checked) => setPlanFormData({ ...planFormData, free_shipping: checked })}
                      />
                      <Label className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Ücretsiz Kargo
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={planFormData.early_access}
                        onCheckedChange={(checked) => setPlanFormData({ ...planFormData, early_access: checked })}
                      />
                      <Label className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Erken Erişim
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={planFormData.is_active}
                        onCheckedChange={(checked) => setPlanFormData({ ...planFormData, is_active: checked })}
                      />
                      <Label>Aktif</Label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={savePlan}>
                    {editingPlan ? 'Güncelle' : 'Ekle'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={!plan.is_active ? 'opacity-50' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      {plan.name}
                    </CardTitle>
                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                      {plan.is_active ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    ₺{plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.duration_days} gün
                    </span>
                  </div>

                  <div className="space-y-2">
                    {plan.discount_percent > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary">%{plan.discount_percent} indirim</Badge>
                      </div>
                    )}
                    {plan.free_shipping && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Truck className="h-4 w-4" />
                        Ücretsiz Kargo
                      </div>
                    )}
                    {plan.early_access && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Zap className="h-4 w-4" />
                        Erken Erişim
                      </div>
                    )}
                  </div>

                  {/* Avantajlar */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Özel Avantajlar</Label>
                    {benefits.filter(b => b.plan_id === plan.id).map((benefit) => (
                      <div key={benefit.id} className="flex items-center justify-between text-sm">
                        <span>• {benefit.benefit_text}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => deleteBenefit(benefit.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Yeni avantaj..."
                        value={newBenefitText}
                        onChange={(e) => setNewBenefitText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addBenefit(plan.id)}
                        className="h-8 text-sm"
                      />
                      <Button size="sm" onClick={() => addBenefit(plan.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setEditingPlan(plan);
                      setPlanFormData({
                        name: plan.name,
                        description: plan.description || '',
                        price: plan.price,
                        duration_days: plan.duration_days,
                        discount_percent: plan.discount_percent,
                        free_shipping: plan.free_shipping,
                        early_access: plan.early_access,
                        is_active: plan.is_active,
                      });
                      setIsPlanDialogOpen(true);
                    }}
                  >
                    Düzenle
                  </Button>
                </CardContent>
              </Card>
            ))}

            {plans.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Henüz premium plan oluşturulmamış
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
