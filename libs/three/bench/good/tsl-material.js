// Detail-map material from the TSL guide, plus a vertex wobble and a compute-free emissive pulse.
import * as THREE from 'three/webgpu';
import { Fn, texture, uv, time, sin, positionLocal, normalLocal, color, mix, uniform } from 'three/tsl';

export function makeDetailMaterial( colorMap, detailMap ) {

  colorMap.colorSpace = THREE.SRGBColorSpace;

  const detail = texture( detailMap, uv().mul( 10 ) );
  const material = new THREE.MeshStandardNodeMaterial( { roughness: 0.7 } );
  material.colorNode = texture( colorMap ).mul( detail );

  const amplitude = uniform( 0.04 );
  const wobble = Fn( ( [ amp ] ) => sin( time.mul( 3 ).add( positionLocal.y.mul( 6 ) ) ).mul( amp ) );
  material.positionNode = positionLocal.add( normalLocal.mul( wobble( amplitude ) ) );

  material.emissiveNode = mix( color( 0x000000 ), color( 0x331100 ), sin( time ).mul( 0.5 ).add( 0.5 ) );

  return { material, amplitude };

}

export function makeDetailMesh( colorMap, detailMap ) {

  const { material } = makeDetailMaterial( colorMap, detailMap );
  return new THREE.Mesh( new THREE.TorusKnotGeometry( 1, 0.3, 200, 32 ), material );

}
