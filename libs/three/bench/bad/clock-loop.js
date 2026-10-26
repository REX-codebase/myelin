import * as THREE from 'three/webgpu';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, innerWidth / innerHeight, 0.1, 100 );
camera.position.set( 3, 4, 6 );
camera.lookAt( 0, 0, 0 );

const renderer = new THREE.WebGPURenderer( { antialias: true } );
renderer.setSize( innerWidth, innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild( renderer.domElement );

const light = new THREE.DirectionalLight( 0xffffff, 3 );
light.position.set( 5, 10, 5 );
light.castShadow = true;
light.shadow.bias = - 0.0005;
scene.add( light );

const knot = new THREE.Mesh( new THREE.TorusKnotGeometry( 0.8, 0.25, 128, 16 ), new THREE.MeshStandardMaterial( { color: 0x88ccee } ) );
knot.castShadow = true;
knot.position.y = 1.5;
scene.add( knot );

const floor = new THREE.Mesh( new THREE.PlaneGeometry( 20, 20 ), new THREE.MeshStandardMaterial( { color: 0x808080 } ) );
floor.rotation.x = - Math.PI / 2;
floor.receiveShadow = true;
scene.add( floor );

const clock = new THREE.Clock();

async function loop() {
  const dt = clock.getDelta();
  knot.rotation.y += dt;
  await renderer.renderAsync( scene, camera );
  requestAnimationFrame( loop );
}
loop();
