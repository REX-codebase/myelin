// SSR setup adapted from the official webgpu_postprocessing_ssr example (r186).
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, metalness, roughness, sample, packNormalToRGB, unpackRGBToNormal, vec2 } from 'three/tsl';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';
import { smaa } from 'three/addons/tsl/display/SMAANode.js';

export function createSSRPipeline( renderer, scene, camera ) {

  const renderPipeline = new THREE.RenderPipeline( renderer );

  const scenePass = pass( scene, camera );
  scenePass.setMRT( mrt( {
    output: output,
    normal: packNormalToRGB( normalView ),
    metalrough: vec2( metalness, roughness )
  } ) );

  const scenePassColor = scenePass.getTextureNode( 'output' );
  const scenePassNormal = scenePass.getTextureNode( 'normal' );
  const scenePassDepth = scenePass.getTextureNode( 'depth' );
  const scenePassMetalRough = scenePass.getTextureNode( 'metalrough' );

  scenePass.getTexture( 'normal' ).type = THREE.UnsignedByteType;
  scenePass.getTexture( 'metalrough' ).type = THREE.UnsignedByteType;

  const sceneNormal = sample( ( uv ) => unpackRGBToNormal( scenePassNormal.sample( uv ) ) );

  const ssrPass = ssr( scenePassColor, scenePassDepth, sceneNormal, {
    metalnessNode: scenePassMetalRough.r,
    roughnessNode: scenePassMetalRough.g
  } );
  ssrPass.thickness.value = 0.03;

  // SSR outputs premultiplied color, so blend additively
  renderPipeline.outputNode = smaa( scenePassColor.add( ssrPass.rgb ) );

  return { renderPipeline, ssrPass };

}
