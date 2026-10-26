import * as THREE from 'three';

export function buildFence( posts ) {
  const geometry = new THREE.Geometry();
  for ( let i = 0; i < posts; i ++ ) {
    const post = new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.05, 0.05, 1, 8 ) );
    post.position.x = i * 0.5;
    post.updateMatrix();
    geometry.merge( new THREE.Geometry().fromBufferGeometry( post.geometry ), post.matrix );
  }
  const angle = THREE.Math.degToRad( 15 );
  const mesh = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: 0x8b5a2b } ) );
  mesh.rotation.y = angle;
  return mesh;
}
