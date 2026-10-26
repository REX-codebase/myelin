// GTAO + TRAA setup adapted from the official webgpu_postprocessing_ao example (r186).
import * as THREE from 'three/webgpu';
import { sample, pass, mrt, screenUV, normalView, velocity, packNormalToRGB, unpackRGBToNormal, builtinAOContext } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export async function createAOScene( scene, camera ) {

  const renderer = new THREE.WebGPURenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.toneMapping = THREE.NeutralToneMapping;
  document.body.appendChild( renderer.domElement );
  await renderer.init();

  const pmremGenerator = new THREE.PMREMGenerator( renderer );
  const environment = new RoomEnvironment();
  scene.environment = pmremGenerator.fromScene( environment ).texture;
  environment.dispose();
  pmremGenerator.dispose();

  const renderPipeline = new THREE.RenderPipeline( renderer );

  const prePass = pass( scene, camera );
  prePass.transparent = false;
  prePass.setMRT( mrt( {
    output: packNormalToRGB( normalView ),
    velocity: velocity
  } ) );

  const prePassNormal = sample( ( uv ) => unpackRGBToNormal( prePass.getTextureNode().sample( uv ) ) );
  const prePassDepth = prePass.getTextureNode( 'depth' );
  const prePassVelocity = prePass.getTextureNode( 'velocity' );
  prePass.getTexture( 'output' ).type = THREE.UnsignedByteType;

  const aoPass = ao( prePassDepth, prePassNormal, camera );
  aoPass.radius.value = 0.35;
  aoPass.samples.value = 16;
  aoPass.resolutionScale = 0.5;

  const scenePass = pass( scene, camera );
  scenePass.contextNode = builtinAOContext( aoPass.getTextureNode().sample( screenUV ).r );

  const traaPassNode = traa( scenePass, prePassDepth, prePassVelocity, camera );
  traaPassNode.useSubpixelCorrection = false;
  renderPipeline.outputNode = traaPassNode;

  renderer.setAnimationLoop( () => renderPipeline.render() );
  return { renderer, renderPipeline, aoPass };

}
