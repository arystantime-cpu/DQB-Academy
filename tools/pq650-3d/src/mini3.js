// DQB Academy · «Устройство дрона»: scroll-driven exploded view of a real 3D model.
// Model: "DJI 3 mini Pro" by wishmaster88 (Sketchfab), CC BY 4.0 — compressed and regrouped.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const MODEL_SRC = 'assets/anatomy/mini3-model.js'; // GLB embedded as base64 (works from file:// too)
const ARMS = ['LF', 'RF', 'LB', 'RB'];

const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.__MINI3_GLB) return res();
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = res; s.onerror = rej;
    document.body.append(s);
  });
}
function b64ToBuffer(b64) {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

// Sort the model's nodes into teaching groups (names come from the source file).
function classify(model) {
  const groups = { props: [], motors: [], coils: [], arms: [], top: [], battery: [], vision: [], gimbal: [] };
  const box = new THREE.Box3(), c = new THREE.Vector3(), s = new THREE.Vector3();
  const armOf = o => { for (let p = o; p; p = p.parent) if (ARMS.includes(p.name)) return p; return null; };
  model.traverse(o => {
    const n = o.name || '';
    if (/^JY\d/.test(n)) groups.props.push(o);
    else if (/_电机$/.test(n)) groups.motors.push(o);
    else if (/^xianquan/.test(n) || /^空白/.test(n)) groups.coils.push(o);
    else if (/^pCylinder8_[12]_2$/.test(n) || n === 'JB01' || n === '分裂') groups.arms.push(o);
  });
  const body = model.getObjectByName('JISHEN') || model;
  const consider = [];
  body.children.forEach(o => {
    if (o.name === 'jibi' || ARMS.includes(o.name)) return;
    if (o.name === 'glass') o.children.forEach(k => consider.push(k)); else consider.push(o);
  });
  const mb = new THREE.Box3().setFromObject(model), mc = mb.getCenter(new THREE.Vector3()), ms = mb.getSize(new THREE.Vector3());
  consider.forEach(o => {
    box.setFromObject(o); box.getCenter(c); box.getSize(s);
    const rz = (c.z - mc.z) / ms.z, ry = (c.y - mb.min.y) / ms.y, rx = s.x / ms.x;
    const n = o.name;
    if (/FRONT_VISION|FRONT_REAR|2D115A|FRONT_CG/.test(n)) groups.vision.push(o);
    else if (rz < -0.08 && ry > 0.0) groups.battery.push(o);
    else if (rz > 0.13 && ry < 0.42 && rx < 0.2) groups.gimbal.push(o);
    else if (ry > 0.55 && s.y < ms.y * 0.45) groups.top.push(o);
  });
  return { groups, armOf, center: mc, size: ms };
}

function init(section, gltf) {
  const sticky = section.querySelector('.anatomy-sticky');
  const canvas = section.querySelector('.anatomy-canvas');
  const items = [...section.querySelectorAll('[data-part]')];
  const order = items.map(li => li.dataset.part);
  const counter = section.querySelector('[data-anatomy-counter]');
  const capTitle = section.querySelector('[data-anatomy-title]');
  const capText = section.querySelector('[data-anatomy-text]');
  const pin = section.querySelector('.anatomy-pin');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(4, 9, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf2a35e, 0.9); rim.position.set(-7, 3, -6); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);

  // normalise the model: centred, ~7 units wide
  const model = gltf.scene;
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
  model.updateMatrixWorld(true);
  const b0 = new THREE.Box3().setFromObject(model);
  const k = 7 / b0.getSize(new THREE.Vector3()).x;
  model.scale.multiplyScalar(k);
  model.updateMatrixWorld(true);
  const b1 = new THREE.Box3().setFromObject(model);
  const ctr = b1.getCenter(new THREE.Vector3());
  model.position.sub(ctr);
  model.updateMatrixWorld(true);
  const { groups: G, armOf } = classify(model);

  // soft shadow
  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  const gg = gc.getContext('2d'); const grad = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,.5)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); gg.fillStyle = grad; gg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -2.4; scene.add(shadow);

  // explode vectors (world units), converted into each node's parent space
  const out = o => { const a = armOf(o); if (!a) return new THREE.Vector3(); const c = new THREE.Box3().setFromObject(a).getCenter(new THREE.Vector3()); c.y = 0; return c.normalize(); };
  const vec = {
    props:   o => out(o).multiplyScalar(0.25).add(new THREE.Vector3(0, 1.25, 0)),
    motors:  o => out(o).multiplyScalar(1.0).add(new THREE.Vector3(0, 0.75, 0)),
    coils:   o => out(o).multiplyScalar(1.0).add(new THREE.Vector3(0, 0.32, 0)),
    arms:    o => out(o).multiplyScalar(0.6),
    top:     () => new THREE.Vector3(0, 1.35, 0),
    battery: () => new THREE.Vector3(0, 0.25, -2.1),
    vision:  () => new THREE.Vector3(0, 0.65, 0.9),
    gimbal:  () => new THREE.Vector3(0, -0.55, 1.15),
  };
  const groups = order.map(id => {
    const entries = (G[id] || []).map(o => {
      const wv = vec[id](o);
      const p0 = o.getWorldPosition(new THREE.Vector3());
      const a = o.parent.worldToLocal(p0.clone()), b = o.parent.worldToLocal(p0.clone().add(wv));
      return { obj: o, base: o.position.clone(), delta: b.sub(a) };
    });
    return { id, entries };
  });

  const N = groups.length;
  const START = 0.06, SPAN = 0.62, WIN = 0.16;
  const tFor = i => START + (SPAN - WIN) * (i / (N - 1));
  let target = 0, prog = 0, yawUser = 0, yawVel = 0, dragging = false, lastX = 0, active = -1;
  let visible = false, raf = 0, w = 0, h = 0;

  function measure() {
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    target = total > 0 ? clamp(-r.top / total) : 0;
  }
  function resize() {
    w = sticky.clientWidth; h = sticky.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.75 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function setActive(i) {
    if (i === active) return;
    active = i;
    items.forEach((li, n) => li.classList.toggle('is-active', n === i));
    const li = items[Math.max(i, 0)];
    counter.textContent = i < 0 ? `Собран · ${N} узлов` : `Часть ${String(i + 1).padStart(2, '0')} из ${String(N).padStart(2, '0')}`;
    capTitle.textContent = i < 0 ? section.dataset.model : li.querySelector('.anatomy-part-name').textContent;
    capText.textContent = i < 0 ? section.dataset.intro : li.querySelector('.anatomy-part-text').textContent;
    pin.textContent = i < 0 ? '' : String(i + 1).padStart(2, '0');
    section.classList.toggle('has-active', i >= 0);
  }

  const box = new THREE.Box3(), top = new THREE.Vector3();
  function frame() {
    raf = 0;
    prog += (target - prog) * 0.12;
    if (Math.abs(target - prog) < 0.0004) prog = target;
    if (!dragging) { yawUser += yawVel; yawVel *= 0.92; }

    let act = -1;
    groups.forEach((g, i) => {
      const t0 = tFor(i);
      const e = ease(clamp((prog - t0) / WIN));
      if (prog >= t0 + 0.02) act = i;
      g.entries.forEach(en => en.obj.position.copy(en.base).addScaledVector(en.delta, e));
    });
    setActive(act);

    const time = performance.now() / 1000;
    const narrow = camera.aspect < 0.9;
    const yaw = 0.7 - prog * 1.1 + yawUser + Math.sin(time * 0.35) * 0.04;
    const pitch = 0.42 + prog * 0.08;
    const spread = ease(clamp((prog - START) / SPAN));
    const fw = narrow ? 1.0 : 0.62, fh = narrow ? 0.52 : 0.86;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const half = Math.min(Math.atan(tanHalf * fh), Math.atan(tanHalf * camera.aspect * fw));
    const R = 4.3 + spread * 2.3;
    const dist = R / Math.sin(half);
    const lookY = 0.1 + spread * 0.15;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, lookY + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(0, lookY, 0);
    if (narrow || section.hasAttribute('data-center')) camera.clearViewOffset();
    else camera.setViewOffset(w, h, -w * 0.17, h * 0.02, w, h);
    pivot.position.y = Math.sin(time * 0.9) * 0.05 * (1 - spread * 0.5);

    renderer.render(scene, camera);

    if (act >= 0) {
      box.makeEmpty();
      groups[act].entries.forEach(en => box.expandByObject(en.obj));
      if (!box.isEmpty()) {
        box.getCenter(top); top.y = box.max.y; top.project(camera);
        pin.style.transform = `translate(${(top.x * 0.5 + 0.5) * w}px, ${(-top.y * 0.5 + 0.5) * h}px)`;
      }
    }
    if (visible) raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf) raf = requestAnimationFrame(frame); };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { measure(); start(); } }, { rootMargin: '100px 0px' }).observe(sticky);
  addEventListener('scroll', measure, { passive: true });
  addEventListener('resize', () => { resize(); measure(); });

  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; yawVel = 0; canvas.setPointerCapture(e.pointerId); section.classList.add('is-dragging'); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; yawUser -= dx * 0.008; yawVel = -dx * 0.008; });
  const end = () => { dragging = false; section.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  items.forEach((li, i) => li.querySelector('button').addEventListener('click', () => {
    const total = section.offsetHeight - window.innerHeight;
    const y = section.getBoundingClientRect().top + scrollY + (tFor(i) + WIN * 0.85) * total;
    scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));

  resize(); measure(); prog = target;
  renderer.render(scene, camera);
  section.classList.add('anatomy--live');
  start();
  window.__pqAnatomyDebug = { set: p => { target = prog = p; }, counts: Object.fromEntries(Object.entries(G).map(([k, v]) => [k, v.map(o => o.name)])) };
}

const section = document.querySelector('[data-anatomy]');
if (section && !window.__pqAnatomy) {
  window.__pqAnatomy = true;
  section.classList.add('anatomy--loading');
  loadScript(MODEL_SRC)
    .then(() => {
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      return new Promise((res, rej) => loader.parse(b64ToBuffer(window.__MINI3_GLB), '', res, rej));
    })
    .then(gltf => { delete window.__MINI3_GLB; init(section, gltf); })
    .catch(e => { console.warn(e); section.classList.add('anatomy--static'); })
    .finally(() => section.classList.remove('anatomy--loading'));
}
