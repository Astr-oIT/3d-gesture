
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
}

export interface ParticleConfig {
  color: string;
  template: TemplateType;
  pointCount: number;
}
