import * as THREE from 'three'

export type RimUniforms = {
  sunDir: THREE.Vector3
  intensity: number
}

export function applyRimLightToStandardMaterial(mat: THREE.MeshStandardMaterial, uniforms: RimUniforms) {
  // Avoid patching twice.
  if ((mat as any).__rimPatched) return
  ;(mat as any).__rimPatched = true

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimSunDir = { value: uniforms.sunDir }
    shader.uniforms.uRimIntensity = { value: uniforms.intensity }

    shader.fragmentShader =
      /* glsl */ `
        uniform vec3 uRimSunDir;
        uniform float uRimIntensity;
      ` + shader.fragmentShader

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      /* glsl */ `
        vec3 Nw = normalize(normal);
        vec3 Vw = normalize(-vViewPosition);
        float fres = pow(1.0 - clamp(dot(Vw, Nw), 0.0, 1.0), 1.5);
        float sunAmt = clamp(dot(normalize(uRimSunDir), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
        float duskBoost = 1.0 - smoothstep(0.25, 0.85, sunAmt);
        float rim = fres * (0.65 + 0.45 * duskBoost) * uRimIntensity;
        gl_FragColor.rgb += rim * vec3(1.0, 0.88, 0.70);
        #include <dithering_fragment>
      `
    )
  }
  mat.needsUpdate = true
}

export function applyRimLightToScene(scene: THREE.Object3D, uniforms: RimUniforms) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mat = m.material
    if (mat instanceof THREE.MeshStandardMaterial) {
      applyRimLightToStandardMaterial(mat, uniforms)
    }
  })
}

