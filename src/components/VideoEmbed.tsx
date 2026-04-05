interface VideoEmbedProps {
  url: string;
}

export const VideoEmbed = ({ url }: VideoEmbedProps) => {
  const getEmbedUrl = (rawUrl: string): string | null => {
    try {
      // YouTube
      const ytMatch = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
      // Vimeo
      const vimeoMatch = rawUrl.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      // Direct video
      if (rawUrl.match(/\.(mp4|webm|ogg)(\?|$)/i)) return rawUrl;
      return null;
    } catch { return null; }
  };

  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) return null;

  if (embedUrl.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
    return (
      <video controls className="w-full rounded-lg max-h-[400px]">
        <source src={embedUrl} />
      </video>
    );
  }

  return (
    <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden">
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
};
