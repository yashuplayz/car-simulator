import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import * as THREE from 'three';
import { HUD } from './components/HUD';
import { Scene } from './components/Scene';
import { Traffic } from './components/Traffic';
import { Vehicle } from './components/Vehicle';
import { engineSound } from './audio/EngineSound';

function App() {
  const handleStartEngine = () => {
    engineSound.init();
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ position: [0, 5, -10], fov: 60 }}>
        <Physics broadphase="SAP" gravity={[0, -9.81, 0]}>
          <Scene />
          <Traffic />
          <Vehicle />
        </Physics>
      </Canvas>

      <HUD onStartEngine={handleStartEngine} />
    </div>
  );
}

export default App;
