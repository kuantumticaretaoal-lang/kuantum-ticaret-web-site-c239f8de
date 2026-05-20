import { useState, useEffect, useRef } from "react";

interface ProductCardImageProps {
  images: { id: string; image_url: string }[];
  alt: string;
  className?: string;
}

/**
 * Trendyol/Hepsiburada tarzı: kart üzerinde durunca diğer fotoğraflar otomatik
 * kayar; mobilde küçük dot/indikatörler görünür ve dokunarak da geçilebilir.
 */
export const ProductCardImage = ({ images, alt, className = "" }: ProductCardImageProps) => {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (hovering && images.length > 1) {
      intervalRef.current = window.setInterval(() => {
        setIndex((i) => (i + 1) % images.length);
      }, 1200);
    } else {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setIndex(0);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [hovering, images.length]);

  if (!images || images.length === 0) return null;

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-muted ${className}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {images.map((img, i) => (
        <img
          key={img.id}
          src={img.image_url}
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"
              }`}
              aria-label={`Resim ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
