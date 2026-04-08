import * as THREE from 'three'

export function makeTerrainMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uSeaLevel: { value: -2 },
    },
    vertexShader: /* glsl */ `
      attribute float aBiome;
      attribute float aSlope;

      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec3 vColor;
      varying float vBiome;
      varying float vSlope;
      varying float vHeight;

      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vColor = color.rgb;
        vBiome = aBiome;
        vSlope = aSlope;
        vHeight = wp.y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec3 vColor;
      varying float vBiome;
      varying float vSlope;
      varying float vHeight;

      uniform float uTime;
      uniform float uSeaLevel;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.03;
          a *= 0.48;
        }
        return v;
      }

      vec3 triplanarSample(vec3 wpos, vec3 normal, float scale, vec3 colX, vec3 colY, vec3 colZ) {
        vec3 blend = abs(normal);
        blend = max(blend - 0.2, 0.001);
        blend = pow(blend, vec3(4.0));
        blend /= (blend.x + blend.y + blend.z);

        vec2 uvX = wpos.yz * scale;
        vec2 uvY = wpos.xz * scale;
        vec2 uvZ = wpos.xy * scale;

        float nX = fbm(uvX);
        float nY = fbm(uvY);
        float nZ = fbm(uvZ);

        vec3 cX = mix(colX * 0.8, colX, nX);
        vec3 cY = mix(colY * 0.85, colY, nY);
        vec3 cZ = mix(colZ * 0.8, colZ, nZ);

        return cX * blend.x + cY * blend.y + cZ * blend.z;
      }

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vWorldPos);

        float slopeAmt = vSlope;
        float rockBlend = smoothstep(0.25, 0.55, slopeAmt);

        vec3 rockColor = vec3(0.38, 0.38, 0.42);
        vec3 rockDark = vec3(0.28, 0.28, 0.32);
        vec3 triRock = triplanarSample(vWorldPos, N, 0.12, rockColor, rockDark, rockColor);

        float detail = fbm(vWorldPos.xz * 0.15);
        float micro = noise(vWorldPos.xz * 0.8);

        vec3 baseColor = vColor;
        baseColor += (detail - 0.5) * 0.06;
        baseColor += (micro - 0.5) * 0.03;

        vec3 col = mix(baseColor, triRock, rockBlend);

        float heightFade = smoothstep(uSeaLevel, uSeaLevel + 3.0, vHeight);
        vec3 shoreDark = col * 0.7;
        col = mix(shoreDark, col, heightFade);

        float ndl = max(0.0, dot(N, normalize(vec3(0.4, 0.8, 0.3))));
        col *= 0.55 + 0.45 * ndl;

        float rim = pow(1.0 - max(0.0, dot(N, V)), 3.0);
        col += rim * 0.04;

        float ao = smoothstep(0.0, 0.15, slopeAmt);
        col *= 0.92 + 0.08 * (1.0 - ao);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}
