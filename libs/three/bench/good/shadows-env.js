// Soft shadows, HDR environment and Timer-driven animation on WebGPURenderer (r186).
import * as THREE from 'three/webgpu';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 200 );
camera.position.set( 6, 4, 8 );

const renderer = new THREE.WebGPURenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.toneMapping = THREE.AgXToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild( renderer.domElement );

const hdr = await new HDRLoader().loadAsync( 'textures/equirectangular/venice_sunset_1k.hdr' );
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = hdr;
scene.background = hdr;
scene.backgroundBlurriness = 0.3;

const sun = new THREE.DirectionalLight( 0xffffff, 3 );
sun.position.set( 8, 12, 6 );
sun.castShadow = true;
sun.shadow.mapSize.set( 2048, 2048 );
sun.shadow.radius = 4;
scene.add( sun );

const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry( 1, 0.3, 200, 32 ),
  new THREE.MeshPhysicalNodeMaterial( { color: 0xd4af37, metalness: 1, roughness: 0.25 } )
);
knot.position.y = 2;
knot.castShadow = true;
scene.add( knot );

const ground = new THREE.Mesh( new THREE.PlaneGeometry( 30, 30 ), new THREE.MeshStandardNodeMaterial( { color: 0x999999 } ) );
ground.rotation.x = - Math.PI / 2;
ground.receiveShadow = true;
scene.add( ground );

const controls = new OrbitControls( camera, renderer.domElement );
controls.target.set( 0, 1.5, 0 );
controls.update();

const timer = new THREE.Timer();
timer.connect( document );

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );

renderer.setAnimationLoop( () => {
  timer.update();
  const delta = timer.getDelta();
  knot.rotation.x += 0.25 * delta;
  knot.rotation.y += 0.5 * delta;
  renderer.render( scene, camera );
} );
