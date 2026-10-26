import * as THREE from 'three/webgpu';

export function makeGlowSphere() {
  const material = new THREE.ShaderMaterial( {
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color( 0x33aaff ) }
    },
    vertexShader: /* glsl */`
      varying vec3 vNormal;
      void main() {
        vNormal = normalize( normalMatrix * normal );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vNormal;
      void main() {
        float rim = pow( 1.0 - abs( vNormal.z ), 2.0 );
        gl_FragColor = vec4( uColor * rim * ( 0.75 + 0.25 * sin( uTime ) ), rim );
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending
  } );
  return new THREE.Mesh( new THREE.SphereGeometry( 1.2, 64, 32 ), material );
}
