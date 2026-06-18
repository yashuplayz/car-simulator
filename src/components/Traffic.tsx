import React, { useMemo, useRef } from 'react';
import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';

interface TrafficCarProps {
  position: [number, number, number];
  color: string;
}

const TrafficCar: React.FC<TrafficCarProps> = ({ position, color }) => {
  // We use a simple box physics body for dummy cars.
  // We give them a heavy mass so they behave like real parked cars if you hit them!
  const [ref, api] = useBox(() => ({
    mass: 1500, 
    args: [1.8, 1.2, 4.2], // Standard car dimensions
    position,
    allowSleep: true, // Crucial for performance: disables physics calculations until you hit them
    sleepSpeedLimit: 1.0,
    sleepTimeLimit: 1.0,
    linearDamping: 0.9, // So they slide to a halt if you punt them
    angularDamping: 0.9,
  }));

  const localPos = useRef(position);
  const nearMissTriggered = useRef(false);
  const speed = useRef(Math.random() * 15 + 15); // 15 to 30 m/s (54 to 108 km/h)

  // Subscribe to position updates so we know where this body actually is
  React.useEffect(() => {
    const unsub = api.position.subscribe((p) => (localPos.current = p as [number, number, number]));
    return unsub;
  }, [api.position]);

  // Infinite Traffic Chunking & Driving AI
  useFrame(({ camera }) => {
    const playerZ = camera.position.z;
    const myZ = localPos.current[2];

    // AI Driving: Apply forward velocity constantly
    api.velocity.set(0, 0, -speed.current);

    // Near Miss Detection
    // The player's car is roughly at camera.position.x, and camera.position.z - 8
    const playerDist = Math.hypot(camera.position.x - localPos.current[0], (camera.position.z - 8) - localPos.current[2]);
    if (playerDist < 4.0 && playerDist > 1.8 && !nearMissTriggered.current) {
      nearMissTriggered.current = true;
      window.dispatchEvent(new CustomEvent('near-miss'));
    }

    // Reset trigger if far away
    if (playerDist > 10.0) {
      nearMissTriggered.current = false;
    }

    // If the car is 100 meters BEHIND the player, teleport it 4000 meters AHEAD
    if (myZ > playerZ + 100) {
      const lanes = [-6, -2, 2, 6];
      const newX = lanes[Math.floor(Math.random() * lanes.length)];
      const newZ = playerZ - 3000 - (Math.random() * 1000);
      
      api.position.set(newX, 0.6, newZ);
      api.velocity.set(0, 0, -speed.current);
      api.angularVelocity.set(0, 0, 0);
      nearMissTriggered.current = false;
    }
  });

  return (
    <group ref={ref as any}>
      {/* Main Body / Chassis */}
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[1.8, 0.6, 4.2]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.6} />
      </mesh>
      
      {/* Cabin / Roof */}
      <mesh castShadow receiveShadow position={[0, 0.4, -0.4]}>
        <boxGeometry args={[1.4, 0.6, 2.0]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, 0.4, 0.61]} rotation={[-Math.PI / 4, 0, 0]}>
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Rear Window */}
      <mesh position={[0, 0.4, -1.41]} rotation={[Math.PI / 4, 0, 0]}>
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Spoiler */}
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

      {/* Headlights */}
      <mesh position={[-0.6, -0.1, 2.11]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.6, -0.1, 2.11]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Taillights */}
      <mesh position={[-0.6, -0.1, -2.11]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0.6, -0.1, -2.11]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.4, 0.2]} />
        <meshBasicMaterial color="#ff0000" />
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
