import { engineSound } from '../audio/EngineSound';
import { music } from '../audio/Music';
import React, { useState, useEffect, useRef } from 'react';

interface HUDProps {
  onStartEngine: () => void;
}

export const HUD: React.FC<HUDProps> = ({ onStartEngine }) => {
  const [started, setStarted] = useState(false);
  const [selectedCar, setSelectedCar] = useState(0);
  const [telemetry, setTelemetry] = useState({ rpm: 0, speed: 0, gear: 'N', distance: 0, engineOn: false, nitro: 100, score: 0, hp: 100, wantedLevel: 0, cash: 0 });
  const [musicOn, setMusicOn] = useState(false);
  const [engineSoundOn, setEngineSoundOn] = useState(true);

  const accState = useRef({
    startTime: 0,
    time100: null as number | null,
    time200: null as number | null,
    time300: null as number | null,
    current: 0
  });

  useEffect(() => {
    const handleTelemetry = (e: any) => {
      setTelemetry(e.detail);

      const speed = Math.abs(e.detail.speed);
      const now = Date.now();
      const s = accState.current;

      if (speed < 1) {
        s.startTime = 0;
        s.time100 = null;
        s.time200 = null;
        s.time300 = null;
        s.current = 0;
      } else if (s.startTime === 0 && speed >= 1) {
        s.startTime = now;
      } else if (s.startTime > 0) {
        s.current = (now - s.startTime) / 1000;
        if (speed >= 100 && s.time100 === null) s.time100 = s.current;
        if (speed >= 200 && s.time200 === null) s.time200 = s.current;
        if (speed >= 300 && s.time300 === null) s.time300 = s.current;
      }
    };
    window.addEventListener('telemetry', handleTelemetry);
    return () => window.removeEventListener('telemetry', handleTelemetry);
  }, []);

  const handleStart = () => {
    setStarted(true);
    engineSound.carProfile = selectedCar;
    onStartEngine();
    setTimeout(() => {
      engineSound.playEngineStart();
    }, 100); // Slight delay for audio context
  };

  const isRedline = telemetry.rpm >= 7500;
  const rpmRatio = Math.min(1, telemetry.rpm / 8000);

  const handleMusicToggle = () => {
    const isPlaying = music.toggle();
    setMusicOn(isPlaying);
  };

  const handleEngineSoundToggle = () => {
    const isMuted = engineSound.toggleMute();
    setEngineSoundOn(!isMuted);
  };

  const dispatchTouch = (control: string, state: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('mobile-control', { detail: { control, state } }));
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">

      {/* --------------------------------- */}
      {/* MOBILE HUD (Ultra Minimal)        */}
      {/* --------------------------------- */}
      {started && (
        <div className="absolute top-0 inset-x-0 p-2 flex flex-col gap-2 md:hidden pointer-events-none z-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent pb-8">
          <div className="flex justify-between items-start px-2">
            {/* Left: Speed, Gear & RPM */}
            <div className="flex flex-col drop-shadow-lg">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tabular-nums">{Math.floor(Math.abs(telemetry.speed))}</span>
                <span className="text-[10px] font-bold text-white/50 tracking-widest">KM/H</span>
                <span className="text-2xl font-black text-purple-400 ml-2">G{telemetry.gear}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-black tabular-nums tracking-widest ${isRedline ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-white'}`}>
                  {Math.floor(telemetry.rpm)} RPM
                </span>
                <div className="h-1.5 w-16 bg-black/50 rounded-full overflow-hidden border border-white/10">
                  <div className={`h-full transition-all duration-75 ${isRedline ? 'bg-red-500' : 'bg-white'}`} style={{ width: `${rpmRatio * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Right: Score, Cash & Audio Toggles */}
            <div className="text-right flex flex-col items-end gap-2 pointer-events-auto">
              <div className="flex flex-col items-end gap-0">
                <span className="text-2xl font-black text-white drop-shadow-md tabular-nums">{Math.floor(telemetry.score).toLocaleString()}</span>
                <span className="text-sm font-black text-green-400 drop-shadow-md tabular-nums">${telemetry.cash.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={handleMusicToggle} className={`text-[9px] font-black px-2 py-1 rounded border tracking-widest ${musicOn ? 'bg-purple-600/30 border-purple-500 text-purple-200' : 'bg-black/50 border-white/20 text-white/50'}`}>
                  {musicOn ? 'MUS:ON' : 'MUS:OFF'}
                </button>
                <button onClick={handleEngineSoundToggle} className={`text-[9px] font-black px-2 py-1 rounded border tracking-widest ${engineSoundOn ? 'bg-red-600/30 border-red-500 text-red-200' : 'bg-black/50 border-white/20 text-white/50'}`}>
                  {engineSoundOn ? 'ENG:ON' : 'ENG:OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Wanted Level Stars (Mobile) */}
          <div className="px-2 mt-1 flex gap-1 justify-end">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={`text-lg font-black drop-shadow-md transition-colors ${telemetry.wantedLevel >= star ? 'text-yellow-400' : 'text-white/20'}`}>★</span>
            ))}
          </div>

          {/* Thin Bars for HP and Nitro */}
          <div className="px-2 flex flex-col gap-1.5 mt-1">
            <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden border border-white/10">
              <div className={`h-full transition-all duration-300 ${telemetry.hp > 50 ? 'bg-green-500' : telemetry.hp > 25 ? 'bg-yellow-500' : 'bg-red-600'}`} style={{ width: `${telemetry.hp}%` }} />
            </div>
            <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden border border-white/10">
              <div className="h-full bg-cyan-400 transition-all duration-75" style={{ width: `${telemetry.nitro}%` }} />
            </div>
          </div>

          {/* Mobile Extra Stats */}
          <div className="px-2 mt-2 flex justify-between text-[9px] font-black tracking-[0.2em] text-white/60 drop-shadow-md">
             <span>TRIP: {telemetry.distance.toFixed(1)} KM</span>
             <span>
               100: {accState.current.time100 ? accState.current.time100.toFixed(1) + 's' : '--'} 
               {' | '}200: {accState.current.time200 ? accState.current.time200.toFixed(1) + 's' : '--'}
             </span>
          </div>
        </div>
      )}

      {/* --------------------------------- */}
      {/* DESKTOP HUD                       */}
      {/* --------------------------------- */}

      {/* Top Right Buttons */}
      <div className="hidden md:flex absolute top-12 right-12 flex-col gap-4 pointer-events-auto z-40 items-end">
        <button
          onClick={handleMusicToggle}
          className={`px-6 py-3 rounded-xl border-2 font-black tracking-widest transition-all ${musicOn ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-black/50 border-white/10 text-white/50'}`}
        >
          {musicOn ? 'MUSIC: ON' : 'MUSIC: OFF'}
        </button>
        <button
          onClick={handleEngineSoundToggle}
          className={`px-6 py-3 rounded-xl border-2 font-black tracking-widest transition-all ${engineSoundOn ? 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-black/50 border-white/10 text-white/50'}`}
        >
          {engineSoundOn ? 'ENGINE AUDIO: ON' : 'ENGINE AUDIO: OFF'}
        </button>

        {/* Acceleration Timers */}
        <div className="bg-black/40 p-6 rounded-3xl backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-3 mt-4 pointer-events-none text-left min-w-[220px]">
          <div>
            <span className="text-[10px] text-white/40 tracking-[0.2em] font-bold block mb-1">0-100 KM/H</span>
            <span className={`text-xl font-black tabular-nums tracking-widest ${accState.current.time100 ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'text-white/20'}`}>
              {accState.current.time100 ? accState.current.time100.toFixed(2) + 's' : '--'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-white/40 tracking-[0.2em] font-bold block mb-1">0-200 KM/H</span>
            <span className={`text-xl font-black tabular-nums tracking-widest ${accState.current.time200 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'text-white/20'}`}>
              {accState.current.time200 ? accState.current.time200.toFixed(2) + 's' : '--'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-white/40 tracking-[0.2em] font-bold block mb-1">0-300 KM/H</span>
            <span className={`text-xl font-black tabular-nums tracking-widest ${accState.current.time300 ? 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]' : 'text-white/20'}`}>
              {accState.current.time300 ? accState.current.time300.toFixed(2) + 's' : '--'}
            </span>
          </div>
          
          {/* Active Timer showing current run if not finished */}
          <div className="mt-1 pt-3 border-t border-white/10">
            <span className="text-[10px] text-white/40 tracking-[0.2em] font-bold block mb-1">CURRENT RUN</span>
            <span className={`text-2xl font-black tabular-nums tracking-widest ${accState.current.startTime > 0 && !accState.current.time300 ? 'text-white' : 'text-white/20'}`}>
              {accState.current.startTime > 0 ? accState.current.current.toFixed(2) + 's' : '0.00s'}
            </span>
          </div>
        </div>
      </div>

      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c12]/90 backdrop-blur-xl pointer-events-auto z-50 transition-opacity duration-500">
          <div className="text-center flex flex-col items-center px-4">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-[0.2em] drop-shadow-2xl">Yashu's</h1>
            <p className="text-white/50 tracking-[0.3em] text-[10px] md:text-sm mb-8 md:mb-12">MANUAL TRANSMISSION SIMULATOR</p>

            <div className="flex flex-col md:flex-row gap-4 mb-8 md:mb-12">
              {[
                { id: 0, name: "MODERN SUPERCAR", desc: "Dual-clutch, high pitch whine" },
                { id: 1, name: "CLASSIC MUSCLE", desc: "Heavy clacks, deep bass" },
                { id: 2, name: "JDM TUNER", desc: "Screaming high RPMs" }
              ].map((car) => (
                <button
                  key={car.id}
                  onClick={() => setSelectedCar(car.id)}
                  className={`p-6 border-2 rounded-xl text-left w-64 transition-all duration-300 ${selectedCar === car.id
                    ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                    : 'border-white/10 hover:border-white/30 bg-black/50'
                    }`}
                >
                  <h3 className="text-white font-black tracking-widest mb-2">{car.name}</h3>
                  <p className="text-white/50 text-xs">{car.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleStart}
              className="px-8 py-4 md:px-12 md:py-5 bg-red-600 hover:bg-red-500 text-white text-base md:text-lg font-black rounded-sm tracking-[0.3em] transition-all duration-300 shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_50px_rgba(220,38,38,0.8)] border border-red-400/30"
            >
              START ENGINE
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {started && telemetry.hp <= 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto z-50 transition-opacity duration-500">
          <div className="text-center flex flex-col items-center">
            <h1 className="text-6xl font-black text-red-600 mb-2 tracking-[0.2em] drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]">CRITICAL FAILURE</h1>
            <p className="text-white/50 tracking-[0.3em] text-sm mb-12">ENGINE DESTROYED</p>

            <div className="flex gap-12 mb-12 text-left">
              <div>
                <span className="block text-xs text-white/40 tracking-[0.2em] font-bold mb-1">FINAL SCORE</span>
                <span className="text-3xl font-black text-purple-400 tracking-widest">{Math.floor(telemetry.score).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-xs text-white/40 tracking-[0.2em] font-bold mb-1">DISTANCE SURVIVED</span>
                <span className="text-3xl font-black text-white tracking-widest">{telemetry.distance.toFixed(1)} KM</span>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="px-12 py-5 bg-white text-black hover:bg-gray-200 text-lg font-black rounded-sm tracking-[0.3em] transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:shadow-[0_0_50px_rgba(255,255,255,0.8)]"
            >
              RESTART
            </button>
          </div>
        </div>
      )}

      {/* Speedometer & Gear & RPM */}
      <div className="hidden md:flex absolute bottom-12 right-12 items-end gap-10 bg-black/40 p-8 rounded-[2rem] backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">

        {/* RPM Bar */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Background circle */}
          <svg className="absolute w-full h-full -rotate-225" viewBox="0 0 100 100" style={{ transform: 'rotate(-225deg)' }}>
            <circle cx="50" cy="50" r="40" className="stroke-white/10 fill-none" strokeWidth="6" strokeDasharray="188 251" />
            <circle
              cx="50" cy="50" r="40"
              className={`fill-none transition-all duration-75 ${isRedline ? 'stroke-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.9)]' : 'stroke-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]'}`}
              strokeWidth="6"
              strokeDasharray={`${rpmRatio * 188} 251`}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-4xl font-black tabular-nums transition-colors ${isRedline ? 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]' : 'text-white'}`}>
              {Math.floor(telemetry.rpm)}
            </span>
            <span className="text-xs text-white/40 tracking-[0.2em] font-bold mt-1">RPM</span>
          </div>
        </div>

        {/* Speedometer */}
        <div className="flex flex-col items-end pb-4">
          <span className="text-[5rem] leading-none font-black text-white tabular-nums tracking-tighter drop-shadow-xl">
            {Math.floor(Math.abs(telemetry.speed))}
          </span>
          <span className="text-sm text-white/40 tracking-[0.2em] font-bold mt-2">KM/H</span>
        </div>

        {/* Gear Indicator */}
        <div className="flex flex-col items-center justify-center bg-black/60 w-24 h-32 rounded-2xl border border-white/10 shadow-inner">
          <span className="text-6xl font-black text-white drop-shadow-xl">{telemetry.gear}</span>
          <span className="text-[10px] text-white/30 tracking-[0.2em] font-bold mt-2">GEAR</span>
        </div>
      </div>

      {/* Controls Help & Odometer */}
      <div className="hidden md:flex absolute top-12 left-12 flex-col gap-6">
        <div className="bg-black/40 p-8 rounded-3xl backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white/80">
          <h3 className="text-xs font-black text-white/40 mb-6 tracking-[0.3em]">TELEMETRY / CONTROLS</h3>
          <div className="grid grid-cols-[80px_1fr] gap-y-2 text-xs font-bold">
            <span className="text-white/40">W / S</span>
            <span className="text-white">Accelerate / Brake</span>
            <span className="text-white/40">A / D</span>
            <span className="text-white">Steer</span>
            <span className="text-red-500 mt-2">E</span>
            <span className="text-white mt-2">Gear Up</span>
            <span className="text-red-500">Q</span>
            <span className="text-white">Gear Down</span>
            <span className="text-red-500 mt-2">SHIFT</span>
            <span className="text-white mt-2">NITROUS</span>
            <span className="text-red-500 mt-2">I</span>
            <span className="text-white mt-2">Ignition Toggle</span>
            <span className="text-red-500 mt-2">SPACE</span>
            <span className="text-white mt-2">Handbrake</span>
          </div>
        </div>

        {/* Score, Cash & Odometer */}
        <div className="bg-black/40 p-6 rounded-3xl backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4">
          
          {/* Wanted Level (Desktop) */}
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={`text-2xl font-black drop-shadow-md transition-colors ${telemetry.wantedLevel >= star ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'text-white/20'}`}>★</span>
            ))}
          </div>

          <div>
            <span className="text-xs text-white/40 tracking-[0.2em] font-bold block mb-1">SCORE</span>
            <span className="text-3xl font-black text-purple-400 tabular-nums tracking-widest drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
              {Math.floor(telemetry.score).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-xs text-white/40 tracking-[0.2em] font-bold block mb-1">CASH</span>
            <span className="text-2xl font-black text-green-400 tabular-nums tracking-widest drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]">
              ${telemetry.cash.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-xs text-white/40 tracking-[0.2em] font-bold block mb-1">TRIP METER</span>
            <span className="text-2xl font-black text-white tabular-nums tracking-widest">
              {telemetry.distance.toFixed(1)} <span className="text-sm text-white/40">KM</span>
            </span>
          </div>
        </div>
      </div>

      {/* Nitro & HP Bars */}
      <div className="hidden md:flex absolute bottom-12 left-12 w-64 bg-black/40 p-6 rounded-3xl backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex-col gap-4">

        {/* HP Bar */}
        <div>
          <span className="text-xs text-white/40 tracking-[0.2em] font-bold block mb-2">VEHICLE INTEGRITY</span>
          <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-300 ${telemetry.hp > 50 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : telemetry.hp > 25 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]' : 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]'}`}
              style={{ width: `${telemetry.hp}%` }}
            />
          </div>
        </div>

        {/* Nitro Bar */}
        <div>
          <span className="text-xs text-white/40 tracking-[0.2em] font-bold block mb-2">N2O BOOST</span>
          <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-cyan-400 transition-all duration-75 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
              style={{ width: `${telemetry.nitro}%` }}
            />
          </div>
        </div>

      </div>

      {/* Mobile Touch Controls Overlay */}
      {started && (
        <div className="absolute inset-x-0 bottom-24 h-48 pointer-events-none z-30 flex md:hidden justify-between px-2">

          {/* Left Thumb: Steering */}
          <div className="flex gap-2 items-end pointer-events-auto">
            <button
              className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 active:bg-white/30 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-3xl text-white select-none"
              onTouchStart={dispatchTouch('left', true)} onTouchEnd={dispatchTouch('left', false)}
              onMouseDown={dispatchTouch('left', true)} onMouseUp={dispatchTouch('left', false)}
            >
              {'<'}
            </button>
            <button
              className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 active:bg-white/30 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-3xl text-white select-none"
              onTouchStart={dispatchTouch('right', true)} onTouchEnd={dispatchTouch('right', false)}
              onMouseDown={dispatchTouch('right', true)} onMouseUp={dispatchTouch('right', false)}
            >
              {'>'}
            </button>
          </div>

          {/* Right Thumb: Pedals & Gears */}
          <div className="flex flex-col gap-2 sm:gap-4 pointer-events-auto justify-end">
            <div className="flex gap-2 sm:gap-4 justify-end">
              <button
                className="w-12 h-12 sm:w-16 sm:h-16 bg-red-600/30 active:bg-red-600/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-red-500/50 flex items-center justify-center font-bold text-xs sm:text-base text-white select-none"
                onTouchStart={dispatchTouch('shiftDown', true)} onTouchEnd={dispatchTouch('shiftDown', false)}
                onMouseDown={dispatchTouch('shiftDown', true)} onMouseUp={dispatchTouch('shiftDown', false)}
              >
                G-
              </button>
              <button
                className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/30 active:bg-green-500/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-green-400/50 flex items-center justify-center font-bold text-xs sm:text-base text-white select-none"
                onTouchStart={dispatchTouch('shiftUp', true)} onTouchEnd={dispatchTouch('shiftUp', false)}
                onMouseDown={dispatchTouch('shiftUp', true)} onMouseUp={dispatchTouch('shiftUp', false)}
              >
                G+
              </button>
              <button
                className="w-12 h-12 sm:w-16 sm:h-16 bg-cyan-500/30 active:bg-cyan-500/60 backdrop-blur-md rounded-full border border-cyan-400/50 flex items-center justify-center font-bold text-xs sm:text-base text-white select-none"
                onTouchStart={dispatchTouch('nitro', true)} onTouchEnd={dispatchTouch('nitro', false)}
                onMouseDown={dispatchTouch('nitro', true)} onMouseUp={dispatchTouch('nitro', false)}
              >
                N2O
              </button>
            </div>

            <div className="flex gap-2 sm:gap-4 justify-end">
              <button
                className="w-16 h-24 sm:w-20 sm:h-32 bg-red-500/20 active:bg-red-500/50 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-red-500/30 flex items-center justify-center font-black tracking-widest text-xs sm:text-base text-white select-none"
                onTouchStart={dispatchTouch('backward', true)} onTouchEnd={dispatchTouch('backward', false)}
                onMouseDown={dispatchTouch('backward', true)} onMouseUp={dispatchTouch('backward', false)}
              >
                BRK
              </button>
              <button
                className="w-20 h-24 sm:w-24 sm:h-32 bg-white/20 active:bg-white/40 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/30 flex items-center justify-center font-black tracking-widest text-xs sm:text-base text-white select-none"
                onTouchStart={dispatchTouch('forward', true)} onTouchEnd={dispatchTouch('forward', false)}
                onMouseDown={dispatchTouch('forward', true)} onMouseUp={dispatchTouch('forward', false)}
              >
                GAS
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};