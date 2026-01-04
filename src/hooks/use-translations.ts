import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TranslationContextType {
  currentLanguage: string;
  translations: Record<string, string>;
  exchangeRates: Record<string, number>;
  currencySymbol: string;
  setLanguage: (code: string) => void;
  t: (key: string, fallback?: string) => string;
  formatPrice: (priceInTRY: number) => string;
  convertPrice: (priceInTRY: number) => number;
  refreshRates: () => Promise<void>;
  isLoading: boolean;
}

const defaultContext: TranslationContextType = {
  currentLanguage: "tr",
  translations: {},
  exchangeRates: {},
  currencySymbol: "₺",
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  formatPrice: (price) => `₺${price.toFixed(2)}`,
  convertPrice: (price) => price,
  refreshRates: async () => {},
  isLoading: true,
};

export const TranslationContext = createContext<TranslationContextType>(defaultContext);

export const useTranslations = () => {
  const context = useContext(TranslationContext);
  return context;
};

interface LanguageInfo {
  code: string;
  currency_code: string;
  currency_symbol: string;
}

export const useTranslationProvider = () => {
  const [currentLanguage, setCurrentLanguage] = useState("tr");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [languageInfo, setLanguageInfo] = useState<LanguageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference
  useEffect(() => {
    const savedLang = localStorage.getItem("preferred_language") || "tr";
    setCurrentLanguage(savedLang);
    loadLanguageInfo(savedLang);
    loadTranslations(savedLang);
    loadExchangeRates();
  }, []);

  const loadLanguageInfo = async (langCode: string) => {
    const { data } = await supabase
      .from("supported_languages")
      .select("code, currency_code, currency_symbol")
      .eq("code", langCode)
      .eq("is_active", true)
      .maybeSingle();
    
    if (data) {
      setLanguageInfo(data);
    } else {
      setLanguageInfo({ code: "tr", currency_code: "TRY", currency_symbol: "₺" });
    }
  };

  const loadTranslations = async (langCode: string) => {
    setIsLoading(true);
    const { data } = await supabase
      .from("translations")
      .select("translation_key, translation_value")
      .eq("language_code", langCode);
    
    if (data) {
      const translationMap: Record<string, string> = {};
      data.forEach((t) => {
        translationMap[t.translation_key] = t.translation_value;
      });
      setTranslations(translationMap);
    }
    setIsLoading(false);
  };

  const loadExchangeRates = async () => {
    const { data } = await supabase
      .from("exchange_rates")
      .select("to_currency, rate");
    
    if (data) {
      const ratesMap: Record<string, number> = {};
      data.forEach((r) => {
        ratesMap[r.to_currency] = Number(r.rate);
      });
      setExchangeRates(ratesMap);
    }
  };

  const refreshRates = useCallback(async () => {
    try {
      await supabase.functions.invoke("fetch-exchange-rates");
      await loadExchangeRates();
    } catch (error) {
      console.error("Error refreshing rates:", error);
    }
  }, []);

  const setLanguage = useCallback((code: string) => {
    setCurrentLanguage(code);
    localStorage.setItem("preferred_language", code);
    loadLanguageInfo(code);
    loadTranslations(code);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent("languageChange", { detail: { code } }));
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  }, [translations]);

  const convertPrice = useCallback((priceInTRY: number): number => {
    if (!languageInfo || languageInfo.currency_code === "TRY") {
      return priceInTRY;
    }
    const rate = exchangeRates[languageInfo.currency_code];
    if (rate) {
      return priceInTRY * rate;
    }
    return priceInTRY;
  }, [languageInfo, exchangeRates]);

  const formatPrice = useCallback((priceInTRY: number): string => {
    const converted = convertPrice(priceInTRY);
    const symbol = languageInfo?.currency_symbol || "₺";
    return `${symbol}${converted.toFixed(2)}`;
  }, [convertPrice, languageInfo]);

  return {
    currentLanguage,
    translations,
    exchangeRates,
    currencySymbol: languageInfo?.currency_symbol || "₺",
    setLanguage,
    t,
    formatPrice,
    convertPrice,
    refreshRates,
    isLoading,
  };
};
