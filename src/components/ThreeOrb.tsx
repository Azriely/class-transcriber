import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type OrbState = 'idle' | 'transcribing' | 'summarizing' | 'complete' | 'error';

interface ThreeOrbProps {
  state: OrbState;
}

// ---------- Simplex-like 3D noise (compact implementation) ----------

// Permutation table for noise
const perm = new Uint8Array(512);
const grad3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

// Seed permutation table
for (let i = 0; i < 256; i++) perm[i] = i;
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [perm[i], perm[j]] = [perm[j], perm[i]];
}
for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

function dot3(g: number[], x: number, y: number, z: number) {
  return g[0] * x + g[1] * y + g[2] * z;
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number) {
  return a + t * (b - a);
}

/** Classic Perlin 3D noise, returns value in roughly [-1, 1] */
function noise3D(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const A = perm[X] + Y;
  const AA = perm[A] + Z;
  const AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y;
  const BA = perm[B] + Z;
  const BB = perm[B + 1] + Z;

  return lerp(
    lerp(
      lerp(
        dot3(grad3[perm[AA] % 12], x, y, z),
        dot3(grad3[perm[BA] % 12], x - 1, y, z),
        u,
      ),
      lerp(
        dot3(grad3[perm[AB] % 12], x, y - 1, z),
        dot3(grad3[perm[BB] % 12], x - 1, y - 1, z),
        u,
      ),
      v,
    ),
    lerp(
      lerp(
        dot3(grad3[perm[AA + 1] % 12], x, y, z - 1),
        dot3(grad3[perm[BA + 1] % 12], x - 1, y, z - 1),
        u,
      ),
      lerp(
        dot3(grad3[perm[AB + 1] % 12], x, y - 1, z - 1),
        dot3(grad3[perm[BB + 1] % 12], x - 1, y - 1, z - 1),
        u,
      ),
      v,
    ),
    w,
  );
}

// ---------- State config ----------

interface StateConfig {
  amplitude: number;
  speed: number;
  noiseScale: number;
  color: THREE.Color;
  emissiveIntensity: number;
}

const COLORS = {
  purple: new THREE.Color(0x7c3aed),
  blue: new THREE.Color(0x3b82f6),
  cyan: new THREE.Color(0x06b6d4),
  green: new THREE.Color(0x10b981),
  red: new THREE.Color(0xef4444),
};

const STATE_CONFIGS: Record<OrbState, StateConfig> = {
  idle: {
    amplitude: 0.1,
    speed: 0.3,
    noiseScale: 1.2,
    color: COLORS.purple.clone().lerp(COLORS.blue, 0.3),
    emissiveIntensity: 0.15,
  },
  transcribing: {
    amplitude: 0.4,
    speed: 1.2,
    noiseScale: 1.8,
    color: COLORS.blue.clone().lerp(COLORS.cyan, 0.5),
    emissiveIntensity: 0.4,
  },
  summarizing: {
    amplitude: 0.25,
    speed: 0.7,
    noiseScale: 1.5,
    color: COLORS.cyan.clone().lerp(COLORS.green, 0.4),
    emissiveIntensity: 0.3,
  },
  complete: {
    amplitude: 0.15,
    speed: 0.5,
    noiseScale: 1.2,
    color: COLORS.green,
    emissiveIntensity: 0.5,
  },
  error: {
    amplitude: 0.35,
    speed: 1.5,
    noiseScale: 2.0,
    color: COLORS.red,
    emissiveIntensity: 0.6,
  },
};

// ---------- ThreeOrb component ----------

export default function ThreeOrb({ state }: ThreeOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  // Memoize geometry so it's not recreated
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 64), []);

  // Store original vertex positions once
  const basePositions = useMemo(() => {
    const pos = geometry.attributes.position;
    return new Float32Array(pos.array);
  }, [geometry]);

  // Animated values (lerped each frame for smooth transitions)
  const animValues = useRef({
    amplitude: STATE_CONFIGS.idle.amplitude,
    speed: STATE_CONFIGS.idle.speed,
    noiseScale: STATE_CONFIGS.idle.noiseScale,
    color: STATE_CONFIGS.idle.color.clone(),
    emissiveIntensity: STATE_CONFIGS.idle.emissiveIntensity,
    scale: 1,
    shakeOffset: new THREE.Vector3(),
  });

  // Track previous state for transient effects
  const prevState = useRef<OrbState>(state);
  const transientTimer = useRef(0);

  useEffect(() => {
    if (state !== prevState.current) {
      // Trigger transient effects
      if (state === 'complete') {
        transientTimer.current = 0.8; // brief expansion duration
      } else if (state === 'error') {
        transientTimer.current = 0.6; // brief shake duration
      }
      prevState.current = state;
    }
  }, [state]);

  useFrame((_frameState, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const target = STATE_CONFIGS[state];
    const anim = animValues.current;
    const lerpFactor = 1 - Math.pow(0.01, delta); // frame-rate independent lerp

    // Lerp continuous values toward target
    anim.amplitude = lerp(anim.amplitude, target.amplitude, lerpFactor);
    anim.speed = lerp(anim.speed, target.speed, lerpFactor);
    anim.noiseScale = lerp(anim.noiseScale, target.noiseScale, lerpFactor);
    anim.emissiveIntensity = lerp(anim.emissiveIntensity, target.emissiveIntensity, lerpFactor);
    anim.color.lerp(target.color, lerpFactor);

    // Handle transient effects
    if (transientTimer.current > 0) {
      transientTimer.current -= delta;
      const t = Math.max(0, transientTimer.current);

      if (state === 'complete') {
        // Brief scale-up then settle
        const expandProgress = t / 0.8;
        anim.scale = lerp(1, 1 + 0.3 * Math.sin(expandProgress * Math.PI), lerpFactor * 2);
      } else if (state === 'error') {
        // Shake effect
        const shakeIntensity = t / 0.6;
        anim.shakeOffset.set(
          (Math.random() - 0.5) * 0.1 * shakeIntensity,
          (Math.random() - 0.5) * 0.1 * shakeIntensity,
          0,
        );
      }
    } else {
      anim.scale = lerp(anim.scale, 1, lerpFactor);
      anim.shakeOffset.lerp(new THREE.Vector3(0, 0, 0), lerpFactor * 3);
    }

    // Apply scale and shake
    meshRef.current.scale.setScalar(anim.scale);
    meshRef.current.position.copy(anim.shakeOffset);

    // Update material color
    materialRef.current.color.copy(anim.color);
    materialRef.current.emissive.copy(anim.color);
    materialRef.current.emissiveIntensity = anim.emissiveIntensity;

    // Displace vertices with noise
    const time = _frameState.clock.elapsedTime * anim.speed;
    const posAttr = geometry.attributes.position;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < posAttr.count; i++) {
      const i3 = i * 3;
      const bx = basePositions[i3];
      const by = basePositions[i3 + 1];
      const bz = basePositions[i3 + 2];

      // Compute noise displacement along vertex normal (which for a sphere == normalized position)
      const len = Math.sqrt(bx * bx + by * by + bz * bz);
      const nx = bx / len;
      const ny = by / len;
      const nz = bz / len;

      const n = noise3D(
        bx * anim.noiseScale + time,
        by * anim.noiseScale + time * 0.7,
        bz * anim.noiseScale + time * 0.5,
      );

      const displacement = n * anim.amplitude;

      arr[i3] = bx + nx * displacement;
      arr[i3 + 1] = by + ny * displacement;
      arr[i3 + 2] = bz + nz * displacement;
    }

    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        ref={materialRef}
        color={STATE_CONFIGS.idle.color}
        emissive={STATE_CONFIGS.idle.color}
        emissiveIntensity={0.15}
        metalness={0.6}
        roughness={0.2}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}
