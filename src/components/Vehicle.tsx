import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useRaycastVehicle, useBox, useCylinder } from '@react-three/cannon';
import type { WheelInfoOptions } from '@react-three/cannon';
import { CarMesh } from './CarMesh';
import { useControls } from '../hooks/useControls';
import { engineSound } from '../audio/EngineSound';

export const Vehicle: React.FC = () => {
  const { camera } = useThree();
  const controls = useControls();
  const distanceTraveled = useRef(0);
  const score = useRef(0);
  const nitroAmount = useRef(100);
  const hp = useRef(100);
  const slipstreamAmount = useRef(0);
  const isRaining = useRef(false);
  const wantedLevel = useRef(0);
  const cash = useRef(0);

  // Transmission State
  // Gears: -1 (Reverse), 0 (Neutral), 1-6 (Forward)
  const [gearIndex, setGearIndex] = useState(0);
  const gearRatios = {
    '-1': -3.0,
    '0': 0,
    '1': 3.5,
    '2': 2.1,
    '3': 1.5,
    '4': 1.1,
    '5': 0.9,
    '6': 0.7
  };
  const finalDriveRatio = 3.4;
  const maxTorque = 1200; // Increased base torque for better feel
  const wheelRadius = 0.4;

  const [rpm, setRpm] = useState(1000);
  const [isBraking, setIsBraking] = useState(false);

  // Throttle shift toggles
  const [prevShiftUp, setPrevShiftUp] = useState(false);
  const [prevShiftDown, setPrevShiftDown] = useState(false);

  // Chassis Physics
  const chassisDimensions = [1.8, 0.4, 4.2];
  const [chassisRef, chassisApi] = useBox(() => ({
    mass: 800, // Reduced mass for arcade-style responsiveness
    args: chassisDimensions as [number, number, number],
    position: [0, 0.5, 0], // Spawn closer to ground to prevent initial 'dancing' drop
    allowSleep: false,
    onCollide: (e) => {
      const impact = e.contact.impactVelocity;
      if (impact > 15) { // Hard crash
        hp.current = Math.max(0, hp.current - (impact * 2));
        if (hp.current <= 0) {
          engineSound.engineOn = false; // Kill engine on total failure
        }
      }
    }
  }));

  // Velocity tracking
  const velocity = useRef(new THREE.Vector3());
  const chassisPos = useRef(new THREE.Vector3(0, 0.5, 0));
  const chassisQuat = useRef(new THREE.Quaternion());
  const currentSteer = useRef(0); // For smooth steering interpolation
  
  useEffect(() => {
    const unsubVel = chassisApi.velocity.subscribe((v) => velocity.current.set(v[0], v[1], v[2]));
    const unsubPos = chassisApi.position.subscribe((p) => chassisPos.current.set(p[0], p[1], p[2]));
    const unsubQuat = chassisApi.quaternion.subscribe((q) => chassisQuat.current.set(q[0], q[1], q[2], q[3]));
    
    const handleNearMiss = () => {
      score.current += 100;
      nitroAmount.current = Math.min(100, nitroAmount.current + 20);
      wantedLevel.current = Math.min(5.0, wantedLevel.current + 0.5); // Add half a star per near miss
    };
    
    const handleSlipstream = () => {
      slipstreamAmount.current = Math.min(1.0, slipstreamAmount.current + 0.05);
      score.current += 2;
      nitroAmount.current = Math.min(100, nitroAmount.current + 0.2); // Rapid recharge
    };

    const handleWeatherChange = (e: any) => {
      isRaining.current = e.detail.isRaining;
    };

    const handleCollectCash = () => {
      cash.current += 100;
      score.current += 500;
    };

    window.addEventListener('near-miss', handleNearMiss);
    window.addEventListener('slipstream-tick', handleSlipstream);
    window.addEventListener('weather-change', handleWeatherChange);
    window.addEventListener('collect-cash', handleCollectCash);

    return () => {
      unsubVel();
      unsubPos();
      unsubQuat();
      window.removeEventListener('near-miss', handleNearMiss);
      window.removeEventListener('slipstream-tick', handleSlipstream);
      window.removeEventListener('weather-change', handleWeatherChange);
      window.removeEventListener('collect-cash', handleCollectCash);
    };
  }, [chassisApi]);

  // Smoke Particles
  const smokeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const smokeCount = 10;

  // Wheel setup
  const wheelOptions: WheelInfoOptions = {
    radius: wheelRadius,
    directionLocal: [0, -1, 0],
    suspensionStiffness: 40, // Stiffer suspension for arcade handling
    suspensionRestLength: 0.3,
    frictionSlip: 5.0, // High grip
    dampingRelaxation: 2.3,
    dampingCompression: 4.4,
    maxSuspensionForce: 100000, // Restored to default
    rollInfluence: 0.01,
    axleLocal: [1, 0, 0], 
    chassisConnectionPointLocal: [1, 0, 1],
    maxSuspensionTravel: 0.3,
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true,
  };

  const wheelPositions: [number, number, number][] = [
    [-1.1, -0.2, 1.2], // Front Left (Widened stance for stability)
    [1.1, -0.2, 1.2],  // Front Right
    [-1.1, -0.2, -1.4], // Rear Left
    [1.1, -0.2, -1.4],  // Rear Right
  ];

  const wheelMaterial = { friction: 2.0 }; // Massive grip

  const wheelInfos = React.useMemo(() => {
    return wheelPositions.map((pos) => ({
      ...wheelOptions,
      chassisConnectionPointLocal: pos,
      isFrontWheel: pos[2] > 0,
    }));
  }, []);

  const wheelRef0 = useRef<THREE.Object3D>(null);
  const wheelRef1 = useRef<THREE.Object3D>(null);
  const wheelRef2 = useRef<THREE.Object3D>(null);
  const wheelRef3 = useRef<THREE.Object3D>(null);

  const [vehicleRef, vehicleApi] = useRaycastVehicle(() => ({
    chassisBody: chassisRef as any,
    wheels: [wheelRef0, wheelRef1, wheelRef2, wheelRef3] as any,
    wheelInfos,
    indexForwardAxis: 2,
    indexRightAxis: 0,
    indexUpAxis: 1,
  }));

  // Need separate useCylinder for each wheel to satisfy the RaycastVehicle
  const wheelShape = () => ({
    mass: 20,
    type: 'Kinematic' as const,
    material: wheelMaterial,
    collisionFilterGroup: 0, // Wheels don't collide with chassis
    args: [wheelRadius, wheelRadius, 0.3, 16] as [number, number, number, number],
    rotation: [0, 0, -Math.PI / 2] as [number, number, number],
  });

  const [wRef0] = useCylinder(wheelShape, wheelRef0 as any);
  const [wRef1] = useCylinder(wheelShape, wheelRef1 as any);
  const [wRef2] = useCylinder(wheelShape, wheelRef2 as any);
  const [wRef3] = useCylinder(wheelShape, wheelRef3 as any);

  // Combine into array for the vehicle API if necessary, actually useRaycastVehicle injects into the ref internally.
  // Wait, the correct way in recent react-three-cannon is passing refs to `wheels`.
  useEffect(() => {
    // We update the vehicle configuration internally in cannon
  }, []);

  useFrame((_, delta) => {
    const engineOn = engineSound.engineOn;
    
    // Decay slipstream over time
    slipstreamAmount.current = Math.max(0, slipstreamAmount.current - (delta * 0.5));

    // Handle Smoke Effects
    if (hp.current < 30) {
      smokeRefs.current.forEach((smoke) => {
        if (!smoke) return;
        smoke.visible = true;
        smoke.position.y += delta * 2;
        smoke.position.x += (Math.random() - 0.5) * delta;
        smoke.scale.x = smoke.scale.y = smoke.scale.z += delta;
        (smoke.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1.0 - (smoke.position.y / 2));
        
        if (smoke.position.y > 2) {
          smoke.position.set((Math.random() - 0.5) * 0.5, 0.5, 1.5); // Reset at hood
          smoke.scale.set(0.2, 0.2, 0.2);
          (smoke.material as THREE.MeshBasicMaterial).opacity = 1.0;
        }
      });
    } else {
      smokeRefs.current.forEach(s => { if (s) s.visible = false; });
    }

    // Handle Gear Shifting
    if (engineOn) {
      if (controls.shiftUp && !prevShiftUp) {
        setGearIndex((g) => {
          if (g < 6) {
            engineSound.playGearShift(true);
            return g + 1;
          }
          return g;
        });
      }
      if (controls.shiftDown && !prevShiftDown) {
        setGearIndex((g) => {
          if (g > -1) {
            engineSound.playGearShift(false);
            return g - 1;
          }
          return g;
        });
      }
    }
    setPrevShiftUp(controls.shiftUp);
    setPrevShiftDown(controls.shiftDown);

    // Calculate Speed (KM/H)
    const speedMs = velocity.current.length(); // m/s
    const speedKmh = speedMs * 3.6;

    // Wanted Level Logic
    if (speedKmh > 200) {
      wantedLevel.current = Math.min(5.0, wantedLevel.current + delta * 0.1); // Gain stars from speeding
    } else if (speedKmh < 100) {
      wantedLevel.current = Math.max(0, wantedLevel.current - delta * 0.2); // Lose stars if driving slow
    }

    // Calculate RPM based on wheel speed (simplified as chassis forward velocity)
    // Forward velocity:
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(chassisQuat.current);
    const forwardSpeedMs = velocity.current.dot(forwardVector);

    const gearRatio = gearRatios[gearIndex.toString() as keyof typeof gearRatios];
    
    // Odometer tracking
    distanceTraveled.current += Math.abs(forwardSpeedMs) * delta;
    
    // Nitro Logic
    const isNitroActive = controls.nitro && nitroAmount.current > 0 && engineOn && gearIndex > 0;
    if (isNitroActive) {
      nitroAmount.current = Math.max(0, nitroAmount.current - (delta * 20)); // Depletes in 5 seconds
      // Warp FOV for speed effect
      (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, 100, 0.1);
    } else {
      (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, 60, 0.1);
    }
    camera.updateProjectionMatrix();

    // RPM Math:
    // v = r * w => w = v / r (rad/s)
    // RPM = w * 60 / (2PI) * Gear * FinalDrive
    let calcRpm = 0;
    
    if (engineOn) {
      calcRpm = 1000; // Idle RPM
      if (gearIndex !== 0) {
        calcRpm = Math.max(1000, Math.abs((forwardSpeedMs / wheelRadius) * (60 / (2 * Math.PI)) * gearRatio * finalDriveRatio));
      }
    }
    
    // Add fake RPM rise when revving in Neutral
    if (engineOn && gearIndex === 0 && controls.forward) {
      calcRpm = rpm + (3000 * delta); // revving up
    } else if (engineOn && gearIndex === 0 && !controls.forward) {
      calcRpm = rpm - (2000 * delta); // idle drop
    }

    // Clamp RPM
    if (engineOn && calcRpm < 1000) calcRpm = 1000;
    if (!engineOn) calcRpm = 0;
    
    // Rev limiter bounce (Redline at 7500, absolute cap 8000)
    let isBouncing = false;
    if (calcRpm > 7500 && controls.forward && engineOn) {
      isBouncing = Math.random() > 0.5; // Stutter effect
      if (calcRpm > 8000) calcRpm = 8000;
    }

    setRpm(calcRpm);

    // Apply Engine Force and Braking
    let engineForce = 0;

    if (engineOn) {
      // ENGINE BRAKING: If the wheels are spinning too fast for the current gear, forcefully slow down
      if (calcRpm >= 8000 && forwardSpeedMs > 5.0 && gearIndex > 0) {
        engineForce = -12000; // Violent engine braking (e.g. shifting to 1st at 200kmh)
      } else if (controls.forward && !isBouncing) {
        if (gearIndex > 0) {
          // Limit torque heavily in 1st/2nd gear so it doesn't jump to 100kmh instantly
          let gearTorqueLimit = maxTorque;
          if (gearIndex === 1) gearTorqueLimit = maxTorque * 0.4;
          if (gearIndex === 2) gearTorqueLimit = maxTorque * 0.7;

          // Torque curve (simple linear drop off at high RPM)
          const torqueMultiplier = Math.max(0.1, 1.0 - (calcRpm / 8000));
          engineForce = gearTorqueLimit * gearRatio * finalDriveRatio * torqueMultiplier;
          
          if (slipstreamAmount.current > 0) {
            engineForce *= (1.0 + (slipstreamAmount.current * 0.5)); // Up to 50% power boost
          }
          
          if (isNitroActive) {
            engineForce *= 3.0; // Massive boost
            calcRpm = Math.min(8000, calcRpm + 500); // Surge RPM
          }
        } else if (gearIndex === -1) {
          engineForce = -(maxTorque * 0.4 * Math.abs(gearRatio) * finalDriveRatio);
        }
      }

      if (controls.backward) {
        if (forwardSpeedMs > 1.0) { 
          // Normal Braking 
          engineForce = -6000; 
        } else if (gearIndex === -1) { 
          // Reverse
          engineForce = -(maxTorque * 0.4 * Math.abs(gearRatio) * finalDriveRatio);
        }
      }
    }

    let handbrakeForce = 0;
    if (controls.handbrake) {
      handbrakeForce = 50; // Use actual brake force only for handbrake lock
    }

    // Apply Brakes ONLY for handbrake, to avoid standard braking jumping glitch
    vehicleApi.setBrake(handbrakeForce, 2); // Rear Left
    vehicleApi.setBrake(handbrakeForce, 3); // Rear Right
    // Ensure front brakes are off
    vehicleApi.setBrake(0, 0); 
    vehicleApi.setBrake(0, 1); 

    setIsBraking((controls.backward && forwardSpeedMs > 0.5) || controls.handbrake);

    // Apply to all wheels for AWD arcade stability
    vehicleApi.applyEngineForce(engineForce, 0);
    vehicleApi.applyEngineForce(engineForce, 1);
    vehicleApi.applyEngineForce(engineForce, 2);
    vehicleApi.applyEngineForce(engineForce, 3);

    // Smooth Racing Steering
    // Lowered max steering angle to prevent twitchy arcade movements
    const maxSteerVal = 0.15; // Reduced from 0.25 for less sensitivity
    let targetSteerVal = controls.left ? -maxSteerVal : controls.right ? maxSteerVal : 0;
    
    // Simulate slippery roads in the rain
    if (isRaining.current && speedKmh > 100) {
      engineForce *= 0.7; // 30% loss of power due to slipping tires
      if (controls.left || controls.right) {
         // Add random jitter to steering when turning in the rain at high speeds
         targetSteerVal += (Math.random() - 0.5) * 0.05;
      }
    }

    // Very smooth, gradual lerp for high-speed stability
    currentSteer.current = THREE.MathUtils.lerp(currentSteer.current, targetSteerVal, isRaining.current ? 0.01 : 0.02);

    vehicleApi.setSteeringValue(currentSteer.current, 0);
    vehicleApi.setSteeringValue(currentSteer.current, 1);

    // Update Telemetry UI via CustomEvent
    const gearStr = gearIndex === 0 ? 'N' : gearIndex === -1 ? 'R' : gearIndex.toString();
    const telemetryEvent = new CustomEvent('telemetry', {
      detail: { 
        rpm: calcRpm, 
        speed: speedKmh, 
        gear: gearStr,
        distance: distanceTraveled.current / 1000, // Convert meters to KM
        engineOn: engineOn,
        nitro: nitroAmount.current,
        score: score.current,
        hp: hp.current,
        wantedLevel: Math.floor(wantedLevel.current), // Send integer 0-5
        cash: cash.current
      }
    });
    window.dispatchEvent(telemetryEvent);

    // Update Audio
    engineSound.setRPM(calcRpm, 8000, controls.forward);

    // Third-person Follow Camera (Robust TPP)
    const currentChassisPos = chassisPos.current;
    const currentChassisQuat = chassisQuat.current;

    // Extract only the Yaw (Y-axis rotation) from the car's quaternion
    const euler = new THREE.Euler().setFromQuaternion(currentChassisQuat, 'YXZ');
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);

    // Offset camera behind and above the car (using only Yaw so it doesn't flip if car flips)
    // -Z is forward, so +Z is behind
    const cameraOffset = new THREE.Vector3(0, 3, 8);
    cameraOffset.applyQuaternion(yawQuat);
    const targetCameraPos = currentChassisPos.clone().add(cameraOffset);

    // Smoothly move camera
    camera.position.lerp(targetCameraPos, 0.1);
    
    // Look slightly above the car
    const lookAtTarget = currentChassisPos.clone().add(new THREE.Vector3(0, 1, 0));
    camera.lookAt(lookAtTarget);
  });

  return (
    <group ref={vehicleRef as any}>
      {/* Always-on illumination light so the player can always see the car and road */}
      <pointLight position={[0, 10, 10]} intensity={1.5} distance={150} decay={1.5} color="#ffffff" />

      {/* Chassis Body Visual & Attached Effects */}
      <group ref={chassisRef as any}>
        <CarMesh isBraking={isBraking} />

        {/* Smoke Emitters */}
        <group>
          {Array.from({ length: smokeCount }).map((_, i) => (
            <mesh 
              key={i} 
              ref={(el) => (smokeRefs.current[i] = el)} 
              position={[(Math.random() - 0.5) * 0.5, 0.5, 1.5]} 
              visible={false}
            >
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshBasicMaterial color="#111" transparent opacity={0.8} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Wheels Visuals */}
      {[wRef0, wRef1, wRef2, wRef3].map((ref, i) => (
        <group ref={ref as any} key={i}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelRadius, wheelRadius, 0.35, 24]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
            {/* Shiny Rim */}
            <mesh>
              <cylinderGeometry args={[wheelRadius * 0.65, wheelRadius * 0.65, 0.37, 16]} />
              <meshStandardMaterial color="#999" metalness={0.9} roughness={0.1} />
            </mesh>
          </mesh>
        </group>
      ))}
    </group>
  );
};
