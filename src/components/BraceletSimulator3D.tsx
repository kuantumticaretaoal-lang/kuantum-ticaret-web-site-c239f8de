import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCw, Download, Pause } from "lucide-react";
import type { SelectedOrnament } from "@/components/OrnamentPicker";

interface BraceletSimulatorProps {
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
  { name: "Krem", value: "#e8d9b8" },
];

const stringHash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

// A charm slot is either a name-letter bead or an ornament image (or a plain spacer bead)
type Slot =
  | { kind: "letter"; key: string; label: string }
  | { kind: "charm"; key: string; label: string; imageUrl?: string | null; color: string }
  | { kind: "spacer"; key: string };

/**
 * Beautiful 2D SVG bracelet visualizer.
 * Reliable across every device — no WebGL, no lazy loading pitfalls.
 * - Real ornament images are rendered as <image> nodes inside circular metal frames
 * - Name letters are laid out in reading order along the top arc so they never appear reversed
 * - Cord/beads use gradients + drop shadows for a polished look
 */
export const BraceletSimulator3D = ({
  customName = "",
  ornaments = [],
  cordColor = "#7a4a25",
  beadColor = "#f5d76e",
  metalColor = "#c9a866",
  height = 360,
  title = "Bileklik Önizlemesi",
  onCordColorChange,
  exportFileName = "bileklik-onizleme",
}: BraceletSimulatorProps) => {
  const [cord, setCord] = useState(cordColor);
  const [spin, setSpin] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => setCord(cordColor), [cordColor]);
  useEffect(() => onCordColorChange?.(cord), [cord, onCordColorChange]);

  const letters = useMemo(
    () => (customName || "").toUpperCase().replace(/[^A-ZÇĞİÖŞÜ0-9]/g, "").slice(0, 12).split(""),
    [customName]
  );

  const charms = useMemo(() => {
    const arr: Slot[] = [];
    ornaments.forEach((o) => {
      const qty = Math.max(1, Math.min(6, o.quantity || 1));
      for (let i = 0; i < qty; i++) {
        arr.push({
          kind: "charm",
          key: `${o.id}-${i}`,
          label: o.name,
          imageUrl: (o as any).image_url || null,
          color: `hsl(${stringHash(o.name) % 360}, 60%, 55%)`,
        });
      }
    });
    return arr;
  }, [ornaments]);

  // Layout: letters occupy the TOP arc in reading order (left→right),
  // charms hang from the BOTTOM arc, spacer beads fill the rest.
  const layout = useMemo(() => {
    const totalSlots = Math.max(18, letters.length + charms.length + 4);
    const slots: Slot[] = new Array(totalSlots).fill(null).map((_, i) => ({
      kind: "spacer",
      key: `sp-${i}`,
    }));

    // Place letters centered on the top arc, reading L→R
    const topStart = Math.floor(totalSlots / 4); // ≈ 90° mark
    const topEnd = topStart + Math.min(letters.length, Math.floor(totalSlots / 2));
    const letterStart = Math.max(0, Math.floor((topStart + topEnd - letters.length) / 2));
    letters.forEach((ch, i) => {
      const idx = (letterStart + i) % totalSlots;
      slots[idx] = { kind: "letter", key: `L-${i}`, label: ch };
    });

    // Place charms centered on the bottom arc
    const bottomCenter = Math.floor((3 * totalSlots) / 4);
    const startCharm = bottomCenter - Math.floor(charms.length / 2);
    charms.forEach((c, i) => {
      let idx = ((startCharm + i) % totalSlots + totalSlots) % totalSlots;
      // avoid overwriting letters
      let guard = 0;
      while (slots[idx].kind === "letter" && guard < totalSlots) {
        idx = (idx + 1) % totalSlots;
        guard++;
      }
      slots[idx] = c;
    });

    return slots;
  }, [letters, charms]);

  // Geometry
  const size = 480;
  const cx = size / 2;
  const cy = size / 2;
  const R = 165; // main bracelet radius
  const cordWidth = 14;

  const positions = layout.map((slot, i) => {
    // Start from bottom-left, sweep clockwise so top arc reads L→R when viewed
    const t = i / layout.length;
    const angle = Math.PI + t * Math.PI * 2; // start at 180° (left) going down/right/up/left
    return {
      slot,
      angle,
      x: cx + Math.cos(angle) * R,
      y: cy + Math.sin(angle) * R,
    };
  });

  const downloadImage = () => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      const serializer = new XMLSerializer();
      const src = serializer.serializeToString(svg);
      const svgBlob = new Blob([`<?xml version="1.0" standalone="no"?>\n${src}`], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 1200;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${exportFileName}-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }, "image/png");
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
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
          <Badge variant="secondary" className="ml-auto">Canlı Önizleme</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="w-full rounded-lg border overflow-hidden"
          style={{
            height,
            background:
              "radial-gradient(circle at 30% 20%, hsl(var(--muted)) 0%, hsl(var(--background)) 60%, hsl(var(--muted)) 100%)",
          }}
          aria-label="Bileklik önizleme alanı"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-full"
            role="img"
            aria-label={`Bileklik: isim ${customName || "yok"}, ${charms.length} süs`}
            style={{
              transformOrigin: "center",
              animation: spin ? "braceletSpin 30s linear infinite" : "none",
            }}
          >
            <defs>
              <radialGradient id="bg-glow" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              <linearGradient id="cord-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={cord} stopOpacity="1" />
                <stop offset="50%" stopColor={lighten(cord, 0.25)} />
                <stop offset="100%" stopColor={darken(cord, 0.2)} />
              </linearGradient>
              <radialGradient id="bead-grad" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="60%" stopColor={beadColor} />
                <stop offset="100%" stopColor={darken(beadColor, 0.35)} />
              </radialGradient>
              <radialGradient id="metal-grad" cx="35%" cy="30%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="60%" stopColor={metalColor} />
                <stop offset="100%" stopColor={darken(metalColor, 0.4)} />
              </radialGradient>
              <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="0" dy="2" result="off" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.4" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <clipPath id="charm-clip">
                <circle cx="0" cy="0" r="16" />
              </clipPath>
            </defs>

            <circle cx={cx} cy={cy} r={R + 40} fill="url(#bg-glow)" />

            {/* Cord: main ring with braided-looking dashes on top */}
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke="url(#cord-grad)"
              strokeWidth={cordWidth}
              filter="url(#soft-shadow)"
            />
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={lighten(cord, 0.45)}
              strokeWidth={2}
              strokeDasharray="6 8"
              opacity={0.55}
            />

            {/* Clasp at top */}
            <g transform={`translate(${cx}, ${cy - R})`}>
              <rect x={-14} y={-9} width={28} height={18} rx={4} fill="url(#metal-grad)" filter="url(#soft-shadow)" />
              <circle cx={0} cy={0} r={3} fill={darken(metalColor, 0.5)} />
            </g>

            {positions.map(({ slot, x, y, angle }, i) => {
              if (slot.kind === "letter") {
                // Face the letter upright toward center for readability
                const rotDeg = (angle * 180) / Math.PI + 90;
                return (
                  <g key={slot.key} transform={`translate(${x}, ${y})`}>
                    <g transform={`rotate(${rotDeg})`}>
                      <rect
                        x={-14}
                        y={-14}
                        width={28}
                        height={28}
                        rx={5}
                        fill="url(#bead-grad)"
                        filter="url(#soft-shadow)"
                        stroke={darken(beadColor, 0.4)}
                        strokeWidth={0.75}
                      />
                    </g>
                    {/* Text is NOT rotated — always upright so name reads correctly */}
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="Georgia, 'Times New Roman', serif"
                      fontWeight={700}
                      fontSize={16}
                      fill="#1a1a1a"
                      style={{ pointerEvents: "none" }}
                    >
                      {slot.label}
                    </text>
                  </g>
                );
              }
              if (slot.kind === "charm") {
                return (
                  <g key={slot.key} transform={`translate(${x}, ${y})`}>
                    {/* attachment ring */}
                    <circle cx={0} cy={-14} r={3.5} fill="none" stroke={metalColor} strokeWidth={1.6} />
                    {/* metal frame */}
                    <circle
                      cx={0}
                      cy={0}
                      r={18}
                      fill="url(#metal-grad)"
                      filter="url(#soft-shadow)"
                      stroke={darken(metalColor, 0.4)}
                      strokeWidth={1}
                    />
                    {slot.imageUrl ? (
                      <g clipPath="url(#charm-clip)">
                        <image
                          href={slot.imageUrl}
                          x={-16}
                          y={-16}
                          width={32}
                          height={32}
                          preserveAspectRatio="xMidYMid slice"
                        />
                      </g>
                    ) : (
                      <>
                        <circle cx={0} cy={0} r={13} fill={slot.color} opacity={0.85} />
                        <text
                          x={0}
                          y={0}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={10}
                          fontWeight={700}
                          fill="#fff"
                        >
                          {slot.label.slice(0, 2).toUpperCase()}
                        </text>
                      </>
                    )}
                  </g>
                );
              }
              // spacer bead
              return (
                <circle
                  key={slot.key}
                  cx={x}
                  cy={y}
                  r={5}
                  fill="url(#bead-grad)"
                  opacity={0.9}
                  filter="url(#soft-shadow)"
                />
              );
            })}
          </svg>
          <style>{`@keyframes braceletSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
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
              className={`h-7 w-7 rounded-full border-2 transition ${
                cord === c.value ? "border-primary scale-110 shadow" : "border-border"
              }`}
              style={{ background: c.value }}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSpin((s) => !s)}
            aria-label={spin ? "Döndürmeyi durdur" : "Otomatik döndür"}
          >
            {spin ? <Pause className="h-3.5 w-3.5 mr-1" /> : <RotateCw className="h-3.5 w-3.5 mr-1" />}
            {spin ? "Durdur" : "Döndür"}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadImage} aria-label="Önizlemeyi indir">
            <Download className="h-3.5 w-3.5 mr-1" />
            İndir
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Önizleme; gerçek ürün, malzeme ve dizilim sipariş notlarına göre üretilir.
        </p>
      </CardContent>
    </Card>
  );
};

// --- color utils ---
function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}
function lighten(hex: string, amount: number) {
  try {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  } catch { return hex; }
}
function darken(hex: string, amount: number) {
  try {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
  } catch { return hex; }
}

export default BraceletSimulator3D;
