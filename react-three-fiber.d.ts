import '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any
      bufferGeometry: any
      bufferAttribute: any
      pointsMaterial: any
      ambientLight: any
      pointLight: any
      color: any
    }
  }
}
