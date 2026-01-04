import React, { ReactNode } from "react";
import { TranslationContext, useTranslationProvider } from "@/hooks/use-translations";

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const value = useTranslationProvider();
  
  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};
