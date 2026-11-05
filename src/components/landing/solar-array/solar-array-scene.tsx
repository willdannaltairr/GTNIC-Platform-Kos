import type { FC, ReactNode, RefObject } from 'react'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { nearestView, type SolarView } from '@/components/landing/solar-array/orbit'

export interface OrbitState {
  yaw: number
  pitch: number
  intro: number
  lastInteraction: number
  dragging: boolean
  reduced: boolean
}

interface SceneProps {
  orbit: RefObject<OrbitState>
  active: boolean
  onViewChange: (view: SolarView) => void
  onReady: () => void
  fallback: ReactNode
}

const TARGET_Y = 0.9
const RADIUS = 11
const IDLE_DELAY = 4000

// Keeps the camera on a sphere around the array, and lets it drift slowly once the
// visitor stops interacting so the scene never looks like a frozen screenshot.
const CameraRig: FC<{ orbit: RefObject<OrbitState>; onViewChange: (view: SolarView) => void }> = ({
  orbit,
  onViewChange,
}) => {
  const { camera } = useThree()
  const reported = useRef<SolarView | null>(null)

  useFrame(() => {
    const state = orbit.current
    if (!state) return

    if (!state.dragging && !state.reduced && performance.now() - state.lastInteraction > IDLE_DELAY) {
      state.yaw += 0.0012
    }

    const radius = RADIUS * (0.88 + 0.12 * state.intro)

    camera.position.set(
      radius * Math.cos(state.pitch) * Math.sin(state.yaw),
      TARGET_Y + radius * Math.sin(state.pitch),
      radius * Math.cos(state.pitch) * Math.cos(state.yaw),
    )

    camera.lookAt(0, TARGET_Y, 0)

    const view = nearestView(state.yaw, state.pitch)

    if (view !== reported.current) {
      reported.current = view
      onViewChange(view)
    }
  })

  return null
}

// A soft studio backdrop: bright above, green-black below, so the panels read
// against a gradient instead of a flat colour.
const StudioEnvironment: FC = () => {
  const texture = useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, size)
      gradient.addColorStop(0, '#eef4ec')
      gradient.addColorStop(0.55, '#c9d6c4')
      gradient.addColorStop(1, '#0e1a12')
      context.fillStyle = gradient
      context.fillRect(0, 0, size, size)
    }

    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace

    return map
  }, [])

  return <primitive object={texture} attach="background" />
}

interface PanelProps {
  position: [number, number, number]
  rotation?: [number, number, number]
}

// One photovoltaic table: a dark glass face over a light metal frame.
const Panel: FC<PanelProps> = ({ position, rotation = [0, 0, 0] }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow position={[0, 0.98, 0]}>
        <boxGeometry args={[1.9, 0.06, 1.1]} />
        <meshStandardMaterial color="#101c2c" metalness={0.35} roughness={0.28} />
      </mesh>

      <mesh castShadow position={[0, 0.86, 0]}>
        <boxGeometry args={[2, 0.1, 1.2]} />
        <meshStandardMaterial color="#93a29a" metalness={0.55} roughness={0.45} />
      </mesh>

      <mesh castShadow position={[-0.82, 0.45, 0.4]}>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#7d8b83" metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh castShadow position={[0.82, 0.45, 0.4]}>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#7d8b83" metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[2.2, 0.16, 1.3]} />
        <meshStandardMaterial color="#b9c2b6" roughness={0.85} />
      </mesh>
    </group>
  )
}

// Six tables in one string, facing the midday sun.
const SolarArrayModel: FC = () => {
  const rows = [-2.7, 2.7]

  return (
    <group>
      {rows.map((z) =>
        [-2.6, 0, 2.6].map((x) => <Panel key={`${x}-${z}`} position={[x, 0, z]} rotation={[-0.42, 0, 0]} />),
      )}

      <mesh castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[0.16, 1.8, 0.16]} />
        <meshStandardMaterial color="#7d8b83" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

const SolarArrayScene: FC<SceneProps> = ({ orbit, active, onViewChange, onReady, fallback }): ReactNode => {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      resize={{ offsetSize: true, scroll: false }}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 30, near: 0.1, far: 100, position: [4.4, 3.2, 7.6] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      fallback={fallback}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.05
        onReady()
      }}
    >
      <StudioEnvironment />

      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#ffffff', '#dfe7da', 0.55]} />

      <directionalLight
        castShadow
        position={[4, 9, 6]}
        intensity={2.4}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={5}
      >
        <orthographicCamera attach="shadow-camera" args={[-5, 5, 5, -5, 0.5, 30]} />
      </directionalLight>

      <SolarArrayModel />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.16} />
      </mesh>

      <CameraRig orbit={orbit} onViewChange={onViewChange} />
    </Canvas>
  )
}

export default SolarArrayScene
