
export enum TemplateType {
  HEART = 'HEART',
  FLOWER = 'FLOWER',
  SATURN = 'SATURN',
  BUDDHA = 'BUDDHA',
  FIREWORKS = 'FIREWORKS'
}

export interface GestureState {
  tension: number; // 0 to 1
  expansion: number; // 0 to 1
  active: boolean;
  modelReady: boolean;
  handPosition: { x: number; y: number; z: number }; // Normalized hand center position
  gestureType: 'none' | 'fist' | 'ok' | 'open' | 'peace' | 'point'; // Specific gesture detected
}

export interface ParticleConfig {
  color: string;
  template: TemplateType;
  pointCount: number;
}
