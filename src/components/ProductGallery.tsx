import { useState } from "react";
import { Play, X } from "lucide-react";
import { ImageZoom } from "./ImageZoom";
import { VideoEmbed } from "./VideoEmbed";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GalleryImage {
  id: string;
  image_url: string;
}

interface ProductGalleryProps {
  images: GalleryImage[];
  videoUrl?: string | null;
  title: string;
}

/**
 * Trendyol benzeri ürün galerisi: ana büyük görsel + sol/alt küçük thumbnail
 * şeridi. Video varsa galeride bir Play kutusu olarak gösterilir. Tıklayınca
 * tam ekran lightbox ile büyütülebilir, fareyle üzerinde yakınlaştırma çalışır.
 */
export const ProductGallery = ({ images, videoUrl, title }: ProductGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const items: ({ type: "image"; url: string; id: string } | { type: "video"; url: string; id: string })[] = [
    ...images.map((img) => ({ type: "image" as const, url: img.image_url, id: img.id })),
    ...(videoUrl ? [{ type: "video" as const, url: videoUrl, id: "video" }] : []),
  ];

  if (items.length === 0) {
    return (
      <div className="w-full aspect-square bg-muted rounded-xl flex items-center justify-center">
        <p className="text-muted-foreground">Resim yok</p>
      </div>
    );
  }

  const active = items[Math.min(activeIndex, items.length - 1)];

  return (
    <div className="flex flex-col-reverse md:flex-row gap-3">
      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="flex md:flex-col gap-2 md:max-h-[520px] overflow-x-auto md:overflow-y-auto md:overflow-x-hidden scrollbar-thin">
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`relative shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition ${
                i === activeIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/40"
              }`}
              aria-label={`Görsel ${i + 1}`}
            >
              {it.type === "image" ? (
                <img src={it.url} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Play className="h-6 w-6" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main */}
      <div className="flex-1">
        <div
          className="relative aspect-square rounded-xl overflow-hidden bg-muted cursor-zoom-in"
          onClick={() => active.type === "image" && setLightboxOpen(true)}
        >
          {active.type === "image" ? (
            <ImageZoom src={active.url} alt={title} className="w-full h-full" />
          ) : (
            <VideoEmbed url={active.url} />
          )}
        </div>
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl p-2 bg-background/95">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-2 hover:bg-background"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
          {active?.type === "image" && (
            <img src={active.url} alt={title} className="w-full max-h-[85vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
