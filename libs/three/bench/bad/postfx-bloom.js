import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 100 );
camera.position.set( 0, 2, 8 );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls( camera, renderer.domElement );

const orb = new THREE.Mesh(
  new THREE.IcosahedronGeometry( 1, 4 ),
  new THREE.MeshStandardMaterial( { color: 0x111111, emissive: 0xff7722, emissiveIntensity: 3 } )
);
scene.add( orb );
scene.add( new THREE.AmbientLight( 0x404040 ) );

const composer = new EffectComposer( renderer );
composer.addPass( new RenderPass( scene, camera ) );
const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
composer.addPass( bloomPass );
composer.addPass( new OutputPass() );

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
  composer.setSize( window.innerWidth, window.innerHeight );
} );

function animate() {
  requestAnimationFrame( animate );
  orb.rotation.y += 0.01;
  controls.update();
  composer.render();
}
animate();
