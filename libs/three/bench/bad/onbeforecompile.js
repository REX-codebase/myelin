import * as THREE from 'three/webgpu';

export function makeDetailMaterial( colorMap, detailMap ) {
  const material = new THREE.MeshStandardMaterial();
  material.map = colorMap;
  material.onBeforeCompile = ( shader ) => {
    shader.uniforms.detailMap = { value: detailMap };
    shader.fragmentShader = shader.fragmentShader.replace(
      '#define STANDARD',
      '#define STANDARD\nuniform sampler2D detailMap;'
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#include <map_fragment>\ndiffuseColor *= texture2D( detailMap, vMapUv * 10.0 );'
    );
  };
  return material;
}
