"use client"

import React from "react"

import { useRef, useState, useEffect, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Text, Line } from "@react-three/drei"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw, Camera } from "lucide-react"
import * as THREE from "three"
import type { DroneSequence } from "@/app/page"

// Ensures a point has only finite numbers
const isFinitePoint = (p: readonly [number, number, number]) =>
  Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2])

interface FlightPreviewProps {
  sequences: DroneSequence[]
  activeSequence: string | null
  currentTime: number
}

// Simplified drone model
function DroneModel({
  position,
  color,
  isActive,
}: {
  position: [number, number, number]
  color: string
  isActive: boolean
}) {
  const meshRef = useRef<THREE.Group>(null)
  const propellerRefs = useRef<THREE.Mesh[]>([])
  const ledRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle hover animation
      const hoverOffset = Math.sin(state.clock.elapsedTime * 2) * 0.02
      meshRef.current.position.y = position[1] + hoverOffset

      // Rotate propellers
      propellerRefs.current.forEach((propeller, index) => {
        if (propeller) {
          const speed = isActive ? 0.5 : 0.1
          propeller.rotation.y += speed
        }
      })

      // Pulsing LED effect
      if (ledRef.current) {
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.9
        ledRef.current.scale.setScalar(pulse)
      }
    }
  })

  return (
    <group ref={meshRef} position={position}>
      {/* Main drone body */}
      <mesh>
        <boxGeometry args={[0.8, 0.2, 0.8]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>

      {/* Simple propellers */}
      {[
        [0.5, 0, 0.5],
        [-0.5, 0, 0.5],
        [0.5, 0, -0.5],
        [-0.5, 0, -0.5],
      ].map((pos, index) => (
        <mesh
          key={index}
          ref={(el) => {
            if (el) propellerRefs.current[index] = el
          }}
          position={pos as [number, number, number]}
        >
          <cylinderGeometry args={[0.2, 0.2, 0.02]} />
          <meshStandardMaterial color="#718096" transparent opacity={0.7} />
        </mesh>
      ))}

      {/* LED light */}
      <mesh ref={ledRef} position={[0, -0.15, 0]}>
        <sphereGeometry args={[0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.8 : 0.3} />
      </mesh>

      {/* Simple point light */}
      <pointLight color={color} intensity={isActive ? 1 : 0.3} distance={3} position={[0, -0.15, 0]} />
    </group>
  )
}

// Simplified flight path
function FlightPath({ sequence, isActive }: { sequence: DroneSequence; isActive: boolean }) {
  // Convert to display coordinates
  const rawPts: [number, number, number][] = sequence.points.map((p) => [(p.x - 200) / 20, p.z / 10, (p.y - 150) / 20])

  // Keep only fully-finite points
  const points = rawPts.filter(isFinitePoint)

  // Need at least two valid points for a line
  if (points.length < 2) return null

  return (
    <group>
      {/* Simple flight path line */}
      <Line points={points} color={isActive ? "#3b82f6" : "#9ca3af"} lineWidth={2} />

      {/* Waypoint markers */}
      {points.map((pt, idx) => (
        <group key={idx} position={pt}>
          <mesh>
            <sphereGeometry args={[0.1]} />
            <meshStandardMaterial
              color={sequence.points[idx].color}
              emissive={sequence.points[idx].color}
              emissiveIntensity={0.3}
            />
          </mesh>
          <Text position={[0, 0.3, 0]} fontSize={0.15} color="#374151" anchorX="center" anchorY="middle" billboard>
            {idx + 1}
          </Text>
        </group>
      ))}
    </group>
  )
}

// Light beam path with color gradient using TubeGeometry for thick lines
function LightBeamPath({ sequence }: { sequence: DroneSequence }) {
  const points = useMemo(
    () => sequence.points.map((p) => new THREE.Vector3((p.x - 200) / 20, p.z / 10, (p.y - 150) / 20)),
    [sequence.points]
  )
  const colors = useMemo(
    () => sequence.points.map((p) => new THREE.Color(p.color)),
    [sequence.points]
  )
  
  const tubeGeometry = useMemo(() => {
    if (points.length < 2) return null
    
    const curve = new THREE.CatmullRomCurve3(points)
    const tubeGeometry = new THREE.TubeGeometry(curve, points.length * 4, 0.075, 8, false)
    
    // Apply vertex colors
    const colorArray = new Float32Array(tubeGeometry.attributes.position.count * 3)
    const positions = tubeGeometry.attributes.position.array
    
    for (let i = 0; i < positions.length; i += 3) {
      const t = (i / 3) / (positions.length / 3 - 1)
      const colorIndex = Math.floor(t * (colors.length - 1))
      const color = colors[Math.min(colorIndex, colors.length - 1)]
      
      colorArray[i] = color.r
      colorArray[i + 1] = color.g
      colorArray[i + 2] = color.b
    }
    
    tubeGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))
    return tubeGeometry
  }, [points, colors])
  
  if (points.length < 2 || !tubeGeometry) return null
  
  return (
    <mesh>
      <primitive object={tubeGeometry} />
      <meshBasicMaterial vertexColors transparent opacity={0.8} />
    </mesh>
  )
}

// Normal mode: black lines, red waypoints
function NormalFlightPath({ sequence }: { sequence: DroneSequence }) {
  const points = useMemo(
    () => sequence.points.map((p) => new THREE.Vector3((p.x - 200) / 20, p.z / 10, (p.y - 150) / 20)),
    [sequence.points]
  )
  if (points.length < 2) return null
  return (
    <group>
      {/* Connect waypoints with a black line */}
      <Line points={points} color="#000" lineWidth={4} />
      {points.map((pt, idx) => (
        <mesh key={idx} position={pt}>
          <sphereGeometry args={[0.13]} />
          <meshStandardMaterial color="#ff3333" emissive="#ff3333" emissiveIntensity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// Simple room environment
function SimpleRoom() {
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>

      {/* Simple grid */}
      <gridHelper args={[20, 20, "#e0e0e0", "#f0f0f0"]} position={[0, 0.01, 0]} />

      {/* Back wall */}
      <mesh position={[0, 5, -10]} receiveShadow>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Left wall */}
      <mesh position={[-10, 5, 0]} receiveShadow rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#fafafa" />
      </mesh>

      {/* Right wall */}
      <mesh position={[10, 5, 0]} receiveShadow rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#fafafa" />
      </mesh>
    </group>
  )
}

// Simple lighting setup
function SimpleLighting() {
  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.6} />

      {/* Main directional light */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={30}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {/* Fill light */}
      <directionalLight position={[-5, 8, -5]} intensity={0.4} />
    </>
  )
}

// Camera controller for follow and cinematic modes
function CameraController({ 
  dronePosition, 
  mode, 
  isPlaying 
}: { 
  dronePosition: [number, number, number]
  mode: "orbit" | "follow" | "cinematic"
  isPlaying: boolean
}) {
  useFrame((state) => {
    if (mode === "follow" && isPlaying) {
      // Follow mode: camera follows drone with offset
      const [x, y, z] = dronePosition
      const followOffset = 5
      const heightOffset = 3
      
      // Smooth camera following
      const targetPosition = new THREE.Vector3(
        x - followOffset * Math.cos(state.clock.elapsedTime * 0.1),
        y + heightOffset,
        z - followOffset * Math.sin(state.clock.elapsedTime * 0.1)
      )
      
      state.camera.position.lerp(targetPosition, 0.05)
      state.camera.lookAt(x, y, z)
    } else if (mode === "cinematic") {
      // Cinematic mode: sweeping camera movements
      const time = state.clock.elapsedTime * 0.2
      const radius = 15
      const height = 8 + Math.sin(time * 0.5) * 3
      
      state.camera.position.set(
        Math.cos(time) * radius,
        height,
        Math.sin(time) * radius
      )
      state.camera.lookAt(0, 3, 0)
    }
  })
  
  return null
}

function Scene({
  sequences,
  activeSequence,
  currentTime,
  selectedSequence,
  isPlaying,
  mode = 'normal',
  cameraMode = 'orbit',
}: FlightPreviewProps & {
  selectedSequence: string | null
  isPlaying: boolean
  mode?: 'normal' | 'lightbeam'
  cameraMode?: 'orbit' | 'follow' | 'cinematic'
}) {
  // New: Support for 'all' routes
  const isAllRoutes = selectedSequence === "__all__"

  // Helper to get the current route index and time offset
  const getAllRoutesState = () => {
    if (!isAllRoutes || sequences.length === 0) return { routeIndex: 0, routeTime: 0 }
    let totalDuration = 0
    const durations = sequences.map((seq) => seq.duration)
    const sum = durations.reduce((a, b) => a + b, 0)
    let t = (isPlaying ? currentTime : currentTime) % sum
    for (let i = 0; i < durations.length; i++) {
      if (t < durations[i]) {
        return { routeIndex: i, routeTime: t }
      }
      t -= durations[i]
    }
    return { routeIndex: 0, routeTime: 0 }
  }

  // For single route mode
  const displaySequence = !isAllRoutes
    ? (selectedSequence
        ? sequences.find((seq) => seq.id === selectedSequence)
        : sequences.find((seq) => seq.id === activeSequence))
    : undefined

  // For all routes mode
  const { routeIndex, routeTime } = getAllRoutesState()
  const allRoutesSequence = isAllRoutes && sequences[routeIndex]

  // Simple position calculation
  const getCurrentPosition = (): [number, number, number] => {
    if (!displaySequence || !displaySequence.points.length) return [0, 3, 0]

    const totalDuration = displaySequence.duration
    const progress = (currentTime % totalDuration) / totalDuration
    const totalPoints = displaySequence.points.length

    if (totalPoints === 1) {
      const point = displaySequence.points[0]
      return [(point.x - 200) / 20, point.z / 10 + 2, (point.y - 150) / 20]
    }

    const segmentProgress = progress * (totalPoints - 1)
    const segmentIndex = Math.floor(segmentProgress)
    const localProgress = segmentProgress - segmentIndex

    const currentPoint = displaySequence.points[segmentIndex] || displaySequence.points[0]
    const nextPoint = displaySequence.points[segmentIndex + 1] || displaySequence.points[segmentIndex]

    // Simple interpolation between points
    const x = THREE.MathUtils.lerp((currentPoint.x - 200) / 20, (nextPoint.x - 200) / 20, localProgress)
    const y = THREE.MathUtils.lerp(currentPoint.z / 10 + 2, nextPoint.z / 10 + 2, localProgress)
    const z = THREE.MathUtils.lerp((currentPoint.y - 150) / 20, (nextPoint.y - 150) / 20, localProgress)

    return [x, y, z]
  }

  const getCurrentColor = (): string => {
    if (!displaySequence || !displaySequence.points.length) return "#ff0000"

    const totalDuration = displaySequence.duration
    const progress = (currentTime % totalDuration) / totalDuration
    const pointIndex = Math.floor(progress * displaySequence.points.length)
    const point = displaySequence.points[pointIndex] || displaySequence.points[0]

    return point.color
  }

  const currentPosition = getCurrentPosition()

  return (
    <>
      <SimpleRoom />
      <SimpleLighting />
      
      {/* Camera controller for follow and cinematic modes */}
      <CameraController 
        dronePosition={currentPosition} 
        mode={cameraMode} 
        isPlaying={isPlaying} 
      />

      {/* Flight Path or Light Beam */}
      {displaySequence && (
        mode === 'lightbeam' ? (
          <LightBeamPath sequence={displaySequence} />
        ) : (
          <NormalFlightPath sequence={displaySequence} />
        )
      )}

      {/* Drone */}
      {displaySequence && displaySequence.points.length > 0 && (
        <DroneModel position={currentPosition} color={getCurrentColor()} isActive={isPlaying} />
      )}
    </>
  )
}

export function FlightPreview({ sequences, activeSequence, currentTime }: FlightPreviewProps) {
  const [selectedSequence, setSelectedSequence] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [localTime, setLocalTime] = useState(0)
  const [cameraMode, setCameraMode] = useState<"orbit" | "follow" | "cinematic">("orbit")
  const [mode, setMode] = useState<'lightbeam' | 'normal'>('normal')

  // New: Support for 'all' routes
  const isAllRoutes = selectedSequence === "__all__"

  // Helper to get the current route index and time offset
  const getAllRoutesState = () => {
    if (!isAllRoutes || sequences.length === 0) return { routeIndex: 0, routeTime: 0 }
    let totalDuration = 0
    const durations = sequences.map((seq) => seq.duration)
    const sum = durations.reduce((a, b) => a + b, 0)
    let t = (isPlaying ? localTime : currentTime) % sum
    for (let i = 0; i < durations.length; i++) {
      if (t < durations[i]) {
        return { routeIndex: i, routeTime: t }
      }
      t -= durations[i]
    }
    return { routeIndex: 0, routeTime: 0 }
  }

  // For single route mode
  const displaySequence = !isAllRoutes
    ? (selectedSequence
        ? sequences.find((seq) => seq.id === selectedSequence)
        : sequences.find((seq) => seq.id === activeSequence))
    : undefined

  // For all routes mode
  const { routeIndex, routeTime } = getAllRoutesState()
  const allRoutesSequence = isAllRoutes && sequences[routeIndex]

  // Auto-play simulation
  const effectiveTime = isPlaying ? localTime : currentTime

  // Update local time when playing
  React.useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setLocalTime((prev) => {
        if (isAllRoutes && sequences.length > 0) {
          const sum = sequences.map((seq) => seq.duration).reduce((a, b) => a + b, 0)
          return (prev + 50) % sum
        }
        if (displaySequence) {
          return (prev + 50) % displaySequence.duration
        }
        return prev + 50
      })
    }, 50)

    return () => clearInterval(interval)
  }, [isPlaying, displaySequence, isAllRoutes, sequences])

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      setLocalTime(effectiveTime)
    }
  }

  const handleReset = () => {
    setLocalTime(0)
    setIsPlaying(false)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="route-select" className="text-sm font-medium">
              Display Route:
            </label>
            <Select value={selectedSequence || activeSequence || ""} onValueChange={setSelectedSequence}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a route to preview" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Routes</SelectItem>
                {sequences.map((sequence) => (
                  <SelectItem key={sequence.id} value={sequence.id}>
                    {sequence.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <Button onClick={handlePlayToggle} size="sm" variant={isPlaying ? "default" : "outline"}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button onClick={handleReset} size="sm" variant="outline">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Camera mode selector */}
          <Select value={cameraMode} onValueChange={(value: any) => setCameraMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="orbit">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Orbit
                </div>
              </SelectItem>
              <SelectItem value="follow">Follow</SelectItem>
              <SelectItem value="cinematic">Cinematic</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Mode</label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value as 'lightbeam' | 'normal')}
              className="border rounded px-2 py-1 text-sm"
              title="Switch between Light Beam and Normal modes"
            >
              <option value="normal">Normal</option>
              <option value="lightbeam">Light Beam</option>
            </select>
          </div>
        </div>

        {/* Info for all routes or single route */}
        {isAllRoutes ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{sequences.length} routes</Badge>
            <Badge variant="outline">
              {Math.round(sequences.map((s) => s.duration).reduce((a, b) => a + b, 0) / 1000)}s total
            </Badge>
            <Badge variant={isPlaying ? "default" : "secondary"}>{isPlaying ? "Playing" : "Paused"}</Badge>
          </div>
        ) : displaySequence && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{displaySequence.points.length} waypoints</Badge>
            <Badge variant="outline">{Math.round(displaySequence.duration / 1000)}s duration</Badge>
            <Badge variant={isPlaying ? "default" : "secondary"}>{isPlaying ? "Playing" : "Paused"}</Badge>
          </div>
        )}
      </div>

      {/* 3D Preview */}
      <div className="w-full h-[400px] bg-gray-50 rounded-lg overflow-hidden shadow-lg">
        <Canvas shadows camera={{ position: [12, 8, 12], fov: 60 }}>
          {/* Render all paths if all routes, else just one */}
          {isAllRoutes ? (
            <Scene
              sequences={sequences}
              activeSequence={sequences[routeIndex]?.id}
              currentTime={routeTime}
              selectedSequence={sequences[routeIndex]?.id}
              isPlaying={isPlaying}
              mode={mode}
              cameraMode={cameraMode}
            />
          ) : (
            <Scene
              sequences={sequences}
              activeSequence={activeSequence}
              currentTime={effectiveTime}
              selectedSequence={selectedSequence}
              isPlaying={isPlaying}
              mode={mode}
              cameraMode={cameraMode}
            />
          )}
          <OrbitControls
            enablePan={cameraMode === "orbit"}
            enableZoom={true}
            enableRotate={cameraMode === "orbit"}
            minDistance={3}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2.2}
            autoRotate={cameraMode === "cinematic"}
            autoRotateSpeed={0.5}
            target={[0, 3, 0]}
            enabled={cameraMode === "orbit"}
          />
        </Canvas>
      </div>

      {/* Route Information */}
      {isAllRoutes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              All Routes
              {isPlaying && (
                <Badge variant="default" className="animate-pulse">
                  Live Preview
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Flight simulation for all routes in sequence</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Routes:</span>
                <div className="text-lg font-bold">{sequences.length}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Total Duration:</span>
                <div className="text-lg font-bold">
                  {Math.round(sequences.map((s) => s.duration).reduce((a, b) => a + b, 0) / 1000)}s
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Current Route:</span>
                <div className="text-lg font-bold">{sequences[routeIndex]?.name || "-"}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Waypoints:</span>
                <div className="text-lg font-bold">{sequences[routeIndex]?.points.length || 0}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Progress:</span>
                <div className="text-lg font-bold">
                  {Math.round((routeTime / (sequences[routeIndex]?.duration || 1)) * 100)}%
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Flight Progress</span>
                <span>
                  {Math.round(routeTime / 1000)}s / {Math.round((sequences[routeIndex]?.duration || 0) / 1000)}s
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${((routeTime / (sequences[routeIndex]?.duration || 1)) * 100).toFixed(1)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : displaySequence && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {displaySequence.name}
              {isPlaying && (
                <Badge variant="default" className="animate-pulse">
                  Live Preview
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Flight simulation in simple room environment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Waypoints:</span>
                <div className="text-lg font-bold">{displaySequence.points.length}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Duration:</span>
                <div className="text-lg font-bold">{Math.round(displaySequence.duration / 1000)}s</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Max Altitude:</span>
                <div className="text-lg font-bold">
                  {displaySequence.points.length > 0
                    ? Math.max(...displaySequence.points.map((p) => p.z)).toFixed(1)
                    : 0}
                  m
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Colors:</span>
                <div className="text-lg font-bold">{new Set(displaySequence.points.map((p) => p.color)).size}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Progress:</span>
                <div className="text-lg font-bold">{Math.round((effectiveTime / displaySequence.duration) * 100)}%</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Flight Progress</span>
                <span>
                  {Math.round(effectiveTime / 1000)}s / {Math.round(displaySequence.duration / 1000)}s
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${(effectiveTime / displaySequence.duration) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
