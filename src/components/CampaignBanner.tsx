import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Banner {
  id: string;
  title: string;
  description: string | null;
  background_image_url: string | null;
  background_color: string;
  text_color: string;
  countdown_end: string | null;
  show_countdown: boolean;
  scrolling_text: string | null;
  hide_days_after_close: number;
  is_dismissible: boolean;
  scroll_speed: number;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CampaignBannerProps {
  currentPage: 'home' | 'homepage' | 'products' | 'category' | 'other';
}

const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

export const CampaignBanner = ({ currentPage }: CampaignBannerProps) => {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [hasCartItems, setHasCartItems] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: membership } = await supabase
          .from('premium_memberships')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        setIsPremium(!!membership);

        const { data: profile } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          const createdAt = new Date(profile.created_at);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          setIsNewUser(createdAt > sevenDaysAgo);
        }

        const { data: cart } = await supabase
          .from('cart')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        setHasCartItems(!!cart && cart.length > 0);
      } else {
        const sessionId = localStorage.getItem('session_id');
        if (sessionId) {
          const { data: cart } = await supabase
            .from('cart')
            .select('id')
            .eq('session_id', sessionId)
            .limit(1);
          setHasCartItems(!!cart && cart.length > 0);
        }
      }
    };

    checkUser();
  }, []);

  const loadBanner = useCallback(async () => {
    const deviceId = getDeviceId();

    // NOTE: user_id is UUID; never query with "user_id.eq.null" (causes 22P02 invalid uuid)
    let dismissalsQuery = supabase
      .from("banner_dismissals")
      .select("banner_id, dismissed_at");

    if (user?.id) {
      dismissalsQuery = dismissalsQuery.or(`user_id.eq.${user.id},device_id.eq.${deviceId}`);
    } else {
      // Anonymous users: dismissals are tracked by device_id
      dismissalsQuery = dismissalsQuery.eq("device_id", deviceId);
    }

    const { data: dismissals, error: dismissalsError } = await dismissalsQuery;
    if (dismissalsError) {
      // Don't block the UI if dismissals can't be loaded
      console.warn("banner_dismissals load failed", dismissalsError);
    }
    const dismissedBannerIds = new Set<string>();
    dismissals?.forEach(d => {
      dismissedBannerIds.add(d.banner_id);
    });

    const { data: banners } = await supabase
      .from('campaign_banners')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (!banners || banners.length === 0) {
      setBanner(null);
      return;
    }

    for (const b of banners) {
      const isDismissible = b.is_dismissible !== false;
      
      if (isDismissible && dismissedBannerIds.has(b.id)) {
        const dismissal = dismissals?.find(d => d.banner_id === b.id);
        if (dismissal && b.hide_days_after_close > 0) {
          const dismissedAt = new Date(dismissal.dismissed_at);
          const hideUntil = new Date(dismissedAt);
          hideUntil.setDate(hideUntil.getDate() + b.hide_days_after_close);
          if (new Date() < hideUntil) continue;
        } else if (b.hide_days_after_close === 0) {
          continue;
        }
      }

      if (!b.show_on_all_pages) {
        if ((currentPage === 'home' || currentPage === 'homepage') && !b.show_on_homepage) continue;
        if ((currentPage === 'products' || currentPage === 'category') && !b.show_on_products) continue;
        if (currentPage === 'other' && !b.show_on_homepage && !b.show_on_products) continue;
      }

      if (!b.target_all_users) {
        if (b.target_new_users && !isNewUser) continue;
        if (b.target_premium_users && !isPremium) continue;
        if (b.target_cart_users && !hasCartItems) continue;
      }

      if (b.countdown_end) {
        const endDate = new Date(b.countdown_end);
        if (endDate <= new Date()) continue;
      }

      setBanner({
        ...b,
        scroll_speed: b.scroll_speed || 15
      });
      return;
    }

    setBanner(null);
  }, [currentPage, user, isPremium, isNewUser, hasCartItems]);

  useEffect(() => {
    loadBanner();
  }, [loadBanner]);

  useEffect(() => {
    if (!banner?.countdown_end || !banner.show_countdown) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(banner.countdown_end!).getTime();
      const distance = end - now;

      if (distance <= 0) {
        setTimeRemaining(null);
        loadBanner();
        return;
      }

      setTimeRemaining({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [banner, loadBanner]);

  const handleDismiss = async () => {
    if (!banner || !banner.is_dismissible) return;
    
    const deviceId = getDeviceId();
    
    await supabase.from('banner_dismissals').insert({
      banner_id: banner.id,
      user_id: user?.id || null,
      device_id: deviceId,
    });

    setIsVisible(false);
  };

  if (!banner || !isVisible) return null;

  const getBackgroundStyle = (): React.CSSProperties => {
    if (banner.background_image_url) {
      return {
        backgroundImage: `url(${banner.background_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: banner.text_color,
      };
    }
    if (banner.background_color.includes('gradient')) {
      return {
        background: banner.background_color,
        color: banner.text_color,
      };
    }
    return {
      backgroundColor: banner.background_color,
      color: banner.text_color,
    };
  };

  const scrollSpeed = banner.scroll_speed || 15;

  return (
    <div 
      className="relative w-full py-2 sm:py-3 px-2 sm:px-4 overflow-hidden"
      style={getBackgroundStyle()}
    >
      <div className="container mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Kayan yazı veya başlık */}
        <div className="flex-1 overflow-hidden min-w-0">
          {banner.scrolling_text ? (
            <div 
              className="whitespace-nowrap"
              style={{
                animation: `marquee ${scrollSpeed}s linear infinite`,
              }}
            >
              <span className="mx-2 sm:mx-4 text-sm sm:text-base">{banner.scrolling_text}</span>
              <span className="mx-2 sm:mx-4 text-sm sm:text-base">{banner.scrolling_text}</span>
              <span className="mx-2 sm:mx-4 text-sm sm:text-base">{banner.scrolling_text}</span>
            </div>
          ) : (
            <div className="text-center">
              <span className="font-bold text-sm sm:text-lg">{banner.title}</span>
              {banner.description && (
                <span className="ml-2 text-xs sm:text-sm opacity-90 hidden sm:inline">{banner.description}</span>
              )}
            </div>
          )}
        </div>

        {/* Geri sayım - mobilde gizle */}
        {banner.show_countdown && timeRemaining && (
          <div className="hidden sm:flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-mono bg-black/20 rounded-lg px-2 sm:px-3 py-1 flex-shrink-0">
            <div className="text-center">
              <span className="text-sm sm:text-lg font-bold">{timeRemaining.days}</span>
              <span className="text-[10px] sm:text-xs block opacity-75">Gün</span>
            </div>
            <span className="text-sm sm:text-lg">:</span>
            <div className="text-center">
              <span className="text-sm sm:text-lg font-bold">{String(timeRemaining.hours).padStart(2, '0')}</span>
              <span className="text-[10px] sm:text-xs block opacity-75">Saat</span>
            </div>
            <span className="text-sm sm:text-lg">:</span>
            <div className="text-center">
              <span className="text-sm sm:text-lg font-bold">{String(timeRemaining.minutes).padStart(2, '0')}</span>
              <span className="text-[10px] sm:text-xs block opacity-75">Dk</span>
            </div>
            <span className="text-sm sm:text-lg">:</span>
            <div className="text-center">
              <span className="text-sm sm:text-lg font-bold">{String(timeRemaining.seconds).padStart(2, '0')}</span>
              <span className="text-[10px] sm:text-xs block opacity-75">Sn</span>
            </div>
          </div>
        )}

        {/* Mobil geri sayım - sadece saat:dakika */}
        {banner.show_countdown && timeRemaining && (
          <div className="flex sm:hidden items-center gap-1 text-xs font-mono bg-black/20 rounded px-2 py-1 flex-shrink-0">
            <span className="font-bold">{timeRemaining.days}g</span>
            <span>:</span>
            <span className="font-bold">{String(timeRemaining.hours).padStart(2, '0')}</span>
            <span>:</span>
            <span className="font-bold">{String(timeRemaining.minutes).padStart(2, '0')}</span>
          </div>
        )}

        {/* Kapat butonu */}
        {banner.is_dismissible !== false && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 sm:h-6 sm:w-6 hover:bg-white/20 flex-shrink-0"
            onClick={handleDismiss}
            style={{ color: banner.text_color }}
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        )}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>
    </div>
  );
};