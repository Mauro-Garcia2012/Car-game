/**
 * Roadside boards, and which side of one the post goes.
 *
 * Every sign in the game is planted with `rotation.y = roadYaw(s)`, which
 * turns local +Z back down the road at the traffic coming towards it. So the
 * legend lives on the +Z face, and everything holding the sign up — posts,
 * poles, brackets — belongs behind it, on -Z.
 *
 * That is obvious written down, and it is also the bug this module exists to
 * stop: a post left on z = 0, or nudged the wrong way, does not look like a
 * mistake in the source. It looks like a steel bar standing across the middle
 * of whatever the sign was trying to say, which is the one thing a sign
 * cannot survive.
 */
import * as THREE from 'three';

/**
 * A board with the legend on the face the traffic sees and a plain back.
 *
 * Box faces come in the order [+X, -X, +Y, -Y, +Z, -Z], so the legend is
 * index 4. Without this the same texture lands on all six, and the sign reads
 * backwards in the mirror as you pass it.
 */
export function signBoard(w, h, d, face, back) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    [back, back, back, back, face, back]
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Swaps the legend on a board built by `signBoard`. */
export function setBoardFace(mesh, map) {
  const face = mesh.material[4];
  const previous = face.map;
  face.map = map;
  if (face.emissiveMap) face.emissiveMap = map;
  face.needsUpdate = true;
  if (previous && previous !== map) previous.dispose();
}

/** The z a post of this depth needs to sit clear behind that board. */
export function behindBoard(boardDepth, postDepth, gap = 0.012) {
  return -(boardDepth + postDepth) / 2 - gap;
}
