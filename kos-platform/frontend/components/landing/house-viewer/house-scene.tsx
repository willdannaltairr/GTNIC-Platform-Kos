'use client'

import type { FC, ReactNode, RefObject } from 'react'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { nearestView, type HouseView, type OrbitState } from '@/components/landing/house-viewer/orbit'

interface SceneProps {
  orbit: RefObject<OrbitState>
  active: boolean
  onViewChange: (view: HouseView) => void
  onReady: () => void
  fallback: ReactNode
}

/** Dimensi bangunan dalam satuan scene (meter, kira-kira). */
const HOUSE = {
  length: 6.2,
  depth: 4.6,
  wall: 2.5,
  rise: 1.35,
  overhang: 0.42,
}

const HALF_DEPTH = HOUSE.depth / 2 + HOUSE.overhang
const HALF_LENGTH = HOUSE.length / 2 + HOUSE.overhang

// Kemiringan atap: turun dari bubungan (z = 0) ke tepi (z = HALF_DEPTH).
const SLOPE = Math.atan(HOUSE.rise / HALF_DEPTH)
const SLOPE_NORMAL = new THREE.Vector3(0, Math.cos(SLOPE), Math.sin(SLOPE))

const TARGET_Y = 1.55
const RADIUS = 12.6
const IDLE_DELAY = 4000

// Kamera berputar pada bola di sekitar rumah, lalu melayang pelan setelah
// pengunjung berhenti menyentuhnya, sehingga scene tidak tampak seperti gambar mati.
const CameraRig: FC<{ orbit: RefObject<OrbitState>; onViewChange: (view: HouseView) => void }> = ({
  orbit,
  onViewChange,
}) => {
  const { camera } = useThree()
  const reported = useRef<HouseView | null>(null)

  useFrame(() => {
    const state = orbit.current
    if (!state) return

    if (!state.dragging && !state.reduced && performance.now() - state.lastInteraction > IDLE_DELAY) {
      state.yaw += 0.0012
    }

    const radius = RADIUS * (0.9 + 0.1 * state.intro)

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

// Langit pagi: terang di atas, hijau pucat di kaki langit. Rumah putih perlu
// latar yang sedikit lebih gelap di bawah agar dindingnya tidak menyatu dengan
// latar.
const StudioEnvironment: FC = () => {
  const texture = useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, size)
      gradient.addColorStop(0, '#f7f4ea')
      gradient.addColorStop(0.62, '#dfe4d8')
      gradient.addColorStop(1, '#7d8a76')
      context.fillStyle = gradient
      context.fillRect(0, 0, size, size)
    }

    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace

    return map
  }, [])

  return <primitive object={texture} attach="background" />
}

interface WindowProps {
  position: [number, number, number]
  size: [number, number]
  rotation?: [number, number, number]
}

// Satu jendela: kusen gelap sedikit lebih besar, kaca di depannya.
const Window: FC<WindowProps> = ({ position, size, rotation = [0, 0, 0] }) => {
  const [w, h] = size

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.06]} />
        <meshStandardMaterial color="#1d252c" roughness={0.55} metalness={0.25} />
      </mesh>

      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[w, h, 0.05]} />
        <meshStandardMaterial color="#31434f" roughness={0.18} metalness={0.6} />
      </mesh>
    </group>
  )
}

// Rumah kotak dengan atap pelana. Badan dan atap dipisah agar atap bisa
// menjorok melewati dinding, seperti kanopi pada foto hero.
const HouseModel: FC = (): ReactNode => {
  const roofGeometry = useMemo(() => {
    // Profil atap dibentuk di bidang XY lalu di-extrude; sumbu extrude (Z)
    // diputar ke sumbu X supaya bubungan memanjang sepanjang bangunan.
    const shape = new THREE.Shape()
    shape.moveTo(-HALF_DEPTH, 0)
    shape.lineTo(HALF_DEPTH, 0)
    shape.lineTo(0, HOUSE.rise)
    shape.closePath()

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: HALF_LENGTH * 2,
      bevelEnabled: false,
    })

    geometry.translate(0, 0, -HALF_LENGTH)

    return geometry
  }, [])

  const panels = useMemo(() => {
    const rows = [-1.95, 0, 1.95]
    const slopeLength = Math.hypot(HALF_DEPTH, HOUSE.rise)

    return [1, -1].flatMap((side) =>
      rows.map((x) => {
        const t = 0.5
        const z = side * HALF_DEPTH * t
        const y = HOUSE.rise * (1 - t)

        return {
          key: `${side}-${x}`,
          position: [
            x,
            HOUSE.wall + y + SLOPE_NORMAL.y * 0.07,
            z + side * SLOPE_NORMAL.z * 0.07,
          ] as [number, number, number],
          rotation: [side * SLOPE, 0, 0] as [number, number, number],
          depth: slopeLength * 0.52,
        }
      }),
    )
  }, [])

  return (
    <group>
      {/* Alas bangunan dan tanah di sekelilingnya. */}
      <mesh receiveShadow position={[0, 0.09, 0]}>
        <boxGeometry args={[HOUSE.length + 0.4, 0.18, HOUSE.depth + 0.4]} />
        <meshStandardMaterial color="#cdc8ba" roughness={0.9} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, HOUSE.wall / 2, 0]}>
        <boxGeometry args={[HOUSE.length, HOUSE.wall, HOUSE.depth]} />
        <meshStandardMaterial color="#f1f1e9" roughness={0.86} />
      </mesh>

      {/* Atap pelana: prisma segitiga yang menutupi seluruh badan rumah. */}
      <mesh
        castShadow
        receiveShadow
        geometry={roofGeometry}
        rotation={[0, Math.PI / 2, 0]}
        position={[0, HOUSE.wall, 0]}
      >
        <meshStandardMaterial color="#2c343b" roughness={0.42} metalness={0.35} />
      </mesh>

      {/* Panel surya di kedua sisi atap. */}
      {panels.map((panel) => (
        <mesh key={panel.key} castShadow position={panel.position} rotation={panel.rotation}>
          <boxGeometry args={[1.72, 0.06, panel.depth]} />
          <meshStandardMaterial color="#101c2c" metalness={0.4} roughness={0.26} />
        </mesh>
      ))}

      {/* Fasad depan: tiga jendela kamar dan pintu kayu. */}
      <Window position={[-2, 1.35, HOUSE.depth / 2 + 0.04]} size={[1.15, 1.35]} />
      <Window position={[-0.55, 1.35, HOUSE.depth / 2 + 0.04]} size={[0.95, 1.35]} />
      <Window position={[2.3, 1.35, HOUSE.depth / 2 + 0.04]} size={[0.85, 1.2]} />

      <group position={[1.15, 0, HOUSE.depth / 2 + 0.06]}>
        <mesh castShadow position={[0, 1.12, 0]}>
          <boxGeometry args={[1.08, 2.06, 0.08]} />
          <meshStandardMaterial color="#b0824f" roughness={0.72} />
        </mesh>

        <mesh position={[0.36, 1.06, 0.06]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial color="#e6d3ab" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Jendela samping, sejajar dengan fasad. */}
      <Window
        position={[HOUSE.length / 2 + 0.04, 1.4, 0.9]}
        size={[0.9, 1.3]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <Window
        position={[-HOUSE.length / 2 - 0.04, 1.4, -0.6]}
        size={[0.9, 1.3]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* Tanaman rendah di depan teras — pengisi ruang agar bangunan tidak
          tampak melayang di bidang kosong. */}
      {[
        [-2.7, 0.28, 2.75],
        [-1.85, 0.22, 2.95],
        [2.75, 0.26, 2.7],
        [3.2, 0.2, 2.4],
      ].map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} castShadow position={[x, y, z]}>
          <icosahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial color="#5f7d52" roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}

const HouseScene: FC<SceneProps> = ({ orbit, active, onViewChange, onReady, fallback }): ReactNode => {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      resize={{ offsetSize: true, scroll: false }}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 30, near: 0.1, far: 100, position: [5.2, 4, 10.4] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      fallback={fallback}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.06
        onReady()
      }}
    >
      <StudioEnvironment />

      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffffff', '#dfe7da', 0.6]} />

      <directionalLight
        castShadow
        position={[5, 9.5, 6.5]}
        intensity={2.3}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={5}
      >
        <orthographicCamera attach="shadow-camera" args={[-7, 7, 7, -7, 0.5, 32]} />
      </directionalLight>

      <HouseModel />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.16} />
      </mesh>

      <CameraRig orbit={orbit} onViewChange={onViewChange} />
    </Canvas>
  )
}

export default HouseScene
