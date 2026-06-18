import { useState, useEffect } from 'react';

export const useControls = () => {
  const [controls, setControls] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    shiftUp: false,
    shiftDown: false,
    handbrake: false,
    ignition: true, // defaults to true, toggled manually
    nitro: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          setControls((c) => ({ ...c, forward: true }));
          break;
        case 's':
        case 'arrowdown':
          setControls((c) => ({ ...c, backward: true }));
          break;
        case 'a':
        case 'arrowleft':
          setControls((c) => ({ ...c, left: true }));
          break;
        case 'd':
        case 'arrowright':
          setControls((c) => ({ ...c, right: true }));
          break;
        case 'e':
          setControls((c) => ({ ...c, shiftUp: true }));
          break;
        case 'q':
          setControls((c) => ({ ...c, shiftDown: true }));
          break;
        case ' ':
          setControls((c) => ({ ...c, handbrake: true }));
          break;
        case 'shift':
          setControls((c) => ({ ...c, nitro: true }));
          break;
        case 'i':
          setControls((c) => {
            const newIgnition = !c.ignition;
            return { ...c, ignition: newIgnition };
          });
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          setControls((c) => ({ ...c, forward: false }));
          break;
        case 's':
        case 'arrowdown':
          setControls((c) => ({ ...c, backward: false }));
          break;
        case 'a':
        case 'arrowleft':
          setControls((c) => ({ ...c, left: false }));
          break;
        case 'd':
        case 'arrowright':
          setControls((c) => ({ ...c, right: false }));
          break;
        case 'e':
          setControls((c) => ({ ...c, shiftUp: false }));
          break;
        case 'q':
          setControls((c) => ({ ...c, shiftDown: false }));
          break;
        case ' ':
          setControls((c) => ({ ...c, handbrake: false }));
          break;
        case 'shift':
          setControls((c) => ({ ...c, nitro: false }));
          break;
      }
    };

    const handleMobileControl = (e: any) => {
      const { control, state } = e.detail;
      setControls((c) => ({ ...c, [control]: state }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mobile-control', handleMobileControl);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mobile-control', handleMobileControl);
    };
  }, []);

  return controls;
};
