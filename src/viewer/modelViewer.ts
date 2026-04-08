import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { WalkerMech, animateWalker, type WalkerTier, type WalkerLimbs } from '../world/WalkerMech'
import { buildKnightModel, animateKnight, type KnightLimbs } from '../game/KnightModel'

function disposeObject3D(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    const mat = mesh.material
    if (Array.isArray(mat)) mat.forEach((m) => materials.add(m))
    else if (mat) materials.add(mat)
  })
  for (const m of materials) m.dispose()
}

function groundModel(root: THREE.Object3D): THREE.Vector3 {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  root.position.y -= box.min.y
  root.updateMatrixWorld(true)
  const after = new THREE.Box3().setFromObject(root)
  return after.getCenter(new THREE.Vector3())
}

function enableShadowCasting(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) mesh.castShadow = true
  })
}

const canvas = document.createElement('canvas')
canvas.style.display = 'block'
canvas.style.width = '100%'
canvas.style.height = '100%'
document.body.appendChild(canvas)

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight, false)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x070a0f)

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 500)
camera.position.set(9, 5.5, 11)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.target.set(0, 2.2, 0)
controls.minDistance = 3.5
controls.maxDistance = 95
controls.maxPolarAngle = Math.PI * 0.485
controls.minPolarAngle = 0.08
controls.enablePan = true
controls.screenSpacePanning = false
controls.panSpeed = 0.85

const hemi = new THREE.HemisphereLight(0xc8dcff, 0x1a1e28, 0.5)
scene.add(hemi)

const sun = new THREE.DirectionalLight(0xfff4ec, 1.05)
sun.position.set(8, 18, 6)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 64
const ext = 22
sun.shadow.camera.left = -ext
sun.shadow.camera.right = ext
sun.shadow.camera.top = ext
sun.shadow.camera.bottom = -ext
sun.shadow.bias = -0.00025
sun.shadow.normalBias = 0.045
scene.add(sun)
scene.add(sun.target)
sun.target.position.set(0, 2.5, 0)

const fill = new THREE.DirectionalLight(0xa8c4ff, 0.38)
fill.position.set(-14, 10, -6)
scene.add(fill)

const rim = new THREE.DirectionalLight(0x8899bb, 0.28)
rim.position.set(-4, 6, -16)
scene.add(rim)

type LightPreset = 'studio' | 'outdoor'

function applyLightPreset(preset: LightPreset) {
  if (preset === 'studio') {
    hemi.color.setHex(0xd8e4ff)
    hemi.groundColor.setHex(0x1c212c)
    hemi.intensity = 0.42
    sun.color.setHex(0xffebd8)
    sun.intensity = 1.08
    fill.color.setHex(0x9eb8ff)
    fill.intensity = 0.42
    fill.position.set(-14, 10, -6)
    rim.color.setHex(0x8ea0c4)
    rim.intensity = 0.32
    rim.position.set(-4, 7, -16)
  } else {
    hemi.color.setHex(0xbdd9ff)
    hemi.groundColor.setHex(0x1d2230)
    hemi.intensity = 0.55
    sun.color.setHex(0xffffff)
    sun.intensity = 0.92
    fill.color.setHex(0xc8daf8)
    fill.intensity = 0.32
    fill.position.set(-12, 14, 4)
    rim.color.setHex(0xa6b8d4)
    rim.intensity = 0.22
    rim.position.set(6, 8, -14)
  }
}

applyLightPreset('studio')

const grid = new THREE.GridHelper(48, 48, 0x3d4f66, 0x232b38)
grid.position.y = 0
grid.material.transparent = true
if (Array.isArray(grid.material)) {
  for (const m of grid.material) {
    ;(m as THREE.LineBasicMaterial).opacity = 0.45
    ;(m as THREE.LineBasicMaterial).transparent = true
  }
} else {
  const m = grid.material as THREE.LineBasicMaterial
  m.opacity = 0.45
  m.transparent = true
}
scene.add(grid)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(96, 96),
  new THREE.MeshStandardMaterial({
    color: 0x121620,
    roughness: 1,
    metalness: 0.02,
  })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const pivot = new THREE.Group()
pivot.name = 'ViewerPivot'
scene.add(pivot)

type AssetId = WalkerTier | 'knight'

let current: WalkerMech | null = null
let walkerLimbs: WalkerLimbs | null = null
let knightLimbs: KnightLimbs | null = null
let knightRoot: THREE.Group | null = null
let lastFocus = new THREE.Vector3(0, 2.4, 0)
let currentAsset: AssetId = 'knight'

function frameCamera(center: THREE.Vector3) {
  lastFocus.copy(center)
  controls.target.copy(center)
  let r: number
  if (currentAsset === 'knight') {
    r = 4.5
  } else {
    const extent = currentAsset === 'assault' ? 12 : 7
    r = Math.max(6.5, extent + 5)
  }
  camera.position.set(center.x + r * 0.72, center.y + r * 0.38, center.z + r * 0.68)
  controls.update()
}

function clearAsset() {
  if (current) {
    pivot.remove(current.object3d)
    disposeObject3D(current.object3d)
    current = null
    walkerLimbs = null
  }
  if (knightRoot) {
    pivot.remove(knightRoot)
    disposeObject3D(knightRoot)
    knightRoot = null
    knightLimbs = null
  }
}

function setAsset(id: AssetId) {
  currentAsset = id
  clearAsset()

  if (id === 'knight') {
    const { root, limbs } = buildKnightModel()
    knightRoot = root
    knightLimbs = limbs
    enableShadowCasting(root)
    pivot.add(root)

    const center = groundModel(root)
    sun.target.position.copy(center).add(new THREE.Vector3(0, 0.2, 0))
    frameCamera(center)
  } else {
    const label = id === 'scout' ? 'Argos' : 'Tyr'
    const mech = new WalkerMech(id, label)
    enableShadowCasting(mech.object3d)
    pivot.add(mech.object3d)

    const center = groundModel(mech.object3d)
    sun.target.position.copy(center).add(new THREE.Vector3(0, 0.4, 0))
    frameCamera(center)

    current = mech
    walkerLimbs = mech.limbs
  }
}

const select = document.getElementById('asset') as HTMLSelectElement
select.addEventListener('change', () => {
  setAsset(select.value as AssetId)
})

const btnStudio = document.getElementById('preset-studio') as HTMLButtonElement
const btnOutdoor = document.getElementById('preset-outdoor') as HTMLButtonElement

function setPresetUI(p: LightPreset) {
  btnStudio.setAttribute('aria-pressed', p === 'studio' ? 'true' : 'false')
  btnOutdoor.setAttribute('aria-pressed', p === 'outdoor' ? 'true' : 'false')
}

btnStudio.addEventListener('click', () => {
  applyLightPreset('studio')
  setPresetUI('studio')
})
btnOutdoor.addEventListener('click', () => {
  applyLightPreset('outdoor')
  setPresetUI('outdoor')
})

const exposureInput = document.getElementById('exposure') as HTMLInputElement
const exposureVal = document.getElementById('exposure-val') as HTMLSpanElement

function syncExposureLabel() {
  const v = Number(exposureInput.value)
  exposureVal.textContent = v.toFixed(2)
}

exposureInput.addEventListener('input', () => {
  renderer.toneMappingExposure = Number(exposureInput.value)
  syncExposureLabel()
})
syncExposureLabel()

const btnGrid = document.getElementById('toggle-grid') as HTMLButtonElement
btnGrid.addEventListener('click', () => {
  const on = btnGrid.getAttribute('aria-pressed') !== 'true'
  btnGrid.setAttribute('aria-pressed', on ? 'true' : 'false')
  grid.visible = on
})

const btnReset = document.getElementById('reset-cam') as HTMLButtonElement
btnReset.addEventListener('click', () => {
  frameCamera(lastFocus)
})

setAsset('knight')

const clock = new THREE.Clock()

function onResize() {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', onResize)

const keysDown = new Set<string>()

function keyboardCapturesCamera(e: EventTarget | null): boolean {
  return e instanceof HTMLInputElement || e instanceof HTMLSelectElement || e instanceof HTMLTextAreaElement
}

function applyKeyboardRoam(dt: number) {
  if (keysDown.size === 0) return
  let speed = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight') ? 32 : 16
  const move = new THREE.Vector3()
  const fwd = new THREE.Vector3()
  camera.getWorldDirection(fwd)
  fwd.y = 0
  if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1)
  else fwd.normalize()
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()
  if (keysDown.has('KeyW')) move.add(fwd)
  if (keysDown.has('KeyS')) move.sub(fwd)
  if (keysDown.has('KeyA')) move.sub(right)
  if (keysDown.has('KeyD')) move.add(right)
  if (keysDown.has('KeyQ')) move.y += 1
  if (keysDown.has('KeyE')) move.y -= 1
  if (move.lengthSq() < 1e-6) return
  move.normalize().multiplyScalar(speed * dt)
  camera.position.add(move)
  controls.target.add(move)
}

function syncSunTarget() {
  sun.target.position.copy(controls.target).add(new THREE.Vector3(0, 0.4, 0))
}

window.addEventListener('keydown', (e) => {
  if (!keyboardCapturesCamera(e.target)) {
    keysDown.add(e.code)
  }
  if (keyboardCapturesCamera(e.target)) return
  const k = e.key.toLowerCase()
  if (k === 'r') {
    frameCamera(lastFocus)
    keysDown.delete('KeyR')
    e.preventDefault()
  }
  if (k === 'g') {
    const on = btnGrid.getAttribute('aria-pressed') !== 'true'
    btnGrid.setAttribute('aria-pressed', on ? 'true' : 'false')
    grid.visible = on
    keysDown.delete('KeyG')
    e.preventDefault()
  }
})

window.addEventListener('keyup', (e) => {
  keysDown.delete(e.code)
})

let knightDemoPhase = 0
let walkerDemoPhase = 0

function tick() {
  const dt = Math.min(clock.getDelta(), 1 / 20)
  current?.update(dt)

  if (knightLimbs) {
    knightDemoPhase = (knightDemoPhase + dt * 1.8) % 1
    const cycle = clock.elapsedTime % 12
    let demoSpeed: number
    if (cycle < 4) demoSpeed = 0
    else if (cycle < 8) demoSpeed = 5.0
    else demoSpeed = 9.0
    animateKnight(knightLimbs, dt, demoSpeed, knightDemoPhase)
  }

  if (walkerLimbs) {
    walkerDemoPhase = (walkerDemoPhase + dt * 1.5) % 1
    const cycle = clock.elapsedTime % 12
    let demoSpeed: number
    if (cycle < 4) demoSpeed = 0
    else if (cycle < 8) demoSpeed = 3.0
    else demoSpeed = 6.0
    animateWalker(walkerLimbs, dt, demoSpeed, walkerDemoPhase)
  }

  applyKeyboardRoam(dt)
  syncSunTarget()
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}

tick()
