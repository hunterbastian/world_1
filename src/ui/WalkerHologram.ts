import * as THREE from 'three'
import type { WalkerMech } from '../world/WalkerMech'

export class WalkerHologram {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly target: THREE.WebGLRenderTarget
  private readonly canvas: HTMLCanvasElement
  private readonly ctx2d: CanvasRenderingContext2D
  private clone: THREE.Group | null = null
  private holoMat: THREE.ShaderMaterial
  private rotY = 0

  constructor(renderer: THREE.WebGLRenderer) {
    // Store the game renderer to share the GL context
    this.renderer = renderer

    // Mini scene for the hologram
    this.scene = new THREE.Scene()

    // Camera framing the walker
    this.camera = new THREE.PerspectiveCamera(35, 300 / 400, 0.1, 50)
    this.camera.position.set(0, 2, 8)
    this.camera.lookAt(0, 1.5, 0)

    // Lighting: blue-cyan tinted directional + hemisphere
    const dir = new THREE.DirectionalLight(0x4ad4e8, 1.5)
    dir.position.set(3, 5, 2)
    this.scene.add(dir)
    const hemi = new THREE.HemisphereLight(0x4ad4e8, 0x1a2a3a, 0.8)
    this.scene.add(hemi)

    // Render target (small, cheap)
    this.target = new THREE.WebGLRenderTarget(300, 400, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    // Output canvas
    this.canvas = document.createElement('canvas')
    this.canvas.width = 300
    this.canvas.height = 400
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.objectFit = 'contain'
    this.ctx2d = this.canvas.getContext('2d')!

    // Hologram override material
    this.holoMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x4ad4e8) },
      },
      vertexShader: `
        varying vec3 vNormalW;
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vNormalW;
        varying vec3 vWorldPos;
        void main() {
          vec3 N = normalize(vNormalW);
          vec3 V = normalize(cameraPosition - vWorldPos);
          float rim = pow(1.0 - max(0.0, dot(N, V)), 1.5);
          float scan = step(0.5, fract(vWorldPos.y * 15.0 - uTime * 0.8));
          float scanDim = 1.0 - scan * 0.12;
          float alpha = 0.15 + rim * 0.5;
          vec3 col = uColor * scanDim;
          float flicker = 1.0 - step(0.97, fract(sin(uTime * 7.3) * 43758.5453));
          alpha *= 0.85 + flicker * 0.15;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    })
  }

  setWalker(walker: WalkerMech | null) {
    if (this.clone) {
      this.scene.remove(this.clone)
      this.clone = null
    }
    if (!walker) return

    this.clone = walker.object3d.clone(true)
    // Override all materials with hologram shader
    this.clone.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) m.material = this.holoMat
    })
    // Center and scale based on tier
    const box = new THREE.Box3().setFromObject(this.clone)
    const center = box.getCenter(new THREE.Vector3())
    this.clone.position.sub(center)
    this.clone.position.y += box.getSize(new THREE.Vector3()).y * 0.5

    const scale = walker.tier === 'assault' ? 0.5 : 0.7
    this.clone.scale.setScalar(scale)

    this.scene.add(this.clone)
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  render() {
    if (!this.clone) return

    this.rotY += 0.005
    this.clone.rotation.y = this.rotY
    this.holoMat.uniforms.uTime.value += 0.016

    // Save renderer state
    const oldTarget = this.renderer.getRenderTarget()
    const oldClear = this.renderer.getClearColor(new THREE.Color())
    const oldAlpha = this.renderer.getClearAlpha()

    this.renderer.setRenderTarget(this.target)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)

    // Restore
    this.renderer.setRenderTarget(oldTarget)
    this.renderer.setClearColor(oldClear, oldAlpha)

    // Copy to 2D canvas
    const w = this.target.width
    const h = this.target.height
    const pixels = new Uint8Array(w * h * 4)
    this.renderer.readRenderTargetPixels(this.target, 0, 0, w, h, pixels)
    const imgData = this.ctx2d.createImageData(w, h)
    // Flip Y (WebGL is bottom-up)
    for (let y = 0; y < h; y++) {
      const srcRow = (h - 1 - y) * w * 4
      const dstRow = y * w * 4
      imgData.data.set(pixels.subarray(srcRow, srcRow + w * 4), dstRow)
    }
    this.ctx2d.putImageData(imgData, 0, 0)
  }

  dispose() {
    this.target.dispose()
    this.holoMat.dispose()
    if (this.clone) this.scene.remove(this.clone)
  }
}
