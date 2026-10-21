import { browserStorage, readStoredArray } from "@/lib/browser-storage";
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'recently_viewed_products';
const MAX_ITEMS = 10;

interface RecentlyViewedProduct {
  id: string;
  title: string;
  price: number;
  discounted_price?: number;
  image_url?: string;
  viewed_at: number;
}

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);

  useEffect(() => {
    setRecentlyViewed(readStoredArray(STORAGE_KEY, (value): value is RecentlyViewedProduct => {
      if (!value || typeof value !== "object") return false;
      const product = value as Partial<RecentlyViewedProduct>;
      return typeof product.id === "string" && typeof product.title === "string"
        && typeof product.price === "number" && Number.isFinite(product.price)
        && typeof product.viewed_at === "number";
    }).slice(0, MAX_ITEMS));
  }, []);

  const addToRecentlyViewed = (product: Omit<RecentlyViewedProduct, 'viewed_at'>) => {
    setRecentlyViewed((prev) => {
      // Remove if already exists
      const filtered = prev.filter((p) => p.id !== product.id);
      
      // Add to beginning with timestamp
      const newItem: RecentlyViewedProduct = {
        ...product,
        viewed_at: Date.now(),
      };
      
      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
      browserStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentlyViewed = () => {
    browserStorage.removeItem(STORAGE_KEY);
    setRecentlyViewed([]);
  };

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
  };
};
