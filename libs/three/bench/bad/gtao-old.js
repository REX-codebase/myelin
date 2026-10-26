import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';

export function createAO( renderer, scene, camera ) {
  const renderPipeline = new THREE.RenderPipeline( renderer );
  const scenePass = pass( scene, camera );
  scenePass.setMRT( mrt( { output: output, normal: normalView } ) );

  const aoPass = ao( scenePass.getTextureNode( 'depth' ), scenePass.getTextureNode( 'normal' ), camera );
  aoPass.distanceExponent.value = 1.5;
  aoPass.distanceFallOff.value = 0.8;

  renderPipeline.outputNode = scenePass.getTextureNode( 'output' ).mul( aoPass.getTextureNode().r );
  const clock = new THREE.Clock();
  return { renderPipeline, clock };
}
