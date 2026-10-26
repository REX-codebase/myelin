import * as THREE from 'three/webgpu';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export async function createRenderer( canvas ) {
  const renderer = new THREE.WebGPURenderer( { canvas, antialias: true, colorBufferType: THREE.HalfFloatType } );
  await renderer.init();
  return renderer;
}

export async function setupEnvironment( renderer, scene, url ) {
  const hdr = await new RGBELoader().loadAsync( url );
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = hdr;

  const cubeTarget = new THREE.WebGLCubeRenderTarget( 256, { type: THREE.HalfFloatType } );
  const cubeCamera = new THREE.CubeCamera( 0.1, 100, cubeTarget );
  scene.add( cubeCamera );
  cubeCamera.update( renderer, scene );
  scene.environment = cubeTarget.texture;
  return cubeCamera;
}
