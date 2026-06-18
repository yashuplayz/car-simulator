import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { usePlane, useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';

// Endless Building Component
const InfiniteBuilding = ({ initialPosition, size, color, isNeon }: { initialPosition: [number, number, number], size: [number, number, number], color: string, isNeon: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const neonMaterialRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame(({ camera, clock }) => {
    if (!meshRef.current) return;
    const playerZ = camera.position.z;
    if (meshRef.current.position.z > playerZ + 500) {
      meshRef.current.position.z -= 10000;
    }

    // Glow pulsates and only appears at night
    if (neonMaterialRef.current && isNeon) {
      const t = clock.elapsedTime * 0.05; 
      const nightFactor = Math.max(0, Math.sin(t)); // 1 at midnight, 0 at day
      neonMaterialRef.current.opacity = nightFactor * 0.8 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 5));
    }
  });

  return (
    <mesh ref={meshRef} position={initialPosition} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      {/* Glowing neon window accents */}
      {isNeon && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
          <lineBasicMaterial ref={neonMaterialRef} color={'#00f3ff'} transparent opacity={0.0} />
        </lineSegments>
      )}
    </mesh>
  );
};

export const Scene: React.FC = () => {
  // Ground physics body
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    material: { friction: 1.5 },
  }));

  // Guardrail physics bodies (Static boxes on the left and right)
  useBox(() => ({
    type: 'Static',
    args: [2, 10, 10000],
    position: [-21, 5, 0],
    material: { friction: 0.1, restitution: 0.2 }
  }));

  useBox(() => ({
    type: 'Static',
    args: [2, 10, 10000],
    position: [21, 5, 0],
    material: { friction: 0.1, restitution: 0.2 }
  }));

  // Procedural City Skyline Generation
  const buildings = useMemo(() => {
    const arr = [];
    const seedRandom = (seed: number) => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // Generate buildings along the Z axis from -5000 to +5000
    for (let i = 0; i < 400; i++) {
      const z = -5000 + (i * 25) + (seedRandom(i) * 10);
      
      // Left side buildings
      if (i % 2 === 0) {
        const height = 20 + seedRandom(i * 2) * 100;
        const width = 15 + seedRandom(i * 3) * 20;
        const depth = 15 + seedRandom(i * 4) * 20;
        const x = -30 - (width / 2) - seedRandom(i * 5) * 40;
        arr.push({ position: [x, height / 2, z], args: [width, height, depth], color: seedRandom(i) > 0.8 ? '#1a1a2e' : '#16213e' });
      } else {
        // Right side buildings
        const height = 20 + seedRandom(i * 2) * 100;
        const width = 15 + seedRandom(i * 3) * 20;
        const depth = 15 + seedRandom(i * 4) * 20;
        const x = 30 + (width / 2) + seedRandom(i * 5) * 40;
        arr.push({ position: [x, height / 2, z], args: [width, height, depth], color: seedRandom(i) > 0.8 ? '#0f3460' : '#1a1a2e' });
      }
    }
    return arr;
  }, []);

  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.05; // Day cycle speed
    const cycle = Math.sin(t); // 1 is midnight, -1 is midday
    
    // Day = #87CEEB, Sunset = #fd5e53, Night = #050510
    const skyColor = new THREE.Color();
    if (cycle > 0) {
      // Sunset to Night
      skyColor.lerpColors(new THREE.Color('#fd5e53'), new THREE.Color('#050510'), cycle);
    } else {
      // Midday to Sunset
      skyColor.lerpColors(new THREE.Color('#fd5e53'), new THREE.Color('#87CEEB'), Math.abs(cycle));
    }

    if (state.scene.background instanceof THREE.Color) {
      state.scene.background.copy(skyColor);
    } else {
      state.scene.background = skyColor;
    }
    
    if (state.scene.fog) {
      state.scene.fog.color.copy(skyColor);
    } else {
      state.scene.fog = new THREE.Fog(skyColor, 50, 400);
    }

    if (dirLightRef.current) {
      // Sun goes down at night
      const lightIntensity = Math.max(0.1, -cycle * 1.5);
      dirLightRef.current.intensity = lightIntensity;
      
      // Sun position rotates
      const sunY = -cycle * 200;
      const sunZ = Math.cos(t) * 200;
      dirLightRef.current.position.set(100, sunY, sunZ);
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight 
        ref={dirLightRef}
        position={[100, 200, 50]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* Asphalt Highway */}
      <mesh ref={ref as any} receiveShadow>
        <planeGeometry args={[40, 100000]} />
        <meshStandardMaterial color="#222222" roughness={0.9} metalness={0.1} />
      </mesh>
      
      {/* Outer Ground (grass/dirt) */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 100000]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>

      {/* Lane Markers (Center dashed lines) */}
      <mesh position={[-10, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 100000, 1, 10000]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 100000, 1, 10000]} />
        <meshBasicMaterial color="#eab308" wireframe /> {/* Yellow center line */}
      </mesh>
      <mesh position={[10, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 100000, 1, 10000]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>

      {/* Visual Guardrails */}
      <mesh position={[-21, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 2, 100000]} />
        <meshStandardMaterial color="#888888" roughness={0.8} />
      </mesh>
      <mesh position={[21, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 2, 100000]} />
        <meshStandardMaterial color="#888888" roughness={0.8} />
      </mesh>

      {/* Procedural Buildings (Infinite Loop) */}
      {buildings.map((b, i) => (
        <InfiniteBuilding 
          key={i} 
          initialPosition={b.position as [number, number, number]} 
          size={b.args as [number, number, number]} 
          color={b.color}
          isNeon={b.color === '#0f3460'} 
        />
      ))}
    </>
  );
};
