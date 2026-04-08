import * as THREE from 'three'

const outlineMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: true,
  uniforms: {
    uThickness: { value: 0.025 },
    uColor: { value: new THREE.Color(0x0a0a12) },
    uAlpha: { value: 0.75 },
  },
  vertexShader: /* glsl */ `
    uniform float uThickness;

    void main() {
      vec3 pos = position + normal * uThickness;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uAlpha;

    void main() {
      gl_FragColor = vec4(uColor, uAlpha);
    }
  `,
  transparent: true,
})

export type OutlineOptions = {
  thickness?: number
  color?: number
  alpha?: number
}

export function addOutlineShell(root: THREE.Object3D, opts: OutlineOptions = {}): THREE.Group {
  const shellGroup = new THREE.Group()
  shellGroup.name = 'OutlineShell'

  const thickness = opts.thickness ?? 0.025
  const color = opts.color ?? 0x0a0a12
  const alpha = opts.alpha ?? 0.75

  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    if (!mesh.geometry) return

    const mat = outlineMaterial.clone()
    mat.uniforms.uThickness = { value: thickness }
    mat.uniforms.uColor = { value: new THREE.Color(color) }
    mat.uniforms.uAlpha = { value: alpha }

    const shell = new THREE.Mesh(mesh.geometry, mat)
    shell.name = `${mesh.name}_outline`
    shell.renderOrder = -1

    shell.matrixAutoUpdate = false
    const syncMatrix = () => {
      mesh.updateWorldMatrix(true, false)
      shell.matrixWorld.copy(mesh.matrixWorld)
    }

    const origUpdate = mesh.onBeforeRender
    mesh.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      syncMatrix()
      if (origUpdate) origUpdate.call(mesh, renderer, scene, camera, geometry, material, group)
    }

    shellGroup.add(shell)
  })

  root.add(shellGroup)
  return shellGroup
}
