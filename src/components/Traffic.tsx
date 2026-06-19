import React, { useMemo, useRef } from 'react';
import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TrafficCarProps {
  position: [number, number, number];
  color: string;
}

let globalWantedLevel = 0;
let globalPlayerSpeed = 0;
window.addEventListener('telemetry', (e: any) => {
  globalWantedLevel = e.detail.wantedLevel;
  globalPlayerSpeed = e.detail.speed;
});

const TrafficCar: React.FC<TrafficCarProps> = ({ position, color }) => {
  const [ref, api] = useBox(() => ({
    type: 'Kinematic',
    args: [1.8, 1.2, 4.2], // Standard car dimensions
    position,
  }));

  const localPos = useRef(position);
  const nearMissTriggered = useRef(false);
  const speed = useRef(Math.random() * 15 + 15); // 15 to 30 m/s
  const lanes = [-6, -2, 2, 6];
  const targetLane = useRef(position[0]);
  const isBraking = useRef(false);
  
  const nextLaneSwitch = useRef(Math.random() * 10);
  const nextBrakeCheck = useRef(Math.random() * 20);
  const isPolice = useRef(false);

  const tailLightMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x440000 }), []);
  const policeLightMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0 }), []);

  React.useEffect(() => {
    const unsub = api.position.subscribe((p) => (localPos.current = p as [number, number, number]));
    return unsub;
  }, [api.position]);

  useFrame(({ camera, clock }) => {
    const playerZ = camera.position.z;
    const myZ = localPos.current[2];
    const t = clock.elapsedTime;

    const pX = camera.position.x;
    
    // AI Decision Making
    if (isPolice.current) {
      // Aggressive ramming AI
      let bestLane = lanes[0];
      let minDist = Infinity;
      for (let l of lanes) {
        if (Math.abs(pX - l) < minDist) {
          minDist = Math.abs(pX - l);
          bestLane = l;
        }
      }
      targetLane.current = bestLane;
      
      // Flashing Lights
      const blink = Math.floor(t * 8) % 2 === 0;
      tailLightMat.color.setHex(blink ? 0x0000ff : 0xff0000);
      policeLightMat.color.setHex(blink ? 0xff0000 : 0x0000ff);
      policeLightMat.opacity = 1;
    } else {
      policeLightMat.opacity = 0;
      if (t > nextLaneSwitch.current) {
        nextLaneSwitch.current = t + 5 + Math.random() * 10;
        const currentLaneIdx = lanes.indexOf(targetLane.current);
        if (currentLaneIdx !== -1) {
          const moveLeft = Math.random() > 0.5;
          if (moveLeft && currentLaneIdx > 0) targetLane.current = lanes[currentLaneIdx - 1];
          else if (!moveLeft && currentLaneIdx < lanes.length - 1) targetLane.current = lanes[currentLaneIdx + 1];
        }
      }
      
      if (t > nextBrakeCheck.current && !isBraking.current) {
        nextBrakeCheck.current = t + 10 + Math.random() * 20;
        isBraking.current = true;
        setTimeout(() => isBraking.current = false, 1000 + Math.random() * 2000);
      }

      // Update Visuals
      tailLightMat.color.setHex(isBraking.current ? 0xff0000 : 0x440000);
    }

    // Apply Velocity
    const currentSpeed = isBraking.current ? speed.current * 0.6 : speed.current;
    const xDiff = targetLane.current - localPos.current[0];
    const vx = xDiff * 2.0; // Smooth steering into target lane
    api.velocity.set(vx, 0, -currentSpeed);

    // Near Miss & Slipstream Detection
    const pZ = camera.position.z - 8;
    const cX = localPos.current[0];
    const cZ = localPos.current[2];
    
    const playerXDiff = pX - cX;
    const zDiff = pZ - cZ;
    const playerDist = Math.hypot(playerXDiff, zDiff);

    if (playerDist < 4.0 && playerDist > 1.8 && !nearMissTriggered.current) {
      nearMissTriggered.current = true;
      window.dispatchEvent(new CustomEvent('near-miss'));
    }
    if (playerDist > 10.0) nearMissTriggered.current = false;

    // Slipstream: Player is strictly behind the car (zDiff is positive) and within the same lane (playerXDiff is small)
    if (zDiff > 4.0 && zDiff < 25.0 && Math.abs(playerXDiff) < 1.5) {
      window.dispatchEvent(new CustomEvent('slipstream-tick'));
    }

    // Teleport logic
    // We check playerZ + 200 because police can spawn behind up to +400. We don't want to despawn them instantly if they fall behind.
    // So if myZ > playerZ + 600, despawn.
    if (myZ > playerZ + 600) {
      const newX = lanes[Math.floor(Math.random() * lanes.length)];
      
      let spawnAsPolice = false;
      if (globalWantedLevel > 0 && Math.random() < (globalWantedLevel * 0.15)) {
        spawnAsPolice = true;
      }

      if (spawnAsPolice) {
         isPolice.current = true;
         // Spawn behind the player to catch up
         const newZ = playerZ + 300 + (Math.random() * 200);
         api.position.set(newX, 0.6, newZ);
         // If player is doing 300, police does 330
         speed.current = Math.max(200 / 3.6, (globalPlayerSpeed + 30) / 3.6); 
      } else {
         isPolice.current = false;
         // Spawn ahead
         const newZ = playerZ - 3000 - (Math.random() * 1000);
         api.position.set(newX, 0.6, newZ);
         speed.current = (80 + Math.random() * 40) / 3.6;
      }
      
      targetLane.current = newX;
      api.velocity.set(0, 0, -speed.current);
      api.angularVelocity.set(0, 0, 0);
      nearMissTriggered.current = false;
      isBraking.current = false;
    }
  });

  return (
    <group ref={ref as any}>
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[1.8, 0.6, 4.2]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.4, -0.4]}>
        <boxGeometry args={[1.4, 0.6, 2.0]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.4, 0.61]} rotation={[-Math.PI / 4, 0, 0]}>
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.4, -1.41]} rotation={[Math.PI / 4, 0, 0]}>
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.5, -1.8]}>
        <boxGeometry args={[1.6, 0.1, 0.4]} />
        <meshStandardMaterial color="#111" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh castShadow position={[-0.7, 0.2, -1.8]}>
        <boxGeometry args={[0.1, 0.6, 0.2]} />
        <meshStandardMaterial color="#111" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh castShadow position={[0.7, 0.2, -1.8]}>
        <boxGeometry args={[0.1, 0.6, 0.2]} />
        <meshStandardMaterial color="#111" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh position={[-0.6, -0.1, 2.11]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.6, -0.1, 2.11]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.6, -0.1, -2.11]} rotation={[0, Math.PI, 0]} material={tailLightMat}>
        <planeGeometry args={[0.4, 0.2]} />
      </mesh>
      <mesh position={[0.6, -0.1, -2.11]} rotation={[0, Math.PI, 0]} material={tailLightMat}>
        <planeGeometry args={[0.4, 0.2]} />
      </mesh>
      
      {/* Police Lightbar */}
      <mesh position={[0, 0.75, 0]} material={policeLightMat}>
        <boxGeometry args={[1.2, 0.1, 0.3]} />
      </mesh>
    </group>
  );
};

export const Traffic: React.FC = () => {
  const cars = useMemo(() => {
    // Generate 60 dummy cars to litter the highway
    const carData = [];
    
    // The 4 lanes we built are roughly at x = -6, -2, 2, 6
    const lanes = [-6, -2, 2, 6];
    
    // The highway goes from z = 0 down to z = -10000
    // We will place cars from z = -100 to z = -5000
    for (let i = 0; i < 60; i++) {
      // Random depth along the highway
      const z = -100 - (Math.random() * 4900);
      
      // Random lane
      const x = lanes[Math.floor(Math.random() * lanes.length)];
      
      // Random vibrant color
      const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
      
      carData.push({
        id: i,
        position: [x, 0.6, z] as [number, number, number],
        color,
      });
    }

    // Sort by Z so they are placed sequentially (just good practice)
    carData.sort((a, b) => b.position[2] - a.position[2]);

    return carData;
  }, []);

  return (
    <group>
      {cars.map((car) => (
        <TrafficCar 
          key={car.id} 
          position={car.position} 
          color={car.color} 
        />
      ))}
    </group>
  );
};