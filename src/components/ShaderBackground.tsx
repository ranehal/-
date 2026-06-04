import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GameTheme, useGameStore } from '../store/useGameStore'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform float uTheme; // 0: SPACE, 1: UNIVERSE, 2: NEON_FLUID, 3: HALLUCINATION, 4: CHAOS
  varying vec2 vUv;

  vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
  }

  // --- SPACE THEME ---
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec3 spaceTheme(vec2 uv) {
    vec3 color = vec3(0.0);
    for(float i=0.; i<4.; i++) {
        vec2 p = uv * (2. + i);
        float h = hash(floor(p));
        if(h > 0.98) {
            float blink = sin(uTime * (1. + h) + h * 10.) * 0.5 + 0.5;
            color += vec3(h, h, 1.0) * blink * (0.01 / length(fract(p) - 0.5));
        }
    }
    return color * 0.5;
  }

  // --- UNIVERSE THEME ---
  vec3 universeTheme(vec2 uv) {
    float d = length(uv);
    vec3 col = palette(d + uTime * 0.1, vec3(0.5), vec3(0.5), vec3(1.0, 0.7, 0.8), vec3(0.0, 0.1, 0.2));
    for(float i=0.; i<3.; i++) {
        uv = abs(uv) / dot(uv,uv) - 0.5;
        col += palette(length(uv), vec3(0.2), vec3(0.3), vec3(0.5), vec3(0.1, 0.2, 0.3)) * 0.1;
    }
    return col * 0.3;
  }

  // --- NEON FLUID THEME ---
  vec3 neonFluidTheme(vec2 uv) {
    for(float i=1.; i<4.; i++) {
        uv.x += sin(uv.y * i + uTime * 0.5) * 0.2;
        uv.y += cos(uv.x * i + uTime * 0.5) * 0.2;
    }
    return palette(length(uv), vec3(0.5, 0.0, 0.5), vec3(0.5, 0.5, 0.0), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.33, 0.67)) * 0.4;
  }

  // --- HALLUCINATION THEME ---
  vec3 hallucinationTheme(vec2 uv) {
    float angle = atan(uv.y, uv.x) + uTime * 0.2;
    float dist = length(uv);
    uv = vec2(cos(angle), sin(angle)) * dist;
    uv = fract(uv * 5.0) - 0.5;
    float d = length(uv);
    d = sin(d * 10. + uTime) / 10.;
    d = abs(d);
    return palette(dist + uTime * 0.5, vec3(1.0, 0.5, 0.0), vec3(0.0, 1.0, 0.5), vec3(0.5, 0.0, 1.0), vec3(0.3)) * (0.02 / d);
  }

  // --- CHAOS THEME (Original) ---
  vec3 chaosTheme(vec2 uv) {
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    for (float i = 0.0; i < 3.0; i++) {
        uv = fract(uv * 1.5) - 0.5;
        float d = length(uv) * exp(-length(uv0));
        vec3 col = palette(length(uv0) + i * 0.4 + uTime * 0.4, 
            vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.263, 0.416, 0.557));
        d = sin(d * 8.0 + uTime) / 8.0;
        d = abs(d);
        d = pow(0.01 / d, 1.2);
        finalColor += col * d;
    }
    return finalColor * 0.25;
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 color = vec3(0.0);

    if (uTheme < 0.5) color = spaceTheme(uv);
    else if (uTheme < 1.5) color = universeTheme(uv);
    else if (uTheme < 2.5) color = neonFluidTheme(uv);
    else if (uTheme < 3.5) color = hallucinationTheme(uv);
    else color = chaosTheme(uv);

    gl_FragColor = vec4(color, 1.0);
  }
`

function ShaderPlane({ theme }: { theme: GameTheme }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  const themeMap: Record<GameTheme, number> = {
      'SPACE': 0,
      'UNIVERSE': 1,
      'NEON_FLUID': 2,
      'HALLUCINATION': 3,
      'CHAOS': 4
  }

  const targetTheme = useRef(themeMap[theme])
  
  useEffect(() => {
      targetTheme.current = themeMap[theme]
  }, [theme])

  const uniforms = useRef({
    uTime: { value: 0 },
    uTheme: { value: themeMap[theme] }
  })

  useFrame((state, delta) => {
    uniforms.current.uTime.value = state.clock.getElapsedTime()
    uniforms.current.uTheme.value = THREE.MathUtils.lerp(uniforms.current.uTheme.value, targetTheme.current, delta * 2)
  })

  return (
    <mesh ref={meshRef} scale={[100, 100, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms.current}
        transparent
      />
    </mesh>
  )
}

export function ShaderBackground({ mode }: { mode?: number }) {
  const theme = useGameStore(state => state.theme)
  return (
    <div className="fixed inset-0 -z-20 bg-black">
      <Canvas 
        gl={{ powerPreference: "high-performance", antialias: false }} 
        camera={{ position: [0, 0, 5] }}
      >
        <ShaderPlane theme={theme} />
      </Canvas>
    </div>
  )
}
