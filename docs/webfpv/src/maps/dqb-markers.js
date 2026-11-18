import * as THREE from 'three';
import { trainingLandingZone } from '../game/dqb-course.js';

export function markTrainingCourse(map) {
  function sign(text, x, y, z, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 68px sans-serif';
    ctx.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    sprite.position.set(x, y, z);
    sprite.scale.set(3.6, 0.9, 1);
    map.scene.add(sprite);
  }

  function pad(text, x, z, color, radius) {
    const ground = map.height(x, z, Infinity);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.28, radius, 48),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, ground + 0.07, z);
    map.scene.add(ring);
    sign(text, x + radius + 1.8, ground + 1.4, z, color);
    return ring;
  }

  pad('СТАРТ', map.spawn.x, map.spawn.z, '#145ca4', 2);
  map.gates.forEach((gate, index) => {
    const { x, y, z } = gate.position;
    sign(String(index + 1), x, y + 5, z, '#145ca4');
  });
  const { x, z, radius } = trainingLandingZone;
  const ring = pad('ПОСАДКА', x, z, '#087446', radius);
  const fill = new THREE.Mesh(
    new THREE.CircleGeometry(radius - 0.28, 48),
    new THREE.MeshBasicMaterial({ color: '#48ff72', transparent: true, opacity: 0.35, depthWrite: false }),
  );
  fill.position.copy(ring.position);
  fill.rotation.copy(ring.rotation);
  fill.visible = false;
  map.scene.add(fill);
  return (active) => {
    ring.material.color.set(active ? '#48ff72' : '#087446');
    fill.visible = active;
  };
}
