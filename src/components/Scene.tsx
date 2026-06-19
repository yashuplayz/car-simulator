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

const Rain = ({ isRaining }: { isRaining: boolean }) => {
  const rainGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = [];
    for(let i=0; i<8000; i++) {
      vertices.push(
        Math.random() * 400 - 200, 
        Math.random() * 200,       
        Math.random() * 400 - 200  
      );
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geo;
  }, []);

  const material = useMemo(() => new THREE.PointsMaterial({
    color: '#aaddff',
    size: 0.4,
    transparent: true,
    opacity: 0
  }), []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    // Fade in/out
    material.opacity = THREE.MathUtils.lerp(material.opacity, isRaining ? 0.6 : 0, delta * 2);
    
    if (material.opacity < 0.01) return; // Don't animate if invisible

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const playerZ = state.camera.position.z;
    
    pointsRef.current.position.z = playerZ - 100;
    
    for(let i=1; i<positions.length; i+=3) {
      positions[i] -= delta * 150; // fall speed
      if (positions[i] < 0) {
        positions[i] = 200;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={rainGeo} material={material} />;
};

const CollectibleRing = ({ initialZ, lane }: { initialZ: number, lane: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  const collected = useRef(false);

  useFrame(({ camera }, delta) => {
    if (!ref.current) return;
    const pZ = camera.position.z;
    const pX = camera.position.x;
    
    // Rotate ring
    ref.current.rotation.y += delta * 2;

    const rZ = ref.current.position.z;
    const rX = ref.current.position.x;

    // Collision check
    if (!collected.current && Math.abs(pZ - rZ) < 2 && Math.abs(pX - rX) < 1.5) {
       collected.current = true;
       ref.current.visible = false;
       window.dispatchEvent(new CustomEvent('collect-cash'));
    }

    // Recycle
    if (rZ > pZ + 10) {
       // Move way ahead
       ref.current.position.z = pZ - 500 - Math.random() * 2000;
       ref.current.position.x = [-6, -2, 2, 6][Math.floor(Math.random() * 4)];
       collected.current = false;
       ref.current.visible = true;
    }
  });

  return (
    <mesh ref={ref} position={[lane, 1.5, initialZ]}>
      <torusGeometry args={[0.8, 0.15, 16, 32]} />
      <meshBasicMaterial color="#00ff00" />
    </mesh>
  );
};

export const Scene: React.FC = () => {
  const [isRaining, setIsRaining] = React.useState(false);
  const nextWeatherChange = useRef(15); 
  const isRainingRef = useRef(false); // Ref to prevent double dispatches
  
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
  const synthwaveRoadMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff00ff', wireframe: true, transparent: true, opacity: 0 }), []);
  
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime * 0.05; // Day cycle speed
    const cycle = Math.sin(t); // 1 is midnight, -1 is midday
    
    // Weather logic
    if (state.clock.elapsedTime > nextWeatherChange.current) {
      nextWeatherChange.current = state.clock.elapsedTime + 30 + Math.random() * 30; // Every 30-60s
      const newRainState = !isRainingRef.current;
      isRainingRef.current = newRainState;
      setIsRaining(newRainState);
      window.dispatchEvent(new CustomEvent('weather-change', { detail: { isRaining: newRainState } }));
    }

    // Synthwave Neon Fade In at midnight (when cycle is close to 1)
    const targetSynthOpacity = cycle > 0.7 ? (cycle - 0.7) * 3.33 : 0; 
    synthwaveRoadMat.opacity = THREE.MathUtils.lerp(synthwaveRoadMat.opacity, targetSynthOpacity, delta);
    
    // Day = #87CEEB, Sunset = #fd5e53, Night = #050510 (or #2a0a2a for Synthwave)
    const skyColor = new THREE.Color();
    if (cycle > 0) {
      // Sunset to Synthwave Night
      const nightColor = new THREE.Color('#050510');
      if (cycle > 0.7) nightColor.lerp(new THREE.Color('#2a0a2a'), (cycle - 0.7) * 3.33); // Purple tint
      skyColor.lerpColors(new THREE.Color('#fd5e53'), nightColor, cycle);
    } else {
      // Midday to Sunset
      skyColor.lerpColors(new THREE.Color('#fd5e53'), new THREE.Color('#87CEEB'), Math.abs(cycle));
    }

    if (state.scene.background instanceof THREE.Color) {
      state.scene.background.copy(skyColor);
    } else {
      state.scene.background = skyColor;
    }
    
    if (state.scene.fog instanceof THREE.Fog) {
      state.scene.fog.color.copy(skyColor);
      // If it's raining, increase fog density (shorter far clip)
      state.scene.fog.far = THREE.MathUtils.lerp(state.scene.fog.far, isRainingRef.current ? 150 : 400, delta);
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
      
      <Rain isRaining={isRaining} />
      
      {/* Asphalt Highway */}
      <mesh ref={ref as any} receiveShadow>
        <planeGeometry args={[40, 100000]} />
        <meshStandardMaterial color="#222222" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Synthwave Glowing Road Grid */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 100000, 4, 10000]} />
        <primitive object={synthwaveRoadMat} attach="material" />
      </mesh>
      
      {/* Outer Ground (grass/dirt) */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 100000]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>

      {/* Lane Markers (Center dashed lines) */}
      <mesh position={[-10, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 100000, 1, 10000]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 100000, 1, 10000]} />
        <meshBasicMaterial color="#eab308" wireframe /> {/* Yellow center line */}
      </mesh>
      <mesh position={[10, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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

      {/* Collectible Rings */}
      {Array.from({ length: 20 }).map((_, i) => (
        <CollectibleRing key={`ring-${i}`} initialZ={-200 - i * 150} lane={[-6, -2, 2, 6][i % 4]} />
      ))}
    </>
  );
};
