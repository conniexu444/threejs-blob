import { Canvas } from '@react-three/fiber'
import Blob from './Blob'
import MorphBlob from './MorphBlob'

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex' }}>
      {/* Particle blob (code.storage style) */}
      <div style={{ flex: 1, position: 'relative' }}>
        <label style={labelStyle}>particle blob</label>
        <Canvas camera={{ position: [0, 5, 15], fov: 75 }} gl={{ antialias: true, alpha: true }}>
          <Blob />
        </Canvas>
      </div>

      <div style={{ width: 1, background: '#222' }} />

      {/* Morph blob (noise-displaced sphere) */}
      <div style={{ flex: 1, position: 'relative' }}>
        <label style={labelStyle}>morph blob</label>
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }} gl={{ antialias: true, alpha: true }}>
          <MorphBlob />
        </Canvas>
      </div>
    </div>
  )
}

const labelStyle = {
  position: 'absolute',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  color: '#555',
  fontSize: 11,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  fontFamily: 'monospace',
  zIndex: 10,
  pointerEvents: 'none',
}
