import { useMemo, useRef, Suspense } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Float, Environment, Text } from "@react-three/drei";
import * as THREE from "three";

type Bead = {
  key: string;
  label: string;
  color: string;
  kind: "name" | "charm" | "spacer";
  imageUrl?: string | null;
};

// Charm rendered as a small textured plane hanging from the cord
const CharmImage = ({ url, color }: { url: string; color: string }) => {
  const texture = useLoader(THREE.TextureLoader, url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return (
    <group>
      {/* attachment ring */}
      <mesh position={[0, 0.22, 0]}>
        <torusGeometry args={[0.05, 0.012, 8, 16]} />
        <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0.25} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.38, 0.38]} />
        <meshStandardMaterial map={texture} transparent side={THREE.DoubleSide} metalness={0.2} roughness={0.6} />
      </mesh>
      {/* subtle backing for depth */}
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[0.21, 32]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
};

const CharmFallback = ({ color }: { color: string }) => (
  <mesh castShadow>
    <icosahedronGeometry args={[0.22, 0]} />
    <meshStandardMaterial color={color} metalness={0.85} roughness={0.15} emissive={color} emissiveIntensity={0.15} />
  </mesh>
);

const Bracelet = ({
  beads, cordColor, metalColor, autoSpin,
}: { beads: Bead[]; cordColor: string; metalColor: string; autoSpin: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const radius = 1.6;

  useFrame((_, delta) => {
    if (group.current && autoSpin) group.current.rotation.y += delta * 0.25;
  });

  // Build the final placement list:
  // - Use ALL provided beads (no modulo cycling that repeats letters)
  // - Pad remaining ring slots with neutral cord spacers (no fake letters)
  // - Place name letters in reading order (front→right) so they read correctly
  const placed = useMemo(() => {
    const minSlots = 14;
    const total = Math.max(beads.length, minSlots);
    const items: Bead[] = [...beads];
    while (items.length < total) {
      items.push({ key: `pad-${items.length}`, label: "", color: cordColor, kind: "spacer" });
    }
    const out: Array<{ pos: [number, number, number]; rot: number; data: Bead }> = [];
    for (let i = 0; i < total; i++) {
      // Reverse traversal direction so name reads left→right when viewed from camera (+Z)
      const angle = -(i / total) * Math.PI * 2 + Math.PI / 2;
      out.push({
        pos: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        rot: -angle + Math.PI / 2,
        data: items[i],
      });
    }
    return out;
  }, [beads, cordColor]);

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.06, 24, 160]} />
        <meshStandardMaterial color={cordColor} roughness={0.55} metalness={0.15} />
      </mesh>
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
            <Float key={`c-${i}`} speed={autoSpin ? 2 : 0} rotationIntensity={0.6} floatIntensity={0.4}>
              <group position={p.pos} rotation={[0, p.rot, 0]}>
                {data.imageUrl ? (
                  <Suspense fallback={<CharmFallback color={data.color} />}>
                    <CharmImage url={data.imageUrl} color={data.color} />
                  </Suspense>
                ) : (
                  <CharmFallback color={data.color} />
                )}
              </group>
            </Float>
          );
        }
        return (
          <mesh key={`s-${i}`} position={p.pos} castShadow>
            <sphereGeometry args={[0.1, 20, 20]} />
            <meshStandardMaterial color={cordColor} roughness={0.5} metalness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
};

const BraceletScene = ({
  beads, cordColor, metalColor, autoSpin,
}: { beads: Bead[]; cordColor: string; metalColor: string; autoSpin: boolean }) => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[5, 5, 5]} intensity={1.1} castShadow />
    <directionalLight position={[-5, 3, -2]} intensity={0.4} />
    <Bracelet beads={beads} cordColor={cordColor} metalColor={metalColor} autoSpin={autoSpin} />
    <Suspense fallback={null}>
      <Environment preset="studio" />
    </Suspense>
    <OrbitControls enablePan={false} autoRotate={autoSpin} autoRotateSpeed={0.8} minDistance={3} maxDistance={8} />
  </>
);

export default BraceletScene;
