// Stylised procedural model of PRENEU PANDION Q650 (PQ650).
// Built from primitives, proportions taken from product renders and the
// Aibar 650 manual. Not an engineering model.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function carbonTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#141619';
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const on = (x + y) % 2 === 0;
    const grd = on ? g.createLinearGradient(x * 8, 0, x * 8 + 8, 0) : g.createLinearGradient(0, y * 8, 0, y * 8 + 8);
    grd.addColorStop(0, on ? '#202327' : '#17191c');
    grd.addColorStop(0.5, on ? '#2d3136' : '#1f2226');
    grd.addColorStop(1, on ? '#1c1e22' : '#15171a');
    g.fillStyle = grd;
    g.fillRect(x * 8, y * 8, 8, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function labelTexture(lines, bg, fg, accent) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.fillStyle = accent; g.fillRect(0, 196, 512, 22);
  g.fillStyle = fg;
  g.font = '800 64px Manrope, Arial, sans-serif';
  g.fillText(lines[0], 36, 92);
  g.font = '600 30px Manrope, Arial, sans-serif';
  g.globalAlpha = 0.75;
  g.fillText(lines[1], 38, 146);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function octagon(hw, hl, chf, chb) {
  // top-view outline (x = width, y = length; front is +y)
  const s = new THREE.Shape();
  s.moveTo(-hw + chf, hl);
  s.lineTo(hw - chf, hl);
  s.lineTo(hw, hl - chf);
  s.lineTo(hw, -hl + chb);
  s.lineTo(hw - chb, -hl);
  s.lineTo(-hw + chb, -hl);
  s.lineTo(-hw, -hl + chb);
  s.lineTo(-hw, hl - chf);
  s.closePath();
  return s;
}

function slab(shape, depth, bevel) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, steps: 1, curveSegments: 1
  });
  geo.rotateX(-Math.PI / 2); // extrude upwards (+y); shape +y becomes -z
  geo.rotateY(Math.PI);      // so shape front (+y) points to +z (towards camera)
  return geo;
}

function tube(a, b, r, mat, seg = 20) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r, r, len, seg, 1);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
  return m;
}

function blade(mats, flip) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0.05, -0.07);
  s.bezierCurveTo(0.35, -0.16, 0.9, -0.15, 1.55, -0.085);
  s.lineTo(1.78, -0.07);
  s.lineTo(1.78, 0.045);
  s.bezierCurveTo(1.2, 0.07, 0.6, 0.09, 0.05, 0.07);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 1, curveSegments: 10 });
  geo.translate(0, 0, -0.011);
  g.add(new THREE.Mesh(geo, mats.blade));
  const t = new THREE.Shape();
  t.moveTo(1.78, -0.07); t.lineTo(2.03, -0.05); t.lineTo(2.05, 0.0); t.lineTo(2.0, 0.035); t.lineTo(1.78, 0.045); t.closePath();
  const tg = new THREE.ExtrudeGeometry(t, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 1, curveSegments: 4 });
  tg.translate(0, 0, -0.011);
  g.add(new THREE.Mesh(tg, mats.orange));
  g.rotation.x = -Math.PI / 2 + (flip ? -0.2 : 0.2); // lay flat + pitch
  const w = new THREE.Group();
  w.add(g);
  return w;
}

export function buildPQ650() {
  const carbon = carbonTexture();
  carbon.repeat.set(1, 6);
  const mats = {
    shell: new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.62, metalness: 0.25 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.55, metalness: 0.25 }),
    panelLight: new THREE.MeshStandardMaterial({ color: 0x555b63, roughness: 0.5, metalness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.5, metalness: 0.3 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.4, metalness: 0.2 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0xffffff, map: carbon, roughness: 0.35, metalness: 0.35 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.3, metalness: 0.85 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb4723b, roughness: 0.35, metalness: 0.8 }),
    blade: new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.45, metalness: 0.15 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xf28a2e, roughness: 0.45, metalness: 0.05 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0b2a22, roughness: 0.05, metalness: 0.2, clearcoat: 1, emissive: 0x0b3a2c, emissiveIntensity: 0.35 }),
    led: new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.2, emissive: 0xbfd2db, emissiveIntensity: 0.25, transparent: true, opacity: 0.85 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x173a5c, roughness: 0.5, metalness: 0.3 }),
  };

  const root = new THREE.Group();
  const parts = {};
  const part = (id) => { const g = new THREE.Group(); g.name = id; root.add(g); parts[id] = { group: g, items: [] }; return g; };

  // ---------------- fuselage (static core) ----------------
  const core = part('core');
  const outline = octagon(1.0, 1.75, 0.42, 0.5);
  const lower = new THREE.Mesh(slab(outline, 0.62, 0.12), mats.shell);
  lower.position.y = -0.42;
  core.add(lower);
  // front face grille
  const grilleBase = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.34, 0.05, 2, 0.02), mats.dark);
  grilleBase.position.set(0, 0.0, 1.86);
  core.add(grilleBase);
  for (let i = 0; i < 15; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.28, 0.03), mats.metal);
    slat.position.set(-0.42 + i * 0.06, 0.0, 1.9);
    core.add(slat);
  }
  // chin + bottom plate
  const chin = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.22, 2.9, 2, 0.06), mats.dark);
  chin.position.set(0, -0.62, -0.05);
  core.add(chin);
  // arm sockets on the fuselage
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.28, 20), mats.dark);
    sock.position.set(sx * 0.98, -0.02, sz * 1.18);
    sock.rotation.z = Math.PI / 2;
    sock.rotation.y = sx * sz * 0.6;
    core.add(sock);
  }
  // internal power distribution plate (visible once panels are off)
  const pdb = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 2.6), mats.black);
  pdb.position.y = 0.13;
  core.add(pdb);

  // ---------------- side panels ----------------
  const sideL = part('sides');
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.44, 2.35, 2, 0.035), mats.panel);
    p.position.set(sx * 1.1, -0.05, -0.1);
    p.rotation.z = sx * 0.22;
    sideL.add(p);
    const vent = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.12, 0.7, 2, 0.01), mats.panelLight);
    vent.position.set(sx * 1.165, 0.0, 0.55);
    vent.rotation.z = sx * 0.22;
    sideL.add(vent);
    parts.sides.items.push({ mesh: p, dir: V(sx, 0.1, 0) });
  }

  // ---------------- top cover ----------------
  const cover = part('cover');
  const top = new THREE.Mesh(slab(octagon(0.9, 1.62, 0.38, 0.45), 0.07, 0.09), mats.panel);
  top.position.y = 0.3;
  cover.add(top);
  const inset = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.04, 1.7, 2, 0.015), mats.panelLight);
  inset.position.set(0, 0.47, -0.15);
  cover.add(inset);
  const hatch = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.05, 0.42, 2, 0.015), mats.dark);
  hatch.position.set(0.0, 0.48, 1.05);
  cover.add(hatch);
  const vents = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.03, 0.14, 2, 0.01), mats.black);
  vents.position.set(0, 0.48, -1.32);
  cover.add(vents);

  // ---------------- battery (6S 22000 mAh) ----------------
  const bat = part('battery');
  const batBody = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.4, 1.7, 3, 0.06), [
    mats.dark, mats.dark,
    new THREE.MeshStandardMaterial({ map: labelTexture(['22000 mAh', 'Li-HV · 6S · 22.8 V'], '#cfd4d9', '#1a1d21', '#f28a2e'), roughness: 0.55 }),
    mats.dark, mats.dark, mats.dark
  ]);
  batBody.position.set(0, -0.06, -0.35);
  bat.add(batBody);
  const xt = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.12, 0.16, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0xe3b23c, roughness: 0.5 }));
  xt.position.set(0.3, 0.06, 0.55);
  bat.add(xt);

  // ---------------- flight controller (ARKV6X) ----------------
  const fc = part('fc');
  const board = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.06, 0.38, 2, 0.015), mats.pcb);
  board.position.set(0, 0.0, 0.95);
  fc.add(board);
  const can = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.07, 0.24, 2, 0.015), mats.metal);
  can.position.set(-0.03, 0.06, 0.95);
  fc.add(can);
  for (let i = 0; i < 4; i++) {
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), mats.black);
    pin.position.set(-0.16 + i * 0.11, 0.04, 1.15);
    fc.add(pin);
  }

  // ---------------- arms, motors, propellers ----------------
  const arms = part('arms');
  const motors = part('motors');
  const props = part('props');
  const corners = [];
  for (const sz of [1, -1]) for (const sx of [-1, 1]) {
    const A = V(sx * 1.02, -0.02, sz * 1.22);
    const M = V(sx * 2.85, 0.32, sz * 2.6);
    const dirH = V(M.x - A.x, 0, M.z - A.z).normalize();
    corners.push({ A, M, dirH, sx, sz });
    // arm: collar + carbon tube
    const armG = new THREE.Group();
    const along = new THREE.Vector3().subVectors(M, A).normalize();
    const c0 = A.clone().addScaledVector(along, 0.05);
    const c1 = A.clone().addScaledVector(along, 0.62);
    armG.add(tube(c0, c1, 0.19, mats.dark, 24));
    const lockPos = A.clone().addScaledVector(along, 0.38);
    const lock = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.08, 0.22, 2, 0.03), mats.panelLight);
    lock.position.copy(lockPos).add(V(0, 0.2, 0));
    lock.rotation.y = Math.atan2(along.x, along.z);
    armG.add(lock);
    const ring = tube(A.clone().addScaledVector(along, 0.6), A.clone().addScaledVector(along, 0.7), 0.155, mats.black, 24);
    armG.add(ring);
    const tubeEnd = M.clone().addScaledVector(along, -0.3);
    const t = tube(A.clone().addScaledVector(along, 0.66), tubeEnd, 0.12, mats.carbon, 24);
    armG.add(t);
    arms.add(armG);
    parts.arms.items.push({ mesh: armG, dir: dirH.clone(), anchor: A.clone().lerp(M, 0.45) });

    // motor module: housing + motor bell + windings + LED
    const modG = new THREE.Group();
    modG.position.copy(M);
    const yaw = Math.atan2(along.x, along.z);
    const housing = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.34, 0.66, 3, 0.07), mats.shell);
    housing.position.set(0, -0.14, 0);
    housing.rotation.y = yaw;
    modG.add(housing);
    const led = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.1, 0.06, 2, 0.02), mats.led);
    led.position.copy(new THREE.Vector3(0, -0.28, 0).addScaledVector(along, 0.3));
    led.rotation.y = yaw;
    modG.add(led);
    const stator = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.07, 28), mats.copper);
    stator.position.y = 0.07;
    modG.add(stator);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.18, 32), mats.black);
    bell.position.y = 0.19;
    modG.add(bell);
    const bellTop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 0.04, 32), mats.dark);
    bellTop.position.y = 0.3;
    modG.add(bellTop);
    motors.add(modG);
    parts.motors.items.push({ mesh: modG, dir: dirH.clone().add(V(0, 0.35, 0)).normalize(), anchor: M.clone() });

    // propeller: hub + clip + two blades (CW/CCW pairs)
    const propG = new THREE.Group();
    propG.position.copy(M).add(V(0, 0.38, 0));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.08, 24), mats.metal);
    propG.add(hub);
    const clip = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.05, 0.12, 2, 0.02), mats.dark);
    clip.position.y = 0.04;
    propG.add(clip);
    const ccw = sx * sz > 0;
    const spin = new THREE.Group();
    const b1 = blade(mats, ccw); b1.position.x = 0.08;
    const b2 = blade(mats, ccw); b2.rotation.y = Math.PI; b2.position.x = -0.08;
    spin.add(b1, b2);
    spin.rotation.y = (sx > 0 ? 0.35 : -0.35) + (sz > 0 ? 0 : Math.PI / 2) ;
    clip.rotation.y = spin.rotation.y;
    propG.add(spin);
    props.add(propG);
    parts.props.items.push({ mesh: propG, dir: dirH.clone().multiplyScalar(0.35).add(V(0, 1, 0)).normalize(), anchor: propG.position.clone() });
  }

  // ---------------- gimbal camera (EO/IR, 3-axis) ----------------
  const gim = part('gimbal');
  const mount = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.08, 0.5, 2, 0.02), mats.dark);
  mount.position.set(0, -0.78, 1.0);
  gim.add(mount);
  const yokeTop = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.06, 0.12, 2, 0.02), mats.panelLight);
  yokeTop.position.set(0.04, -0.87, 1.12);
  gim.add(yokeTop);
  const yokeSide = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.45, 0.14, 2, 0.02), mats.panelLight);
  yokeSide.position.set(0.3, -1.08, 1.12);
  gim.add(yokeSide);
  const headG = new THREE.Group();
  headG.position.set(0, -1.15, 1.18);
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.5, 0.42, 3, 0.07), mats.dark);
  headG.add(head);
  const lens = (r, x, y) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.3, 0.08, 28), mats.black);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(x, y, 0.22);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(r, 28), mats.glass);
    glass.position.set(x, y, 0.262);
    headG.add(barrel, glass);
  };
  lens(0.12, 0.0, 0.07);
  lens(0.075, -0.1, -0.15);
  lens(0.075, 0.1, -0.15);
  gim.add(headG);

  // ---------------- landing gear ----------------
  const gear = part('gear');
  for (const sx of [-1, 1]) {
    const foot = -2.15;
    const skidZ = 1.3;
    for (const sz of [-1, 1]) {
      const top = V(sx * 0.62, -0.62, sz * 0.62);
      const bot = V(sx * 1.72, foot + 0.12, sz * 0.72);
      gear.add(tube(top, bot, 0.075, mats.carbon, 16));
      const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 20), mats.dark);
      knuckle.position.copy(top);
      knuckle.rotation.z = Math.PI / 2;
      gear.add(knuckle);
      const tee = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 20), mats.dark);
      tee.position.set(sx * 1.72, foot, sz * 0.72);
      tee.rotation.x = Math.PI / 2;
      gear.add(tee);
    }
    gear.add(tube(V(sx * 1.72, foot, -skidZ), V(sx * 1.72, foot, skidZ), 0.085, mats.carbon, 18));
    for (const sz of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 24), mats.black);
      cap.rotation.x = Math.PI / 2;
      cap.position.set(sx * 1.72, foot, sz * (skidZ + 0.04));
      gear.add(cap);
    }
  }

  carbon.needsUpdate = true;
  return { root, parts, mats };
}
