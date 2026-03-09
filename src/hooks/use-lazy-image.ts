import { useState, useEffect, useRef } from "react";

export const useLazyImage = (src: string, options?: IntersectionObserverInit) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      { rootMargin: "200px", ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { imgRef, isInView, isLoaded, setIsLoaded, currentSrc: isInView ? src : undefined };
};
