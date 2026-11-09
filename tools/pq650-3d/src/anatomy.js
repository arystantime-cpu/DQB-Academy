// DQB Academy · «Устройство дрона»: scroll-driven exploded view of a stylised PQ650.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildPQ650 } from './model.js';


// order of the reveal = order of the list in the HTML (data-part)
const PLAN = {
  props:   { dist: 1.5 },
  motors:  { dist: 0.95 },
  arms:    { dist: 0.75 },
  cover:   { dir: [0, 1, 0], dist: 1.45 },
  battery: { dir: [0, 1, -0.18], dist: 2.55 },
  fc:      { dir: [0, 1, 0.35], dist: 1.25 },
  sides:   { dist: 1.05 },
  gimbal:  { dir: [0, -0.75, 1], dist: 1.25 },
  gear:    { dir: [0, -1, 0], dist: 1.1 },
};

const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function init(section) {
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
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 9, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf2a35e, 1.1); rim.position.set(-7, 3, -6); scene.add(rim);
  const fill = new THREE.HemisphereLight(0xcfe6f5, 0x0a1622, 0.6); scene.add(fill);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const { root, parts } = buildPQ650();
  scene.add(root);

  // soft ground glow
  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  const gg = gc.getContext('2d');
  const grad = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  gg.fillStyle = grad; gg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -2.3;
  scene.add(shadow);

  // per-part base positions + explode vectors
  const groups = order.map(id => {
    const p = parts[id];
    const plan = PLAN[id] || { dist: 1 };
    const entries = p.items.length
      ? p.items.map(it => ({ obj: it.mesh, base: it.mesh.position.clone(), dir: it.dir.clone().normalize() }))
      : [{ obj: p.group, base: p.group.position.clone(), dir: new THREE.Vector3(...plan.dir).normalize() }];
    if (id === 'sides') entries.forEach(e => e.objs = [e.obj, e.obj.parent.children[e.obj.parent.children.indexOf(e.obj) + 1]]);
    const box = new THREE.Box3().setFromObject(p.group);
    return { id, plan, entries, center: box.getCenter(new THREE.Vector3()) };
  });
  // side vents travel with their panels
  const sideG = groups.find(g => g.id === 'sides');
  if (sideG) sideG.entries.forEach(e => { e.bases = e.objs.map(o => o.position.clone()); });

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
    const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.75 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    items.forEach((li, k) => li.classList.toggle('is-active', k === i));
    const li = items[Math.max(i, 0)];
    counter.textContent = i < 0 ? `Собран · ${N} узлов` : `Часть ${String(i + 1).padStart(2, '0')} из ${String(N).padStart(2, '0')}`;
    capTitle.textContent = i < 0 ? 'PRENEU PANDION Q650' : li.querySelector('.anatomy-part-name').textContent;
    capText.textContent = i < 0 ? section.dataset.intro : li.querySelector('.anatomy-part-text').textContent;
    pin.textContent = i < 0 ? '' : String(i + 1).padStart(2, '0');
    section.classList.toggle('has-active', i >= 0);
  }

  const tmp = new THREE.Vector3();
  function frame() {
    raf = 0;
    prog += (target - prog) * 0.12;
    if (Math.abs(target - prog) < 0.0004) prog = target;
    if (!dragging) { yawUser += yawVel; yawVel *= 0.92; }

    let act = -1;
    groups.forEach((g, i) => {
      const t0 = tFor(i);
      const k = ease(clamp((prog - t0) / WIN));
      if (prog >= t0 + 0.02) act = i;
      g.entries.forEach(e => {
        const d = g.plan.dist * k;
        if (e.objs) e.objs.forEach((o, j) => o.position.copy(e.bases[j]).addScaledVector(e.dir, d));
        else e.obj.position.copy(e.base).addScaledVector(e.dir, d);
      });
    });
    setActive(act);

    // camera: slow orbit tied to scroll + user drag + idle breathing
    const time = performance.now() / 1000;
    const narrow = camera.aspect < 0.9;
    const yaw = 0.62 - prog * 1.05 + yawUser + Math.sin(time * 0.35) * 0.04;
    const pitch = 0.38 + prog * 0.1;
    const spread = ease(clamp((prog - START) / SPAN));
    const fw = narrow ? 1.0 : 0.62, fh = narrow ? 0.52 : 0.86;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const half = Math.min(Math.atan(tanHalf * fh), Math.atan(tanHalf * camera.aspect * fw));
    const R = 4.9 + spread * 1.3;
    const dist = R / Math.sin(half);
    const lookY = -0.35 + spread * 0.1;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, lookY + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(0, lookY, 0);
    // desktop: push the model into the free area right of the copy column
    if (narrow || section.hasAttribute('data-center')) camera.clearViewOffset();
    else camera.setViewOffset(w, h, -w * 0.17, h * 0.02, w, h);
    root.position.y = Math.sin(time * 0.9) * 0.04 * (1 - spread * 0.5);

    renderer.render(scene, camera);

    // number pin follows the active part
    if (act >= 0) {
      const g = groups[act];
      const box = new THREE.Box3();
      g.entries.forEach(e => (e.objs || [e.obj]).forEach(o => box.expandByObject(o)));
      const top = box.getCenter(new THREE.Vector3()); top.y = box.max.y;
      top.project(camera);
      pin.style.transform = `translate(${(top.x * 0.5 + 0.5) * w}px, ${(-top.y * 0.5 + 0.5) * h}px)`;
    }
    if (visible) raf = requestAnimationFrame(frame);
  }

  function start() { if (!raf) raf = requestAnimationFrame(frame); }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { measure(); start(); } }, { rootMargin: '100px 0px' }).observe(sticky);
  addEventListener('scroll', measure, { passive: true });
  addEventListener('resize', () => { resize(); measure(); });

  // drag / swipe to spin (horizontal only, vertical swipe keeps scrolling)
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; yawVel = 0; canvas.setPointerCapture(e.pointerId); section.classList.add('is-dragging'); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; yawUser -= dx * 0.008; yawVel = -dx * 0.008; });
  const end = () => { dragging = false; section.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  // list buttons jump to a part
  items.forEach((li, i) => li.querySelector('button').addEventListener('click', () => {
    const total = section.offsetHeight - window.innerHeight;
    const y = section.getBoundingClientRect().top + scrollY + (tFor(i) + WIN * 0.85) * total;
    scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));

  resize(); measure(); prog = target;
  renderer.render(scene, camera);
  section.classList.add('anatomy--live');
  start();
  window.__pqAnatomyDebug = { set: p => { target = prog = p; }, frame, renderer };
}

const section = document.querySelector('[data-anatomy]');
if (section && !window.__pqAnatomy) {
  window.__pqAnatomy = true;
  try { init(section); } catch (e) { section.classList.add('anatomy--static'); console.warn(e); }
}
