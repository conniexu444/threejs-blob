import { useRef, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'

const SPHERE_COUNT = 2000
const CONE_HEIGHT = 12
const CONE_RADIUS = 3
const MOUSE_REPEL_RADIUS = 3

export default function Blob() {
  const meshRef = useRef()
  const mouseWorld = useRef(new THREE.Vector3(0, 6, 0))
  const raycaster = useRef(new THREE.Raycaster())
  const mouseNDC = useRef(new THREE.Vector2())
  const planeRef = useRef()
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const { camera, gl } = useThree()

  // Build initial sphere positions arranged in a cone
  const particles = useMemo(() => {
    return Array.from({ length: SPHERE_COUNT }, () => {
      const t = Math.random()
      const angle = Math.random() * Math.PI * 2
      const height = t * CONE_HEIGHT
      const radius = CONE_RADIUS * (1 - t)
      const spread = Math.random() * radius
      const target = new THREE.Vector3(
        Math.cos(angle) * spread,
        height,
        Math.sin(angle) * spread
      )
      return {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          Math.random() * 15,
          (Math.random() - 0.5) * 20
        ),
        velocity: new THREE.Vector3(),
        target: target.clone(),
        original: target.clone(),
      }
    })
  }, [])

  // Track mouse in 3D world space via an invisible plane
  const onMouseMove = useCallback((e) => {
    const rect = gl.domElement.getBoundingClientRect()
    mouseNDC.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseNDC.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    if (planeRef.current) {
      raycaster.current.setFromCamera(mouseNDC.current, camera)
      const hits = raycaster.current.intersectObject(planeRef.current)
      if (hits.length > 0) mouseWorld.current.copy(hits[0].point)
    }
  }, [camera, gl])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    // Slowly orbit the camera
    camera.position.x = Math.cos(t * 0.2) * 15
    camera.position.z = Math.sin(t * 0.2) * 15
    camera.lookAt(0, 6, 0)

    particles.forEach((p, i) => {
      // Gentle organic sway on the target position
      const sway = p.original.clone()
      sway.x += Math.sin(t * 2 + i * 0.01) * 0.3
      sway.z += Math.cos(t * 1.5 + i * 0.015) * 0.2
      sway.y += Math.sin(t * 3 + i * 0.008) * 0.1

      // Spring back toward (swaying) target
      const pull = sway.clone().sub(p.position)
      const dist = pull.length()
      if (dist > 0.1) {
        pull.normalize().multiplyScalar(Math.min(dist * 0.04, 0.2))
        p.velocity.add(pull)
      }

      // Repel from mouse
      const toMouse = p.position.clone().sub(mouseWorld.current)
      const mouseDist = toMouse.length()
      if (mouseDist < MOUSE_REPEL_RADIUS && mouseDist > 0) {
        toMouse.normalize().multiplyScalar(((MOUSE_REPEL_RADIUS - mouseDist) / MOUSE_REPEL_RADIUS) * 0.15)
        p.velocity.add(toMouse)
      }

      p.velocity.multiplyScalar(0.94) // damping
      p.position.add(p.velocity)

      matrix.setPosition(p.position)
      meshRef.current.setMatrixAt(i, matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    gl.domElement.onmousemove = onMouseMove
  })

  return (
    <>
      {/* Invisible plane to catch mouse raycasts */}
      <mesh ref={planeRef} position={[0, 6, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      <instancedMesh ref={meshRef} args={[undefined, undefined, SPHERE_COUNT]}>
        <sphereGeometry args={[0.08, 32, 24]} />
        <meshPhysicalMaterial
          color="#f0f0f0"
          roughness={0.01}
          metalness={0.98}
          reflectivity={0.95}
          envMapIntensity={2}
          clearcoat={1}
          clearcoatRoughness={0}
          transmission={0.05}
          thickness={0.2}
          ior={2.4}
          specularIntensity={1}
          specularColor="#ffffff"
        />
      </instancedMesh>

      <Environment preset="warehouse" />
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, 10, -5]} intensity={0.8} />
    </>
  )
}
