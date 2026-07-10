import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, Ruler } from "lucide-react";
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
  { name: "Kahve Deri", value: "#7a4a25", texture: "leather" as const },
  { name: "Siyah Deri", value: "#1a1a1a", texture: "leather" as const },
  { name: "Bordo İp", value: "#7a1f2b", texture: "rope" as const },
  { name: "Lacivert İp", value: "#1f3a7a", texture: "rope" as const },
  { name: "Gül Altın", value: "#b76e79", texture: "chain" as const },
  { name: "Krem", value: "#e8d9b8", texture: "rope" as const },
];

type SlotKind = "letter" | "charm" | "bead";
type Slot = {
  kind: SlotKind;
  key: string;
  label?: string;
  imageUrl?: string | null;
  color?: string;
};

const stringHash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/**
 * Realistic horizontal bracelet visualizer.
 * - Curved cord (SVG path) with texture (leather/rope/chain)
 * - Letters read strictly left-to-right on the cord (no rotation)
 * - Ornament images rendered inside metal frames with hanging rings
 * - Small filler beads between charms; no phantom letters
 * - Fully responsive; no WebGL
 */
export const BraceletSimulator3D = ({
  customName = "",
  ornaments = [],
  cordColor = "#7a4a25",
  beadColor = "#f5d76e",
  metalColor = "#c9a866",
  height = 320,
  title = "Bileklik Önizlemesi",
  onCordColorChange,
  exportFileName = "bileklik-onizleme",
}: BraceletSimulatorProps) => {
  const [cord, setCord] = useState(cordColor);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => setCord(cordColor), [cordColor]);
  useEffect(() => onCordColorChange?.(cord), [cord, onCordColorChange]);

  const texture = useMemo(
    () => CORD_OPTIONS.find((c) => c.value === cord)?.texture ?? "leather",
    [cord]
  );

  const letters = useMemo(
    () =>
      (customName || "")
        .toUpperCase()
        .replace(/[^A-ZÇĞİÖŞÜ0-9]/g, "")
        .slice(0, 14)
        .split(""),
    [customName]
  );

  const charmSlots: Slot[] = useMemo(() => {
    const arr: Slot[] = [];
    ornaments.forEach((o) => {
      const qty = Math.max(1, Math.min(6, o.quantity || 1));
      for (let i = 0; i < qty; i++) {
        arr.push({
          kind: "charm",
          key: `${o.id}-${i}`,
          label: o.name,
          imageUrl: (o as any).image_url || null,
          color: `hsl(${stringHash(o.name) % 360}, 65%, 55%)`,
        });
      }
    });
    return arr;
  }, [ornaments]);

  // Build a linear sequence: [filler, ...letters, filler, ...charms, filler]
  // Only real letters + real charms. Small filler beads separate groups.
  const sequence: Slot[] = useMemo(() => {
    const out: Slot[] = [];
    const bead = (i: number): Slot => ({ kind: "bead", key: `b-${i}-${Math.random()}` });

    // Leading bead
    out.push(bead(0));
    // Letters (each with a tiny bead between for realism if >=4 letters)
    letters.forEach((ch, i) => {
      out.push({ kind: "letter", key: `L-${i}`, label: ch });
    });
    if (letters.length && charmSlots.length) {
      out.push(bead(1));
      out.push(bead(2));
    }
    charmSlots.forEach((c, i) => {
      out.push(c);
      if (i < charmSlots.length - 1) out.push(bead(10 + i));
    });
    out.push(bead(99));

    // Ensure minimum length so cord looks full
    while (out.length < 8) out.push(bead(200 + out.length));
    return out;
  }, [letters, charmSlots]);

  // Geometry — horizontal bracelet with slight droop (catenary-like curve)
  const W = 900;
  const H = 340;
  const clasp = 48; // padding for clasps
  const yTop = 130;
  const yMid = 180; // center dip
  const cx = W / 2;

  // Cubic bezier that forms the top edge of the bracelet
  const pathTop = `M ${clasp} ${yTop} C ${W * 0.25} ${yTop + 90}, ${W * 0.75} ${yTop + 90}, ${W - clasp} ${yTop}`;

  // Positions along the curve, evenly spaced by t
  const positions = useMemo(() => {
    // Sample cubic bezier: B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
    const P0 = { x: clasp, y: yTop };
    const P1 = { x: W * 0.25, y: yTop + 90 };
    const P2 = { x: W * 0.75, y: yTop + 90 };
    const P3 = { x: W - clasp, y: yTop };
    const n = sequence.length;
    // Leave small margin on both ends
    const margin = 0.04;
    return sequence.map((slot, i) => {
      const t = margin + (i / Math.max(1, n - 1)) * (1 - margin * 2);
      const u = 1 - t;
      const x =
        u * u * u * P0.x +
        3 * u * u * t * P1.x +
        3 * u * t * t * P2.x +
        t * t * t * P3.x;
      const y =
        u * u * u * P0.y +
        3 * u * u * t * P1.y +
        3 * u * t * t * P2.y +
        t * t * t * P3.y;
      // Tangent (derivative) for slight tilt
      const tx =
        3 * u * u * (P1.x - P0.x) +
        6 * u * t * (P2.x - P1.x) +
        3 * t * t * (P3.x - P2.x);
      const ty =
        3 * u * u * (P1.y - P0.y) +
        6 * u * t * (P2.y - P1.y) +
        3 * t * t * (P3.y - P2.y);
      const angle = Math.atan2(ty, tx);
      return { slot, x, y, angle };
    });
  }, [sequence]);

  const approxCm = Math.round(8 + sequence.length * 1.1);

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
        canvas.width = 1600;
        canvas.height = Math.round(1600 * (H / W));
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
    <Card className="overflow-hidden border-primary/20 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          {title}
          <Badge variant="secondary" className="ml-auto">Canlı Önizleme</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="w-full rounded-xl border overflow-hidden relative"
          style={{
            height,
            background:
              "radial-gradient(ellipse at center, hsl(var(--muted)) 0%, hsl(var(--background)) 70%)",
          }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          aria-label="Bileklik önizleme alanı"
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Bileklik: ${customName || "isim yok"}, ${charmSlots.length} süs`}
            style={{
              transition: "transform 0.6s cubic-bezier(.2,.7,.2,1)",
              transform: hovering ? "translateY(-4px) rotate(-1deg)" : "none",
            }}
          >
            <defs>
              {/* Cord gradient */}
              <linearGradient id="cord-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={lighten(cord, 0.35)} />
                <stop offset="50%" stopColor={cord} />
                <stop offset="100%" stopColor={darken(cord, 0.35)} />
              </linearGradient>
              {/* Rope pattern: diagonal stripes */}
              <pattern id="rope-pat" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="10" height="10" fill={cord} />
                <line x1="0" y1="5" x2="10" y2="5" stroke={lighten(cord, 0.4)} strokeWidth="2" />
                <line x1="0" y1="0" x2="10" y2="0" stroke={darken(cord, 0.3)} strokeWidth="1" />
              </pattern>
              {/* Leather pattern: fine dots */}
              <pattern id="leather-pat" width="6" height="6" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill={cord} />
                <circle cx="1.5" cy="1.5" r="0.5" fill={darken(cord, 0.35)} opacity="0.7" />
                <circle cx="4.5" cy="3.5" r="0.4" fill={lighten(cord, 0.3)} opacity="0.6" />
              </pattern>
              {/* Chain pattern: horizontal ovals */}
              <pattern id="chain-pat" width="14" height="10" patternUnits="userSpaceOnUse">
                <rect width="14" height="10" fill={darken(cord, 0.4)} />
                <ellipse cx="7" cy="5" rx="5.5" ry="3.5" fill="none" stroke={lighten(cord, 0.5)} strokeWidth="2" />
              </pattern>

              <radialGradient id="metal-grad" cx="30%" cy="25%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="55%" stopColor={metalColor} />
                <stop offset="100%" stopColor={darken(metalColor, 0.45)} />
              </radialGradient>

              <radialGradient id="bead-grad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
                <stop offset="55%" stopColor={beadColor} />
                <stop offset="100%" stopColor={darken(beadColor, 0.4)} />
              </radialGradient>

              <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
                <feOffset dx="0" dy="3" result="off" />
                <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="drop-shadow-sm" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
                <feOffset dx="0" dy="1.5" result="off" />
                <feComponentTransfer><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <clipPath id="charm-clip">
                <circle cx="0" cy="0" r="19" />
              </clipPath>
            </defs>

            {/* Soft floor shadow */}
            <ellipse cx={cx} cy={H - 30} rx={W * 0.38} ry={10} fill="rgba(0,0,0,0.15)" />

            {/* The cord — main body */}
            <path
              d={pathTop}
              fill="none"
              stroke={
                texture === "rope"
                  ? "url(#rope-pat)"
                  : texture === "chain"
                  ? "url(#chain-pat)"
                  : "url(#leather-pat)"
              }
              strokeWidth={16}
              strokeLinecap="round"
              filter="url(#soft-shadow)"
            />
            {/* Highlight overlay */}
            <path
              d={pathTop}
              fill="none"
              stroke={lighten(cord, 0.5)}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.4}
              transform="translate(0,-3)"
            />

            {/* Left clasp */}
            <g transform={`translate(${clasp - 8}, ${yTop})`}>
              <circle cx={0} cy={0} r={12} fill="url(#metal-grad)" filter="url(#drop-shadow-sm)" />
              <circle cx={0} cy={0} r={4} fill={darken(metalColor, 0.55)} />
              <circle cx={-18} cy={0} r={6} fill="none" stroke={metalColor} strokeWidth={3} />
            </g>

            {/* Right clasp */}
            <g transform={`translate(${W - clasp + 8}, ${yTop})`}>
              <rect x={-14} y={-9} width={28} height={18} rx={5} fill="url(#metal-grad)" filter="url(#drop-shadow-sm)" />
              <circle cx={0} cy={0} r={3} fill={darken(metalColor, 0.55)} />
              <circle cx={18} cy={0} r={6} fill="none" stroke={metalColor} strokeWidth={3} />
            </g>

            {/* Beads / letters / charms placed along the curve */}
            {positions.map(({ slot, x, y, angle }) => {
              const rotDeg = (angle * 180) / Math.PI;

              if (slot.kind === "letter") {
                // Letter cube: rotated with tangent for realism, letter text stays upright
                return (
                  <g key={slot.key} transform={`translate(${x}, ${y})`}>
                    <g transform={`rotate(${rotDeg})`}>
                      {/* 3D-ish cube */}
                      <rect
                        x={-15}
                        y={-15}
                        width={30}
                        height={30}
                        rx={5}
                        fill="url(#bead-grad)"
                        stroke={darken(beadColor, 0.4)}
                        strokeWidth={0.75}
                        filter="url(#soft-shadow)"
                      />
                      {/* top edge highlight */}
                      <path
                        d="M -13 -13 L 13 -13 L 10 -10 L -10 -10 Z"
                        fill="rgba(255,255,255,0.55)"
                      />
                      {/* right edge shadow */}
                      <path
                        d="M 13 -13 L 15 -11 L 15 13 L 13 15 Z"
                        fill="rgba(0,0,0,0.15)"
                      />
                    </g>
                    {/* Letter always upright */}
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="Georgia, 'Times New Roman', serif"
                      fontWeight={800}
                      fontSize={18}
                      fill="#1a1a1a"
                      style={{ pointerEvents: "none" }}
                    >
                      {slot.label}
                    </text>
                  </g>
                );
              }

              if (slot.kind === "charm") {
                // Hanging charm below the cord
                const dropY = 42;
                return (
                  <g key={slot.key} transform={`translate(${x}, ${y})`}>
                    {/* attachment link from cord to ring */}
                    <line x1={0} y1={0} x2={0} y2={16} stroke={metalColor} strokeWidth={2} />
                    {/* hanging ring */}
                    <circle cx={0} cy={18} r={4} fill="none" stroke={metalColor} strokeWidth={2} />
                    {/* metal frame around image */}
                    <g transform={`translate(0, ${dropY})`}>
                      <circle
                        cx={0}
                        cy={0}
                        r={22}
                        fill="url(#metal-grad)"
                        stroke={darken(metalColor, 0.45)}
                        strokeWidth={1.2}
                        filter="url(#soft-shadow)"
                      />
                      {slot.imageUrl ? (
                        <g clipPath="url(#charm-clip)">
                          <image
                            href={slot.imageUrl}
                            x={-19}
                            y={-19}
                            width={38}
                            height={38}
                            preserveAspectRatio="xMidYMid slice"
                          />
                        </g>
                      ) : (
                        <>
                          <circle cx={0} cy={0} r={16} fill={slot.color} opacity={0.9} />
                          <text
                            x={0}
                            y={0}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={12}
                            fontWeight={800}
                            fill="#fff"
                          >
                            {(slot.label || "").slice(0, 2).toUpperCase()}
                          </text>
                        </>
                      )}
                      {/* glass highlight */}
                      <ellipse cx={-6} cy={-9} rx={7} ry={3} fill="rgba(255,255,255,0.35)" />
                    </g>
                  </g>
                );
              }

              // filler bead
              return (
                <g key={slot.key} transform={`translate(${x}, ${y})`}>
                  <circle cx={0} cy={0} r={6} fill="url(#bead-grad)" filter="url(#drop-shadow-sm)" />
                  <circle cx={-1.5} cy={-1.8} r={1.6} fill="rgba(255,255,255,0.7)" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Ruler className="h-3.5 w-3.5" />
            ~{approxCm} cm
          </span>
          <span>•</span>
          <span>{letters.length} harf</span>
          <span>•</span>
          <span>{charmSlots.length} süs</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">İp/Malzeme:</span>
          {CORD_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => setCord(c.value)}
              aria-label={`İp rengi: ${c.name}`}
              aria-pressed={cord === c.value}
              title={c.name}
              className={`h-7 w-7 rounded-full border-2 transition-all ${
                cord === c.value
                  ? "border-primary scale-110 shadow-md ring-2 ring-primary/30"
                  : "border-border hover:scale-105"
              }`}
              style={{ background: c.value }}
            />
          ))}
          <Button variant="outline" size="sm" onClick={downloadImage} aria-label="Önizlemeyi indir" className="ml-auto">
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
