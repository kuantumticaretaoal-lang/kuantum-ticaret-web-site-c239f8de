import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useOnlinePresence } from "@/hooks/use-online-presence";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { LiveSupportWidget } from "@/components/LiveSupportWidget";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import VisitorTracker from "./components/VisitorTracker";
import { CookieConsent } from "./components/CookieConsent";
import { MobileBottomNav } from "./components/MobileBottomNav";
import ExitIntentPopup from "./components/ExitIntentPopup";
import RouteProgressBar from "./components/RouteProgressBar";

const Products = lazy(() => import("./pages/Products"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const PoliciesPage = lazy(() => import("./pages/PoliciesPage"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const CartPage = lazy(() => import("./pages/CartPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const SponsorsPage = lazy(() => import("./pages/SponsorsPage"));
const FollowPage = lazy(() => import("./pages/FollowPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ScrollToTop = () => {
  useScrollToTop();
  return null;
};

const AppContent = () => {
  useOnlinePresence();
  
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        İçeriğe atla
      </a>
      <ScrollToTop />
      <RouteProgressBar />
      <VisitorTracker />
      <CookieConsent />
      <LiveSupportWidget />
      <PushNotificationManager />
      <MobileBottomNav />
      <ExitIntentPopup />

      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/sponsors" element={<SponsorsPage />} />
          <Route path="/follow" element={<FollowPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/order/:orderCode" element={<OrderTrackingPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/politikalar" element={<PoliciesPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider defaultTheme="light" attribute="class" storageKey="kuantum-theme">
      <QueryClientProvider client={queryClient}>
        <TranslationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </TranslationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
