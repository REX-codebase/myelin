// Adapted from the official webgpu_postprocessing_traa example (r186).
import * as THREE from 'three/webgpu';
import { mrt, output, pass, velocity } from 'three/tsl';
import { traa } from 'three/addons/tsl/display/TRAANode.js';

let camera, scene, renderer, renderPipeline;

init();

function init() {

  renderer = new THREE.WebGPURenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  document.body.appendChild( renderer.domElement );

  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10 );
  camera.position.z = 2.5;

  scene = new THREE.Scene();

  const geometry = new THREE.BoxGeometry();
  const mesh1 = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: true } ) );
  mesh1.position.x = - 1;
  scene.add( mesh1 );

  const texture = new THREE.TextureLoader().load( 'textures/brick_diffuse.jpg' );
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh2 = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { map: texture } ) );
  mesh2.position.x = 1;
  scene.add( mesh2 );

  renderPipeline = new THREE.RenderPipeline( renderer );
  const scenePass = pass( scene, camera );
  scenePass.setMRT( mrt( {
    output: output,
    velocity: velocity
  } ) );

  const scenePassColor = scenePass.getTextureNode( 'output' );
  const scenePassDepth = scenePass.getTextureNode( 'depth' );
  const scenePassVelocity = scenePass.getTextureNode( 'velocity' );

  renderPipeline.outputNode = traa( scenePassColor, scenePassDepth, scenePassVelocity, camera );

  window.addEventListener( 'resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  } );

}

function animate() {

  for ( const child of scene.children ) {
    child.rotation.x += 0.005;
    child.rotation.y += 0.01;
  }

  renderPipeline.render();

}
