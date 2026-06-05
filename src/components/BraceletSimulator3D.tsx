import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Environment, Text } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCw } from "lucide-react";
import type { SelectedOrnament } from "@/components/OrnamentPicker";

interface BraceletSimulator3DProps {
  customName?: string;
  ornaments?: SelectedOrnament[];
  cordColor?: string;
  beadColor?: string;
  metalColor?: string;
  height?: number;
  title?: string;
}

// Stable color from a string (so each ornament gets its own consistent color)
const colorFromString = (s: string, fallback = "#d4af37") => {
  if (!s) return fallback;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 65%, 55%)`;
};

const Bracelet = ({
  beads,
  cordColor,
  metalColor,
}: {
  beads: Array<{ key: string; label: string; color: string; kind: "name" | "charm" | "spacer" }>;
  cordColor: string;
  metalColor: string;
}) => {
  const group = useRef<THREE.Group>(null);
  const radius = 1.6;

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.25;
  });

  const items = beads.length > 0 ? beads : [{ key: "_", label: "", color: cordColor, kind: "spacer" as const }];
  const count = Math.max(items.length, 12);
  const placed = useMemo(() => {
    // distribute beads evenly around circle, repeating if too few for visual fill
    const out: Array<{ pos: [number, number, number]; rot: number; data: typeof items[number] }> = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      out.push({
        pos: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        rot: -angle + Math.PI / 2,
        data: items[i % items.length],
      });
    }
    return out;
  }, [items, count]);

  return (
    <group ref={group}>
      {/* Cord ring (torus) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.06, 24, 160]} />
        <meshStandardMaterial color={cordColor} roughness={0.55} metalness={0.15} />
      </mesh>

      {/* Clasp */}
      <mesh position={[0, radius, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.18, 24]} />
        <meshStandardMaterial color={metalColor} metalness={1} roughness={0.25} />
      </mesh>

      {placed.map((p, i) => {
        const { data } = p;
        if (data.kind === "name") {
          return (
            <group key={`b-${i}`} position={p.pos} rotation={[0, p.rot, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.35, 0.35, 0.18]} />
                <meshStandardMaterial color={data.color} metalness={0.7} roughness={0.3} />
              </mesh>
              <Text
                position={[0, 0, 0.095]}
                fontSize={0.22}
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
              >
                {data.label}
              </Text>
            </group>
          );
        }
        if (data.kind === "charm") {
          return (
            <Float key={`c-${i}`} speed={2} rotationIntensity={0.6} floatIntensity={0.4}>
              <group position={p.pos}>
                <mesh castShadow>
                  <icosahedronGeometry args={[0.22, 0]} />
                  <meshStandardMaterial
                    color={data.color}
                    metalness={0.85}
                    roughness={0.15}
                    emissive={data.color}
                    emissiveIntensity={0.15}
                  />
                </mesh>
              </group>
            </Float>
          );
        }
        return (
          <mesh key={`s-${i}`} position={p.pos} castShadow>
            <sphereGeometry args={[0.14, 24, 24]} />
            <meshStandardMaterial color={cordColor} roughness={0.4} metalness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
};

const Fallback = () => (
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
}: BraceletSimulator3DProps) => {
  const [cord, setCord] = useState(cordColor);
  const [autoSpin, setAutoSpin] = useState(true);

  const beads = useMemo(() => {
    const arr: Array<{ key: string; label: string; color: string; kind: "name" | "charm" | "spacer" }> = [];
    const letters = (customName || "").toUpperCase().replace(/\s+/g, "").slice(0, 12).split("");
    letters.forEach((ch, i) => arr.push({ key: `n${i}`, label: ch, color: beadColor, kind: "name" }));
    ornaments.forEach((o) => {
      for (let i = 0; i < (o.quantity || 1); i++) {
        arr.push({ key: `${o.id}-${i}`, label: o.name, color: colorFromString(o.name), kind: "charm" });
      }
    });
    // add spacers between
    if (arr.length === 0) {
      for (let i = 0; i < 12; i++) arr.push({ key: `sp${i}`, label: "", color: beadColor, kind: "spacer" });
    }
    return arr;
  }, [customName, ornaments, beadColor]);

  const cordOptions = [
    { name: "Kahve Deri", value: "#7a4a25" },
    { name: "Siyah", value: "#1a1a1a" },
    { name: "Bordo", value: "#7a1f2b" },
    { name: "Lacivert", value: "#1f3a7a" },
    { name: "Gül Altın", value: "#b76e79" },
  ];

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {title}
          <Badge variant="secondary" className="ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="w-full rounded-lg bg-gradient-to-b from-background to-muted/40 border"
          style={{ height }}
        >
          <Suspense fallback={<Fallback />}>
            <Canvas
              shadows
              camera={{ position: [0, 2.2, 4.2], fov: 45 }}
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: true }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1.1} castShadow />
              <directionalLight position={[-5, 3, -2]} intensity={0.4} />
              <Bracelet beads={beads} cordColor={cord} metalColor={metalColor} />
              <Suspense fallback={null}>
                <Environment preset="studio" />
              </Suspense>
              <OrbitControls
                enablePan={false}
                autoRotate={autoSpin}
                autoRotateSpeed={0.8}
                minDistance={3}
                maxDistance={8}
              />
            </Canvas>
          </Suspense>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">İp rengi:</span>
          {cordOptions.map((c) => (
            <button
              key={c.value}
              onClick={() => setCord(c.value)}
              aria-label={c.name}
              title={c.name}
              className={`h-6 w-6 rounded-full border-2 transition ${cord === c.value ? "border-primary scale-110" : "border-border"}`}
              style={{ background: c.value }}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoSpin((s) => !s)}
            className="ml-auto"
          >
            <RotateCw className="h-3.5 w-3.5 mr-1" />
            {autoSpin ? "Döndürmeyi durdur" : "Otomatik döndür"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Önizleme; gerçek ürün, malzeme ve dizilim sipariş notlarına göre üretilir.
        </p>
      </CardContent>
    </Card>
  );
};

export default BraceletSimulator3D;
