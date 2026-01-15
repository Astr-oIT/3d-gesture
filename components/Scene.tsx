/// <reference path="../react-three-fiber.d.ts" />

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
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
    
    // Super dramatic zoom: Open hand = MASSIVE zoom, Closed hand = tiny
    // Range: 0.15x (very small) to 10.0x (super zoom)
    const zoomScale = gesture.active ? (0.15 + (gesture.expansion * 9.85)) : 1.0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      // Apply only zoom scale, no pulse or other effects
      const tx = targetPositions[i3] * zoomScale;
      const ty = targetPositions[i3 + 1] * zoomScale;
      const tz = targetPositions[i3 + 2] * zoomScale;

      // Smooth interpolation - very slow when returning to rest
      const lerpSpeed = gesture.active ? 0.08 : 0.02;
      positions[i3] += (tx - positions[i3]) * lerpSpeed;
      positions[i3 + 1] += (ty - positions[i3 + 1]) * lerpSpeed;
      positions[i3 + 2] += (tz - positions[i3 + 2]) * lerpSpeed;
    }
    
    attr.needsUpdate = true;
    
    // Rotate only when making a strong fist (high tension, low expansion)
    if (gesture.active && gesture.tension > 0.6 && gesture.expansion < 0.4) {
      pointsRef.current.rotation.y += delta * (0.8 + gesture.tension * 1.5);
    }
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
      </Canvas>
    </div>
  );
};

export default Scene;
