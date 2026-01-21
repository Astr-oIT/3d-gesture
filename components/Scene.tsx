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
  const fireworksTimeRef = useRef<number>(0);
  
  // Circle shape generator
  const circlePositions = useMemo(() => {
    const circle = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const radius = 8;
      circle[i3] = Math.cos(angle) * radius;
      circle[i3 + 1] = Math.sin(angle) * radius;
      circle[i3 + 2] = Math.sin(angle * 3) * 2; // 3D spiral effect
    }
    return circle;
  }, []);
  
  // Create shape positions and scattered positions
  const shapePositions = useMemo(() => generatePositions(template, PARTICLE_COUNT), [template]);
  const scatteredPositions = useMemo(() => {
    // Generate random scattered positions in a large sphere
    const scattered = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Random position in sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 20 + Math.random() * 30; // Spread from 20 to 50 units
      
      scattered[i3] = radius * Math.sin(phi) * Math.cos(theta);
      scattered[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      scattered[i3 + 2] = radius * Math.cos(phi);
    }
    return scattered;
  }, []);
  
  useFrame((state, delta) => {
    if (!pointsRef.current || !pointsRef.current.geometry) return;
    
    const attr = pointsRef.current.geometry.attributes.position;
    if (!attr) return;
    
    const positions = attr.array as Float32Array;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      let tx, ty, tz;
      
      if (gesture.active) {
        // Hand detected: form shape based on gesture type
        
        if (gesture.gestureType === 'fist') {
          // FIST = Circle shape
          const zoomScale = 0.5 + (gesture.tension * 2);
          tx = circlePositions[i3] * zoomScale;
          ty = circlePositions[i3 + 1] * zoomScale;
          tz = circlePositions[i3 + 2] * zoomScale;
        } else if (gesture.gestureType === 'ok') {
          // OK SIGN = Fireworks explosion effect
          fireworksTimeRef.current += delta;
          const explosionRadius = 5 + Math.sin(fireworksTimeRef.current * 3) * 3;
          const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
          const heightVariation = Math.sin(i * 0.5 + fireworksTimeRef.current * 2) * 5;
          
          tx = Math.cos(angle) * explosionRadius;
          ty = Math.sin(angle) * explosionRadius + heightVariation;
          tz = Math.sin(angle * 2) * explosionRadius;
        } else {
          // Other gestures: use template shape with zoom
          const zoomScale = 0.15 + (gesture.expansion * 9.85);
          tx = shapePositions[i3] * zoomScale;
          ty = shapePositions[i3 + 1] * zoomScale;
          tz = shapePositions[i3 + 2] * zoomScale;
        }
        
        // Add hand position offset (scaled for 3D space)
        tx += gesture.handPosition.x * 15;
        ty += gesture.handPosition.y * 15;
        tz += gesture.handPosition.z * 5;
      } else {
        // No hand: scatter particles
        tx = scatteredPositions[i3];
        ty = scatteredPositions[i3 + 1];
        tz = scatteredPositions[i3 + 2];
      }

      // Smooth interpolation - fast when forming, slow when scattering
      const lerpSpeed = gesture.active ? 0.12 : 0.03;
      positions[i3] += (tx - positions[i3]) * lerpSpeed;
      positions[i3 + 1] += (ty - positions[i3 + 1]) * lerpSpeed;
      positions[i3 + 2] += (tz - positions[i3 + 2]) * lerpSpeed;
    }
    
    attr.needsUpdate = true;
    
    // Rotate only when making a strong fist (high tension, low expansion)
    if (gesture.active && gesture.tension > 0.6 && gesture.expansion < 0.4) {
      pointsRef.current.rotation.y += delta * (0.8 + gesture.tension * 1.5);
    } else {
      // Reset rotation slowly when not rotating
      pointsRef.current.rotation.y *= 0.95;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={scatteredPositions.slice()}
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
