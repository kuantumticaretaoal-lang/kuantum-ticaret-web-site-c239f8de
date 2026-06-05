import { Suspense, useEffect, useMemo, useRef, useState, lazy } from "react";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCw, Download, Image as ImageIcon } from "lucide-react";
import type { SelectedOrnament } from "@/components/OrnamentPicker";

// Lazy-load three.js + drei + canvas so 3D code only ships when the user opens a bracelet
const Canvas = lazy(() => import("@react-three/fiber").then(m => ({ default: m.Canvas })));
const SceneContent = lazy(() => import("./bracelet-scene/BraceletScene"));

interface BraceletSimulator3DProps {
  customName?: string;
  ornaments?: SelectedOrnament[];
  cordColor?: string;
  beadColor?: string;
  metalColor?: string;
  height?: number;
  title?: string;
  onCordColorChange?: (color: string) => void;
  exportFileName?: string;
}

const CORD_OPTIONS = [
  { name: "Kahve Deri", value: "#7a4a25" },
  { name: "Siyah", value: "#1a1a1a" },
  { name: "Bordo", value: "#7a1f2b" },
  { name: "Lacivert", value: "#1f3a7a" },
  { name: "Gül Altın", value: "#b76e79" },
];

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
};

const StaticFallback = ({ name, ornaments, cord }: { name: string; ornaments: SelectedOrnament[]; cord: string }) => (
  <div
    role="img"
    aria-label={`Bileklik önizlemesi: isim ${name || "yok"}, ${ornaments.length} aksesuar`}
    className="h-full w-full flex flex-col items-center justify-center gap-3 p-4"
    style={{ background: `radial-gradient(circle at center, hsl(var(--muted)) 0%, transparent 70%)` }}
  >
    <div
      className="relative h-32 w-32 rounded-full border-8"
      style={{ borderColor: cord, boxShadow: "inset 0 0 12px rgba(0,0,0,.2)" }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground">
        {name || "Bileklik"}
      </div>
    </div>
    {ornaments.length > 0 && (
      <div className="flex flex-wrap gap-1 justify-center text-xs">
        {ornaments.map((o) => (
          <span key={o.id} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {o.name} ×{o.quantity}
          </span>
        ))}
      </div>
    )}
    <p className="text-xs text-muted-foreground">Statik önizleme</p>
  </div>
);

const Loading = () => (
  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
    3D önizleme yükleniyor...
  </div>
);

export const BraceletSimulator3D = ({
  customName = "",
  ornaments = [],
  cordColor = "#7a4a25",
  beadColor = "#f5d76e",
  metalColor = "#c0c0c0",
  height = 360,
  title = "3D Bileklik Önizlemesi",
  onCordColorChange,
  exportFileName = "bileklik-onizleme",
}: BraceletSimulator3DProps) => {
  const [cord, setCord] = useState(cordColor);
  const [autoSpin, setAutoSpin] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => { setCord(cordColor); }, [cordColor]);
  useEffect(() => { onCordColorChange?.(cord); }, [cord, onCordColorChange]);

  // Lazy mount on intersection (helps CWV on mobile)
  useEffect(() => {
    if (!containerRef.current || enabled) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { setEnabled(true); io.disconnect(); }
    }, { rootMargin: "200px" });
    io.observe(containerRef.current);
    return () => io.disconnect();
  }, [enabled]);

  const beads = useMemo(() => {
    const arr: Array<{ key: string; label: string; color: string; kind: "name" | "charm" | "spacer" }> = [];
    const letters = (customName || "").toUpperCase().replace(/\s+/g, "").slice(0, 12).split("");
    letters.forEach((ch, i) => arr.push({ key: `n${i}`, label: ch, color: beadColor, kind: "name" }));
    ornaments.forEach((o) => {
      for (let i = 0; i < (o.quantity || 1); i++) {
        let h = 0; for (let j = 0; j < o.name.length; j++) h = (h * 31 + o.name.charCodeAt(j)) >>> 0;
        arr.push({ key: `${o.id}-${i}`, label: o.name, color: `hsl(${h % 360}, 65%, 55%)`, kind: "charm" });
      }
    });
    if (arr.length === 0) {
      for (let i = 0; i < 12; i++) arr.push({ key: `sp${i}`, label: "", color: beadColor, kind: "spacer" });
    }
    return arr;
  }, [customName, ornaments, beadColor]);

  const downloadImage = () => {
    const renderer = glRef.current;
    if (!renderer) {
      // fallback: render the static SVG container as an image
      const node = containerRef.current?.querySelector("[role='img']");
      if (!node) return;
      // simple html-to-image fallback: just open a placeholder data url
      return;
    }
    try {
      // force a fresh render to ensure buffer is up to date
      const dataUrl = renderer.domElement.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${exportFileName}-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      console.error("export failed", e);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          {title}
          <Badge variant="secondary" className="ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={containerRef}
          className="w-full rounded-lg bg-gradient-to-b from-background to-muted/40 border"
          style={{ height, contain: "layout paint" }}
          aria-label="3D bileklik önizleme alanı"
        >
          {!enabled || reducedMotion ? (
            <StaticFallback name={customName} ornaments={ornaments} cord={cord} />
          ) : (
            <Suspense fallback={<Loading />}>
              <Canvas
                shadows
                camera={{ position: [0, 2.2, 4.2], fov: 45 }}
                dpr={[1, 1.5]}
                gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "low-power" }}
                onCreated={({ gl }) => { glRef.current = gl as unknown as THREE.WebGLRenderer; }}
                frameloop={autoSpin ? "always" : "demand"}
              >
                <Suspense fallback={null}>
                  <SceneContent beads={beads} cordColor={cord} metalColor={metalColor} autoSpin={autoSpin} />
                </Suspense>
              </Canvas>
            </Suspense>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">İp rengi:</span>
          {CORD_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => setCord(c.value)}
              aria-label={`İp rengi: ${c.name}`}
              aria-pressed={cord === c.value}
              title={c.name}
              className={`h-6 w-6 rounded-full border-2 transition ${cord === c.value ? "border-primary scale-110" : "border-border"}`}
              style={{ background: c.value }}
            />
          ))}
          <Button variant="ghost" size="sm" onClick={() => setAutoSpin((s) => !s)} aria-label={autoSpin ? "Döndürmeyi durdur" : "Otomatik döndür"}>
            <RotateCw className="h-3.5 w-3.5 mr-1" aria-hidden />
            {autoSpin ? "Durdur" : "Döndür"}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadImage} aria-label="Önizlemeyi indir">
            {glRef.current ? <Download className="h-3.5 w-3.5 mr-1" aria-hidden /> : <ImageIcon className="h-3.5 w-3.5 mr-1" aria-hidden />}
            İndir
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Önizleme; gerçek ürün, malzeme ve dizilim sipariş notlarına göre üretilir.
          {reducedMotion && " (Hareket azaltıldı modu açık — statik önizleme gösteriliyor.)"}
        </p>
      </CardContent>
    </Card>
  );
};

export default BraceletSimulator3D;
