import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import ThreeOrb, { type OrbState } from './ThreeOrb';

interface OrbSceneProps {
  state: OrbState;
}

function OrbLighting() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#7c3aed" />
      <pointLight position={[-5, -3, 3]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[0, -5, -5]} intensity={0.3} color="#06b6d4" />
    </>
  );
}

export default function OrbScene({ state }: OrbSceneProps) {
  const dpr = useMemo(
    () => Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
    [],
  );

  return (
    <div
      className="absolute inset-0 z-0"
      style={{ pointerEvents: 'none' }}
    >
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <OrbLighting />
          <ThreeOrb state={state} />
        </Suspense>
      </Canvas>
    </div>
  );
}
