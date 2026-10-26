import * as THREE from 'three/webgpu';

export function setupRenderer( renderer ) {
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
}

export function makeCrate( url ) {
  const map = new THREE.TextureLoader().load( url );
  map.encoding = THREE.sRGBEncoding;
  const geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
  const material = new THREE.MeshStandardMaterial( { map } );
  return new THREE.Mesh( geometry, material );
}
