import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, metalness, roughness, velocity, vec2, sample, directionToColor, colorToDirection } from 'three/tsl';
import { traaPass } from 'three/addons/tsl/display/TRAAPassNode.js';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';

export function createPipeline( renderer, scene, camera ) {
  const postProcessing = new THREE.PostProcessing( renderer );

  const scenePass = pass( scene, camera );
  scenePass.setMRT( mrt( {
    output: output,
    normal: directionToColor( normalView ),
    metalrough: vec2( metalness, roughness ),
    velocity: velocity
  } ) );

  const color = scenePass.getTextureNode( 'output' );
  const depth = scenePass.getTextureNode( 'depth' );
  const mr = scenePass.getTextureNode( 'metalrough' );
  const normal = sample( ( uv ) => colorToDirection( scenePass.getTextureNode( 'normal' ).sample( uv ) ) );

  const reflections = ssr( color, depth, normal, { metalnessNode: mr.r, roughnessNode: mr.g } );
  postProcessing.outputNode = color.add( reflections.rgb );

  const aa = traaPass( scene, camera );
  return { postProcessing, aa };
}
