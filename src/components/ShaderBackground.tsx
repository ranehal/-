import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform float uMode;
  varying vec2 vUv;

  vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    for (float i = 0.0; i < 3.0; i++) {
        uv = fract(uv * (1.5 + uMode * 0.05)) - 0.5;
        float d = length(uv) * exp(-length(uv0));
        vec3 col = palette(length(uv0) + i * 0.4 + uTime * 0.4 + uMode * 0.1, 
            vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.263, 0.416, 0.557));
        d = sin(d * 8.0 + uTime + uMode * 0.5) / 8.0;
        d = abs(d);
        d = pow(0.01 / d, 1.2);
        finalColor += col * d;
    }

    gl_FragColor = vec4(finalColor * 0.25, 1.0);
  }
`

function ShaderPlane({ mode }: { mode: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  
  const uniforms = useRef({
    uTime: { value: 0 },
    uMode: { value: mode }
  })

  useFrame((state, delta) => {
    uniforms.current.uTime.value = state.clock.getElapsedTime()
    // Lerp mode for smooth transitions
    uniforms.current.uMode.value = THREE.MathUtils.lerp(uniforms.current.uMode.value, mode, delta * 3)
  })

  return (
    <mesh ref={meshRef} scale={[100, 100, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms.current}
        transparent
      />
    </mesh>
  )
}

export function ShaderBackground({ mode = 0 }: { mode?: number }) {
  return (
    <div className="fixed inset-0 -z-20 bg-black">
      <Canvas 
        gl={{ powerPreference: "high-performance", antialias: false }} 
        camera={{ position: [0, 0, 5] }}
      >
        <ShaderPlane mode={mode} />
      </Canvas>
    </div>
  )
}
