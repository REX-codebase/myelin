// Adapted from the official webgpu_postprocessing_bloom example (r186).
import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, renderPipeline, renderer, mixer, timer;

init();

async function init() {

  timer = new THREE.Timer();
  timer.connect( document );

  const scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 100 );
  camera.position.set( - 5, 2.5, - 3.5 );
  scene.add( camera );

  scene.add( new THREE.AmbientLight( 0xcccccc ) );
  const pointLight = new THREE.PointLight( 0xffffff, 100 );
  camera.add( pointLight );

  const gltf = await new GLTFLoader().loadAsync( 'models/gltf/PrimaryIonDrive.glb' );
  const model = gltf.scene;
  scene.add( model );

  mixer = new THREE.AnimationMixer( model );
  mixer.clipAction( gltf.animations[ 0 ].optimize() ).play();

  renderer = new THREE.WebGPURenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  renderer.toneMapping = THREE.ReinhardToneMapping;
  document.body.appendChild( renderer.domElement );

  renderPipeline = new THREE.RenderPipeline( renderer );

  const scenePass = pass( scene, camera );
  const scenePassColor = scenePass.getTextureNode( 'output' );
  const bloomPass = bloom( scenePassColor );
  bloomPass.threshold.value = 0;
  bloomPass.strength.value = 1;
  bloomPass.radius.value = 0;

  renderPipeline.outputNode = scenePassColor.add( bloomPass );

  const controls = new OrbitControls( camera, renderer.domElement );
  controls.maxPolarAngle = Math.PI * 0.5;
  controls.minDistance = 3;
  controls.maxDistance = 8;

  window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

  timer.update();
  mixer.update( timer.getDelta() );
  renderPipeline.render();

}
