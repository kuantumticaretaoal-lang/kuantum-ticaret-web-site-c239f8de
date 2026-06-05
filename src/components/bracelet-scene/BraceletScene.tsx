import { useMemo, useRef, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Environment, Text } from "@react-three/drei";
import * as THREE from "three";

type Bead = { key: string; label: string; color: string; kind: "name" | "charm" | "spacer" };

const Bracelet = ({
  beads, cordColor, metalColor, autoSpin,
}: { beads: Bead[]; cordColor: string; metalColor: string; autoSpin: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const radius = 1.6;

  useFrame((_, delta) => {
    if (group.current && autoSpin) group.current.rotation.y += delta * 0.25;
  });

  const items = beads.length > 0 ? beads : [{ key: "_", label: "", color: cordColor, kind: "spacer" as const }];
  const count = Math.max(items.length, 12);
  const placed = useMemo(() => {
    const out: Array<{ pos: [number, number, number]; rot: number; data: Bead }> = [];
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
              <Text position={[0, 0, 0.095]} fontSize={0.22} color="#1a1a1a" anchorX="center" anchorY="middle">
                {data.label}
              </Text>
            </group>
          );
        }
        if (data.kind === "charm") {
          return (
            <Float key={`c-${i}`} speed={autoSpin ? 2 : 0} rotationIntensity={0.6} floatIntensity={0.4}>
              <group position={p.pos}>
                <mesh castShadow>
                  <icosahedronGeometry args={[0.22, 0]} />
                  <meshStandardMaterial color={data.color} metalness={0.85} roughness={0.15} emissive={data.color} emissiveIntensity={0.15} />
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
