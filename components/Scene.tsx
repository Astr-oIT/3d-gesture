
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { TemplateType, GestureState } from '../types';
import { generatePositions, PARTICLE_COUNT } from '../constants';

interface ParticleSystemProps {
  template: TemplateType;
  color: string;
  gesture: GestureState;
}

const Particles: React.FC<ParticleSystemProps> = ({ template, color, gesture }) => {
  const pointsRef = useRef<THREE.Points>(null!);
  
  // Create original positions for interpolation
  const targetPositions = useMemo(() => generatePositions(template, PARTICLE_COUNT), [template]);
  
  useFrame((state, delta) => {
    if (!pointsRef.current || !pointsRef.current.geometry) return;
    
    const attr = pointsRef.current.geometry.attributes.position;
    if (!attr) return;
    
    const positions = attr.array as Float32Array;
    
    // Dynamic scaling based on expansion and tension
    const baseScale = 1 + (gesture.expansion * 1.5);
    const pulseSpeed = 2 + (gesture.tension * 4);
    const pulseFactor = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * (0.05 + gesture.tension * 0.15);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      // Target coordinate with scaling applied
      const tx = targetPositions[i3] * baseScale * pulseFactor;
      const ty = targetPositions[i3 + 1] * baseScale * pulseFactor;
      const tz = targetPositions[i3 + 2] * baseScale * pulseFactor;

      // Interpolate towards target positions
      positions[i3] += (tx - positions[i3]) * 0.15;
      positions[i3 + 1] += (ty - positions[i3 + 1]) * 0.15;
      positions[i3 + 2] += (tz - positions[i3 + 2]) * 0.15;
      
      // Add some noise based on tension
      if (gesture.tension > 0.1) {
        const noise = gesture.tension * 0.3;
        positions[i3] += (Math.random() - 0.5) * noise;
        positions[i3+1] += (Math.random() - 0.5) * noise;
        positions[i3+2] += (Math.random() - 0.5) * noise;
      }
    }
    
    attr.needsUpdate = true;
    pointsRef.current.rotation.y += delta * (0.1 + gesture.tension * 0.5);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={targetPositions.slice()}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

const Scene: React.FC<ParticleSystemProps> = (props) => {
  return (
    <div className="w-full h-full bg-black">
      <Canvas 
        camera={{ position: [0, 0, 40], fov: 60 }} 
        gl={{ 
          antialias: false,
          powerPreference: 'high-performance'
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000');
        }}
      >
        <color attach="background" args={['#000000']} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        <Particles {...props} />
        
        <OrbitControls enablePan={false} enableZoom={true} />
        
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Scene;
