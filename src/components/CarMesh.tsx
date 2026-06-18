import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface CarMeshProps {
  isBraking: boolean;
}

export const CarMesh = React.forwardRef<THREE.Group, CarMeshProps>(({ isBraking }, ref) => {
  const brakeLightMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#ff0000', 
    emissive: '#ff0000', 
    emissiveIntensity: 0.5 
  }), []);

  const headlightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 0.0
  }), []);

  const headlightsRef = React.useRef<THREE.Group>(null);
  const tailLightsRef = React.useRef<THREE.Group>(null);

  // Target for headlights so they point forward
  const headlightTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0, -2, -100); // Point far forward and slightly down
    return obj;
  }, []);

  useFrame(({ clock }) => {
    // Brake Lights
    brakeLightMat.emissiveIntensity = THREE.MathUtils.lerp(
      brakeLightMat.emissiveIntensity,
      isBraking ? 5 : 0.2,
      0.2
    );

    // Headlights (tied to day/night cycle)
    const t = clock.elapsedTime * 0.05;
    const isNight = Math.sin(t) > 0.2; // Turn on headlights when sun gets low
    const targetIntensity = isNight ? 5.0 : 0.0;
    headlightMat.emissiveIntensity = THREE.MathUtils.lerp(
      headlightMat.emissiveIntensity,
      targetIntensity,
      0.1
    );

    // Update actual lights
    if (headlightsRef.current) {
      headlightsRef.current.children.forEach(light => {
        if (light instanceof THREE.SpotLight) {
          light.intensity = isNight ? 200.0 : 0.0; // Massive intensity for long beams
        }
      });
    }

    if (tailLightsRef.current) {
      tailLightsRef.current.children.forEach(light => {
        if (light instanceof THREE.PointLight) {
          light.intensity = isBraking ? 1.5 : (isNight ? 0.3 : 0.0);
        }
      });
    }
  });

  return (
    <group ref={ref}>
      {/* Lower Chassis */}
      <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.4, 4.2]} />
        <meshStandardMaterial color="#cc0000" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Cabin */}
      <mesh position={[0, 0.2, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.4, 2]} />
        <meshStandardMaterial color="#aa0000" metalness={0.7} roughness={0.2} />
      </mesh>
      
      {/* Front Windshield Slant */}
      <mesh position={[0, 0.1, 0.9]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[1.38, 0.6, 0.8]} />
        <meshStandardMaterial color="#050505" metalness={1} roughness={0} />
      </mesh>

      {/* Rear Windshield Slant */}
      <mesh position={[0, 0.1, -1.3]} rotation={[-0.4, 0, 0]} castShadow>
        <boxGeometry args={[1.38, 0.5, 0.6]} />
        <meshStandardMaterial color="#050505" metalness={1} roughness={0} />
      </mesh>

      {/* Headlights (Front is -Z) */}
      <group ref={headlightsRef}>
        <primitive object={headlightTarget} />
        <spotLight 
          position={[0.6, 0.2, -2.5]} 
          target={headlightTarget}
          distance={300} 
          angle={Math.PI / 4} 
          penumbra={0.5} 
          color="#ffffff" 
          intensity={0} 
          decay={1.5} 
        />
        <spotLight 
          position={[-0.6, 0.2, -2.5]} 
          target={headlightTarget}
          distance={300} 
          angle={Math.PI / 4} 
          penumbra={0.5} 
          color="#ffffff" 
          intensity={0} 
          decay={1.5} 
        />
      </group>
      <mesh position={[0.6, -0.1, -2.11]} material={headlightMat}>
        <boxGeometry args={[0.4, 0.1, 0.05]} />
      </mesh>
      <mesh position={[-0.6, -0.1, -2.11]} material={headlightMat}>
        <boxGeometry args={[0.4, 0.1, 0.05]} />
      </mesh>

      {/* Brake Lights (Rear is +Z) */}
      <group ref={tailLightsRef}>
        <pointLight position={[0.6, 0.5, 2.5]} distance={10} color="#ff0000" intensity={0} decay={2} />
        <pointLight position={[-0.6, 0.5, 2.5]} distance={10} color="#ff0000" intensity={0} decay={2} />
      </group>
      <mesh position={[0.6, -0.1, 2.11]} material={brakeLightMat}>
        <boxGeometry args={[0.4, 0.1, 0.05]} />
      </mesh>
      <mesh position={[-0.6, -0.1, 2.11]} material={brakeLightMat}>
        <boxGeometry args={[0.4, 0.1, 0.05]} />
      </mesh>

      {/* Aggressive Front Splitter */}
      <mesh position={[0, -0.38, 2.15]} castShadow>
        <boxGeometry args={[1.9, 0.05, 0.4]} />
        <meshStandardMaterial color="#000000" metalness={0.8} roughness={0.5} />
      </mesh>

      {/* Side Skirts */}
      <mesh position={[0.95, -0.35, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 3.8]} />
        <meshStandardMaterial color="#000000" metalness={0.8} roughness={0.5} />
      </mesh>
      <mesh position={[-0.95, -0.35, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 3.8]} />
        <meshStandardMaterial color="#000000" metalness={0.8} roughness={0.5} />
      </mesh>

      {/* Massive Rear Spoiler */}
      <group position={[0, 0.5, -1.9]}>
        <mesh castShadow position={[0, 0, 0]}>
          <boxGeometry args={[2.0, 0.05, 0.6]} />
          <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh castShadow position={[-0.8, -0.2, 0]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.4]} />
          <meshStandardMaterial color="#111" metalness={0.5} roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0.8, -0.2, 0]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.4]} />
          <meshStandardMaterial color="#111" metalness={0.5} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
});
