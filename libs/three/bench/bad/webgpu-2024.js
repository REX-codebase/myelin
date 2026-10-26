import * as THREE from 'three';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';
import { MeshStandardNodeMaterial, tslFn, timerLocal, positionLocal, sin, color, pass } from 'three/nodes';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 50, innerWidth / innerHeight, 0.1, 100 );
camera.position.z = 5;

const renderer = new WebGPURenderer( { antialias: true } );
renderer.setSize( innerWidth, innerHeight );
document.body.appendChild( renderer.domElement );

const wobble = tslFn( ( [ amp ] ) => sin( timerLocal().add( positionLocal.y ) ).mul( amp ) );

const material = new MeshStandardNodeMaterial();
material.colorNode = color( 0xff8844 );
material.positionNode = positionLocal.add( wobble( 0.1 ) );
scene.add( new THREE.Mesh( new THREE.TorusGeometry( 1, 0.4, 32, 96 ), material ) );
scene.add( new THREE.HemisphereLight( 0xffffff, 0x222222, 2 ) );

const postProcessing = new THREE.PostProcessing( renderer );
postProcessing.outputNode = pass( scene, camera );

renderer.setAnimationLoop( () => postProcessing.render() );
