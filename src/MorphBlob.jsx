import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'

export default function MorphBlob() {
  const meshRef = useRef()
  const noise3D = useMemo(() => createNoise3D(), [])
  const originalPositions = useRef(null)

  const mouseNDC = useRef(new THREE.Vector2(0, 0))
  const smoothMouseDir = useRef(new THREE.Vector3(0, 0, 1))
  const mouseStrength = useRef(0)

  // Drag rotation state
  const isDragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  // Inertia stored as an axis-angle quaternion delta
  const rotVelocity = useRef(new THREE.Quaternion())

  const { gl, camera } = useThree()

  useMemo(() => {
    const el = gl.domElement

    const onMouseMove = (e) => {
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      if (isDragging.current) {
        const dx = e.clientX - lastPointer.current.x
        const dy = e.clientY - lastPointer.current.y
        lastPointer.current = { x: e.clientX, y: e.clientY }

        if (dx !== 0 || dy !== 0) {
          // Axis perpendicular to drag direction, in world space
          // drag right → rotate around world Y; drag up → rotate around world X
          const axis = new THREE.Vector3(-dy, dx, 0).normalize()
          const angle = Math.sqrt(dx * dx + dy * dy) * 0.004
          const q = new THREE.Quaternion().setFromAxisAngle(axis, angle)
          rotVelocity.current.copy(q)
        }
      } else {
        mouseNDC.current.set(x, y)
      }
    }

    const onMouseDown = (e) => {
      isDragging.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
      rotVelocity.current.identity()
      el.style.cursor = 'grabbing'
    }

    const onMouseUp = () => {
      isDragging.current = false
      el.style.cursor = 'grab'
    }

    el.style.cursor = 'grab'
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mouseup', onMouseUp) // catch releases outside canvas

    return () => {
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [gl])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const mesh = meshRef.current
    const geo = mesh.geometry
    const pos = geo.attributes.position
    const t = clock.getElapsedTime()

    if (!originalPositions.current) {
      originalPositions.current = new Float32Array(pos.array)
    }

    // Apply quaternion rotation — no gimbal lock, spins like a real ball
    mesh.quaternion.premultiply(rotVelocity.current)

    // Decay toward identity quaternion (friction)
    rotVelocity.current.slerp(new THREE.Quaternion(), 0.08)

    // Mouse hover effect only when not dragging
    if (!isDragging.current) {
      const ray = new THREE.Vector3(mouseNDC.current.x, mouseNDC.current.y, 0.5)
        .unproject(camera)
        .sub(camera.position)
        .normalize()
      smoothMouseDir.current.lerp(ray, 0.06).normalize()
      const dist = mouseNDC.current.length()
      mouseStrength.current += (Math.min(dist * 1.4, 1.0) - mouseStrength.current) * 0.05
    } else {
      // Fade out hover effect while dragging
      mouseStrength.current *= 0.9
    }

    const orig = originalPositions.current
    const md = smoothMouseDir.current

    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3
      const ox = orig[ix], oy = orig[ix + 1], oz = orig[ix + 2]

      const len = Math.sqrt(ox * ox + oy * oy + oz * oz)
      const nx = ox / len, ny = oy / len, nz = oz / len

      // Low-frequency noise only = big smooth lumps, no wrinkles
      const speed = 0.15
      const n1 = noise3D(nx * 0.8 + t * speed, ny * 0.8, nz * 0.8) * 0.18

      const dot = nx * md.x + ny * md.y + nz * md.z
      const bulge = Math.max(0, dot) ** 3 * mouseStrength.current * 0.3

      const displacement = 1.0 + n1 + bulge
      pos.setXYZ(i, nx * len * displacement, ny * len * displacement, nz * len * displacement)
    }

    pos.needsUpdate = true
    geo.computeVertexNormals()
  })

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 128, 128]} />
        <meshPhysicalMaterial
          color="#d0d0d0"
          roughness={0.05}
          metalness={1.0}
          reflectivity={1.0}
          envMapIntensity={3}
          clearcoat={1}
          clearcoatRoughness={0}
          specularIntensity={1}
          specularColor="#ffffff"
        />
      </mesh>

      <Environment preset="sunset" />
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} />
      <directionalLight position={[-5, -3, -5]} intensity={0.5} color="#aaccff" />
    </>
  )
}
