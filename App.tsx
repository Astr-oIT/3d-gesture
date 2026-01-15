
import React, { useState, useEffect, useRef } from 'react';
import Scene from './components/Scene';
import { TemplateType, GestureState } from './types';
import { GestureAnalyzer } from './services/gemini';

const App: React.FC = () => {
  const [template, setTemplate] = useState<TemplateType>(TemplateType.SATURN);
  const [color, setColor] = useState('#00eaff');
  const [gesture, setGesture] = useState<GestureState>({ tension: 0, expansion: 0, active: false });
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const analyzerRef = useRef<GestureAnalyzer | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        
        const analyzer = new GestureAnalyzer((update) => {
          setGesture(update);
        });
        analyzer.start(videoRef.current);
        analyzerRef.current = analyzer;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Please allow camera access to use gesture control.");
    }
  };

  const templates = [
    { id: TemplateType.HEART, icon: 'fa-heart', label: 'Heart' },
    { id: TemplateType.FLOWER, icon: 'fa-leaf', label: 'Flower' },
    { id: TemplateType.SATURN, icon: 'fa-ring', label: 'Saturn' },
    { id: TemplateType.BUDDHA, icon: 'fa-om', label: 'Buddha' },
    { id: TemplateType.FIREWORKS, icon: 'fa-firework', label: 'Sparkler' }
  ];

  const colors = [
    { value: '#00eaff', label: 'Cyan' },
    { value: '#ff007b', label: 'Pink' },
    { value: '#b600ff', label: 'Purple' },
    { value: '#00ff40', label: 'Green' },
    { value: '#ffae00', label: 'Gold' },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white font-sans selection:bg-cyan-500">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene template={template} color={color} gesture={gesture} />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 pointer-events-none">
        
        {/* Top Section: Header & Stats */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
              AETHER PARTICLES
            </h1>
            <p className="text-xs uppercase tracking-widest text-white/50">Gemini Gesture Interface v1.0</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {!cameraActive ? (
              <button 
                onClick={startCamera}
                className="px-4 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-cyan-400 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-camera"></i> ENABLE GESTURES
              </button>
            ) : (
              <div className="flex flex-col items-end">
                <div className="w-32 h-24 rounded-lg border border-white/20 overflow-hidden bg-black shadow-2xl relative">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-60" />
                  <div className="absolute bottom-1 right-1 text-[8px] bg-red-500 px-1 rounded">LIVE AI</div>
                </div>
                <div className="mt-2 text-right">
                  <div className="text-[10px] text-white/40 uppercase">Tension</div>
                  <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${gesture.tension * 100}%` }} />
                  </div>
                  <div className="text-[10px] text-white/40 uppercase mt-1">Expansion</div>
                  <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${gesture.expansion * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Hint */}
        <div className="flex-1 flex items-center justify-center">
          {!gesture.active && cameraActive && (
            <div className="text-white/20 text-center animate-pulse">
              <i className="fas fa-hand-paper text-4xl mb-4 block"></i>
              <p className="text-xs uppercase tracking-[0.2em]">Show your hand to the camera</p>
            </div>
          )}
        </div>

        {/* Bottom Section: Controls */}
        <div className="flex flex-col md:flex-row gap-6 items-end justify-between pointer-events-auto">
          
          {/* Shape Templates */}
          <div className="flex gap-2 bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all ${
                  template === t.id ? 'bg-white text-black scale-110' : 'hover:bg-white/10 text-white/60'
                }`}
                title={t.label}
              >
                <i className={`fas ${t.icon} text-lg`}></i>
              </button>
            ))}
          </div>

          {/* Color Palette */}
          <div className="flex gap-3 bg-black/40 backdrop-blur-xl p-3 rounded-full border border-white/10">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  color === c.value ? 'border-white scale-125' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
            <div className="w-px h-8 bg-white/10 mx-1" />
            <input 
              type="color" 
              value={color} 
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-none"
            />
          </div>

        </div>
      </div>

      {/* Decorative Glitch Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
};

export default App;
