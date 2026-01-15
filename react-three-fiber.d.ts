import { Object3DNode } from '@react-three/fiber'
import * as THREE from 'three'

declare module '@react-three/fiber' {
  interface ThreeElements {
    points: Object3DNode<THREE.Points, typeof THREE.Points>
    bufferGeometry: Object3DNode<THREE.BufferGeometry, typeof THREE.BufferGeometry>
    bufferAttribute: Object3DNode<THREE.BufferAttribute, typeof THREE.BufferAttribute>
    pointsMaterial: Object3DNode<THREE.PointsMaterial, typeof THREE.PointsMaterial>
    ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>
    pointLight: Object3DNode<THREE.PointLight, typeof THREE.PointLight>
  }
}
