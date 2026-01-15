
import * as THREE from 'three';

export const PARTICLE_COUNT = 5000;

export const generatePositions = (template: string, count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0;
    const t = (i / count) * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * 2 * Math.PI;

    switch (template) {
      case 'HEART':
        const ht = (i / count) * Math.PI * 2;
        x = 16 * Math.pow(Math.sin(ht), 3);
        y = 13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht);
        z = (Math.random() - 0.5) * 4;
        break;
        
      case 'FLOWER':
        const petals = 6;
        const r = 15 * Math.sin(petals * t);
        x = r * Math.cos(t);
        y = r * Math.sin(t);
        z = (Math.random() - 0.5) * 5;
        break;

      case 'SATURN':
        if (i < count * 0.4) {
          // Planet
          const radius = 8;
          x = radius * Math.sin(phi) * Math.cos(theta);
          y = radius * Math.sin(phi) * Math.sin(theta);
          z = radius * Math.cos(phi);
        } else {
          // Ring
          const ringInner = 12;
          const ringOuter = 18;
          const ringRadius = ringInner + (ringOuter - ringInner) * Math.random();
          const ringTheta = Math.random() * Math.PI * 2;
          x = ringRadius * Math.cos(ringTheta);
          y = ringRadius * Math.sin(ringTheta) * 0.2; // tilted
          z = ringRadius * Math.sin(ringTheta);
        }
        break;

      case 'BUDDHA':
        // Simplified meditative silhouette (Triangular base + Spherical head)
        if (i < count * 0.7) {
          // Body/Pyramid base
          const h = Math.random();
          const w = (1 - h) * 15;
          const angle = Math.random() * Math.PI * 2;
          x = Math.cos(angle) * w;
          z = Math.sin(angle) * w;
          y = h * 12 - 5;
        } else {
          // Head
          const headRadius = 3;
          x = headRadius * Math.sin(phi) * Math.cos(theta);
          y = headRadius * Math.sin(phi) * Math.sin(theta) + 10;
          z = headRadius * Math.cos(phi);
        }
        break;

      case 'FIREWORKS':
        const radius = 20 * Math.random();
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.sin(phi) * Math.sin(theta);
        z = radius * Math.cos(phi);
        break;

      default:
        x = (Math.random() - 0.5) * 40;
        y = (Math.random() - 0.5) * 40;
        z = (Math.random() - 0.5) * 40;
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
};
