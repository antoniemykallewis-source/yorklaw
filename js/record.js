// "The Record": a dark archive of care records. A lamp beam follows the visitor's
// pointer and reveals what the paperwork hides; scrolling flies the camera through
// the archive and lines every page up into one wall of evidence.
import * as THREE from '../vendor/three.module.min.js';
import { buildAtlas, TILE_W, TILE_H, COLS, ATLAS, DOC_COUNT } from './atlas.js?v=york-brand-20261009b';

const NIGHT = '#12133D';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

const DOC_VERT = /* glsl */`
attribute vec2 aTile;
attribute vec3 aScatter;
attribute vec3 aScatterRot;
attribute vec3 aAlign;
attribute float aSeed;
attribute float aScale;
uniform float uTime;
uniform float uAlign;
uniform vec2 uTileSize;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vViewDepth;

mat3 rotXYZ(vec3 r){
  float cx=cos(r.x), sx=sin(r.x), cy=cos(r.y), sy=sin(r.y), cz=cos(r.z), sz=sin(r.z);
  mat3 rx = mat3(1.0,0.0,0.0, 0.0,cx,sx, 0.0,-sx,cx);
  mat3 ry = mat3(cy,0.0,-sy, 0.0,1.0,0.0, sy,0.0,cy);
  mat3 rz = mat3(cz,sz,0.0, -sz,cz,0.0, 0.0,0.0,1.0);
  return rz*ry*rx;
}
float easeInOut(float t){ return t < 0.5 ? 4.0*t*t*t : 1.0 - pow(-2.0*t + 2.0, 3.0) / 2.0; }

void main(){
  float a = easeInOut(clamp(uAlign*1.4 - aSeed*0.4, 0.0, 1.0));
  vec3 p = position;
  float curl = (0.07 + 0.09*fract(aSeed*7.13)) * (1.0 - a*0.9);
  p.z += (cos((uv.x - 0.5)*3.14159) - 1.0) * curl;
  p.z += sin(uv.y*3.14159 + aSeed*10.0) * 0.02 * (1.0 - a);
  p *= mix(aScale, 0.96, a);
  vec3 drift = vec3(sin(uTime*0.21 + aSeed*31.0), cos(uTime*0.17 + aSeed*17.0), sin(uTime*0.13 + aSeed*7.0)) * 0.14 * (1.0 - a);
  vec3 sway = vec3(sin(uTime*0.15 + aSeed*9.0)*0.05, cos(uTime*0.12 + aSeed*5.0)*0.07, 0.0) * (1.0 - a);
  vec3 rot = mix(aScatterRot + sway, vec3(0.0, 0.0, (fract(aSeed*91.7) - 0.5)*0.035), a);
  mat3 R = rotXYZ(rot);
  vec3 world = R * p + mix(aScatter + drift, aAlign, a);
  vNormal = normalize(R * vec3(0.0, 0.0, 1.0));
  vUv = vec2((aTile.x + uv.x) * uTileSize.x, (aTile.y + (1.0 - uv.y)) * uTileSize.y);
  vec4 mv = viewMatrix * vec4(world, 1.0);
  vWorldPos = world;
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const DOC_FRAG = /* glsl */`
uniform sampler2D uAtlas;
uniform vec3 uLampPos;
uniform vec3 uLampDir;
uniform float uCosOuter;
uniform float uCosInner;
uniform float uReveal;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uAmber;
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vViewDepth;

void main(){
  vec4 tex = texture2D(uAtlas, vUv);
  // the back of a sheet is blank paper; print only shows on the front
  vec3 albedo = gl_FrontFacing ? tex.rgb : vec3(0.80, 0.77, 0.71);
  float amberMask = gl_FrontFacing ? clamp((tex.r - tex.b) * 2.6 - 0.35, 0.0, 1.0) : 0.0;
  vec3 toFrag = vWorldPos - uLampPos;
  float dist = length(toFrag);
  vec3 dirL = toFrag / dist;
  float beam = smoothstep(uCosOuter, uCosInner, dot(dirL, uLampDir));
  float atten = 1.0 / (1.0 + 0.0032 * dist * dist);
  vec3 n = normalize(vNormal);
  n = gl_FrontFacing ? n : -n;
  float facing = dot(n, -dirL);
  // paper is thin: light from behind still glows through
  float diffuse = facing > 0.0 ? 0.3 + 0.7 * facing : 0.22 * (-facing);
  float lit = beam * diffuse * atten * uReveal;
  float fill = 0.010 + 0.020 * clamp(dot(n, normalize(vec3(0.3, 0.8, 0.5))), 0.0, 1.0);
  vec3 warm = vec3(1.0, 0.91, 0.85);
  vec3 color = albedo * (fill + lit * 2.9 * warm);
  color += uAmber * amberMask * lit * 1.5;
  float f = smoothstep(uFogNear, uFogFar, vViewDepth);
  color = mix(color, uFogColor, f);
  color = vec3(1.0) - exp(-color * 1.3);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

const DUST_VERT = /* glsl */`
attribute float aSize;
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uLampPos;
uniform vec3 uLampDir;
uniform float uCosOuter;
uniform float uCosInner;
uniform float uReveal;
varying float vAlpha;
void main(){
  vec3 p = position;
  p.x += sin(uTime*0.07 + aSeed*40.0) * 0.35;
  p.y += sin(uTime*0.05 + aSeed*13.0) * 0.45;
  p.z += cos(uTime*0.06 + aSeed*21.0) * 0.30;
  vec3 d = p - uLampPos;
  float dist = length(d);
  float beam = smoothstep(uCosOuter - 0.006, uCosInner, dot(d / dist, uLampDir));
  vAlpha = (0.012 + beam * 0.9 / (1.0 + 0.008 * dist * dist)) * uReveal;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_PointSize = aSize * uPixelRatio * (9.0 / max(-mv.z, 0.5));
  gl_Position = projectionMatrix * mv;
}`;

const DUST_FRAG = /* glsl */`
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  gl_FragColor = vec4(vec3(1.0, 0.64, 0.44) * a, a);
}`;

const CONE_VERT = /* glsl */`
varying float vAlong;
varying vec3 vN;
varying vec3 vV;
void main(){
  vAlong = position.z;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const CONE_FRAG = /* glsl */`
uniform float uIntensity;
varying float vAlong;
varying vec3 vN;
varying vec3 vV;
void main(){
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float core = pow(facing, 2.4);
  float along = smoothstep(0.0, 0.05, vAlong) * pow(1.0 - clamp(vAlong, 0.0, 1.0), 1.7);
  float a = uIntensity * core * along * 0.24;
  gl_FragColor = vec4(vec3(1.0, 0.65, 0.48) * a, a);
}`;

export async function createRecord(canvas, { mobile = false, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.setClearColor(new THREE.Color(NIGHT), 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 140);

  // ---- textures
  const atlasCanvas = await buildAtlas(mobile ? 0.5 : 1);
  const atlas = new THREE.CanvasTexture(atlasCanvas);
  atlas.flipY = false;
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  atlas.minFilter = THREE.LinearMipmapLinearFilter;
  atlas.needsUpdate = true;

  // ---- shared lamp uniforms
  const lamp = {
    uLampPos: { value: new THREE.Vector3() },
    uLampDir: { value: new THREE.Vector3(0, 0, -1) },
    uCosOuter: { value: Math.cos(THREE.MathUtils.degToRad(mobile ? 13 : 10.5)) },
    uCosInner: { value: Math.cos(THREE.MathUtils.degToRad(mobile ? 7 : 5.5)) },
    uReveal: { value: reduced ? 1 : 0 },
    uTime: { value: 0 },
  };

  // ---- documents (one draw call)
  const rand = mulberry32(417);
  const N = mobile ? 64 : 120;
  const base = new THREE.PlaneGeometry(1, TILE_H / TILE_W, 10, 12);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.getAttribute('position'));
  geo.setAttribute('uv', base.getAttribute('uv'));
  geo.instanceCount = N;

  const aTile = new Float32Array(N * 2);
  const aScatter = new Float32Array(N * 3);
  const aScatterRot = new Float32Array(N * 3);
  const aAlign = new Float32Array(N * 3);
  const aSeed = new Float32Array(N);
  const aScale = new Float32Array(N);
  const cols = mobile ? 8 : 12;
  const rows = Math.ceil(N / cols);
  const order = Array.from({ length: N }, (_, i) => i).sort(() => rand() - 0.5);
  for (let i = 0; i < N; i++) {
    const doc = i % DOC_COUNT;
    aTile[i * 2] = doc % COLS;
    aTile[i * 2 + 1] = Math.floor(doc / COLS);
    let x, y;
    do {
      x = (rand() * 2 - 1) * 7.6;
      y = (rand() * 2 - 1) * 4.5;
    } while (Math.hypot(x * 0.75, y) < 1.7);
    const z = 5 - rand() * 46;
    aScatter.set([x, y, z], i * 3);
    aScatterRot.set([(rand() - 0.5) * 0.8, (rand() - 0.5) * 1.2, (rand() - 0.5) * 1.0], i * 3);
    const slot = order[i];
    const c = slot % cols;
    const r = Math.floor(slot / cols);
    aAlign.set([(c - (cols - 1) / 2) * 1.1, ((rows - 1) / 2 - r) * 1.46, -30 + (rand() - 0.5) * 0.05], i * 3);
    aSeed[i] = rand();
    aScale[i] = 0.9 + rand() * 0.75;
  }
  geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(aTile, 2));
  geo.setAttribute('aScatter', new THREE.InstancedBufferAttribute(aScatter, 3));
  geo.setAttribute('aScatterRot', new THREE.InstancedBufferAttribute(aScatterRot, 3));
  geo.setAttribute('aAlign', new THREE.InstancedBufferAttribute(aAlign, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
  geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(aScale, 1));

  // THREE.Color parses hex as sRGB and stores linear values already
  const fogColor = new THREE.Color(NIGHT);
  const docMat = new THREE.ShaderMaterial({
    vertexShader: DOC_VERT,
    fragmentShader: DOC_FRAG,
    side: THREE.DoubleSide,
    uniforms: {
      ...lamp,
      uAtlas: { value: atlas },
      uAlign: { value: 0 },
      uTileSize: { value: new THREE.Vector2(TILE_W / ATLAS, TILE_H / ATLAS) },
      uFogColor: { value: fogColor },
      uFogNear: { value: 16 },
      uFogFar: { value: 44 },
      uAmber: { value: new THREE.Color('#F56032') },
    },
  });
  const docs = new THREE.Mesh(geo, docMat);
  docs.frustumCulled = false;
  scene.add(docs);

  // ---- dust in the beam
  const DN = mobile ? 420 : 900;
  const dPos = new Float32Array(DN * 3);
  const dSize = new Float32Array(DN);
  const dSeed = new Float32Array(DN);
  for (let i = 0; i < DN; i++) {
    dPos.set([(rand() * 2 - 1) * 9, (rand() * 2 - 1) * 5.2, 15 - rand() * 50], i * 3);
    dSize[i] = 1.1 + rand() * 2.6;
    dSeed[i] = rand();
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1));
  dGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
  const dustMat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { ...lamp, uPixelRatio: { value: renderer.getPixelRatio() } },
  });
  const dust = new THREE.Points(dGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // ---- visible light shaft
  const coneGeo = new THREE.ConeGeometry(1, 1, 48, 1, true);
  coneGeo.translate(0, -0.5, 0);
  coneGeo.rotateX(-Math.PI / 2);
  const coneMat = new THREE.ShaderMaterial({
    vertexShader: CONE_VERT,
    fragmentShader: CONE_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false, // the haze scatters in front of the sheets too, so it never leaves dark cut-outs
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uIntensity: { value: 0 } },
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.frustumCulled = false;
  cone.renderOrder = 2;
  scene.add(cone);

  // ---- camera journey through the archive
  const camPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.6, 0.25, 13),
    new THREE.Vector3(-0.9, 0.55, 2.5),
    new THREE.Vector3(0.9, -0.35, -8.5),
    new THREE.Vector3(0.0, 0.0, -16.5),
  ], false, 'centripetal');
  const lookPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.3, -0.2, -10),
    new THREE.Vector3(0, 0, -22),
    new THREE.Vector3(0, 0, -30),
  ], false, 'centripetal');

  const state = {
    journey: 0,
    journeySmooth: 0,
    ndc: new THREE.Vector2(0.18, 0.06),
    ndcTarget: new THREE.Vector2(0.18, 0.06),
    lastPointer: -10,
    touch: mobile,
    time: 0,
    revealStart: -1,
  };
  const tmp = {
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    target: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    ray: new THREE.Raycaster(),
  };

  function placeCamera(s) {
    const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2;
    camPath.getPoint(e, tmp.pos);
    lookPath.getPoint(e, tmp.look);
    camera.position.copy(tmp.pos);
    camera.lookAt(tmp.look);
    camera.updateMatrixWorld();
  }

  function aimLamp(align) {
    camera.getWorldDirection(tmp.fwd);
    tmp.right.crossVectors(tmp.fwd, camera.up).normalize();
    tmp.up.crossVectors(tmp.right, tmp.fwd).normalize();
    const lampPos = lamp.uLampPos.value;
    lampPos.copy(camera.position)
      .addScaledVector(tmp.right, -4.4)
      .addScaledVector(tmp.up, 3.1)
      .addScaledVector(tmp.fwd, -0.6);
    tmp.ray.setFromCamera(state.ndc, camera);
    const wallDist = Math.abs(camera.position.z + 30);
    const focus = THREE.MathUtils.lerp(12.5, wallDist, align);
    tmp.target.copy(tmp.ray.ray.origin).addScaledVector(tmp.ray.ray.direction, focus);
    tmp.dir.subVectors(tmp.target, lampPos);
    const len = tmp.dir.length();
    lamp.uLampDir.value.copy(tmp.dir).divideScalar(len);
    const L = len * 1.7;
    const r = L * Math.tan(Math.acos(lamp.uCosOuter.value) * 0.92);
    cone.position.copy(lampPos);
    cone.lookAt(tmp.target);
    cone.scale.set(r, r, L);
  }

  function update(dt) {
    state.time += reduced ? 0 : dt;
    lamp.uTime.value = state.time;

    // lamp switch-on with a short flicker
    if (!reduced && state.revealStart >= 0) {
      const t = state.time - state.revealStart;
      let v = smooth(0.0, 1.2, t);
      if (t > 0.25 && t < 0.38) v *= 0.35;
      if (t > 0.55 && t < 0.62) v *= 0.6;
      lamp.uReveal.value = v;
    }

    // pointer, or a slow autopilot sweep when idle / on touch
    const idle = state.time - state.lastPointer > 2.8;
    if (!reduced && (idle || state.touch)) {
      const t = state.time;
      const ax = Math.sin(t * 0.31) * 0.52;
      const ay = Math.sin(t * 0.47 + 1.3) * 0.3 - 0.02;
      const k = state.touch && !idle ? 0 : 1;
      if (k) state.ndcTarget.set(ax, ay);
    }
    const follow = 1 - Math.exp(-dt * (reduced ? 30 : 5.5));
    state.ndc.lerp(state.ndcTarget, follow);

    state.journeySmooth += (state.journey - state.journeySmooth) * (reduced ? 1 : 1 - Math.exp(-dt * 7));
    const s = state.journeySmooth;
    const align = smooth(0.6, 0.97, s);
    docMat.uniforms.uAlign.value = align;
    placeCamera(s);
    aimLamp(align);
    coneMat.uniforms.uIntensity.value = lamp.uReveal.value * (1 - align * 0.35);
  }

  // ---- sizing
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 50 : 36;
    camera.updateProjectionMatrix();
  }
  resize();

  // ---- loop
  let running = false;
  let raf = 0;
  let last = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    update(dt);
    renderer.render(scene, camera);
  }
  function renderOnce() {
    update(0.016);
    renderer.render(scene, camera);
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    document.documentElement.classList.add('no-webgl');
  });

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    if (state.revealStart < 0) state.revealStart = state.time;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  return {
    start,
    stop,
    resize,
    renderOnce,
    get running() { return running; },
    setJourney(s) { state.journey = Math.min(1, Math.max(0, s)); if (reduced) renderOnce(); },
    pointer(nx, ny) {
      state.ndcTarget.set(nx, ny);
      state.lastPointer = state.time;
      state.touch = false;
      if (reduced) renderOnce();
    },
    touched(nx, ny) {
      state.ndcTarget.set(nx, ny);
      state.lastPointer = state.time;
      state.touch = true;
    },
    reveal() { lamp.uReveal.value = 1; },
    dispose() {
      stop();
      [geo, base, dGeo, coneGeo].forEach((g) => g.dispose());
      [docMat, dustMat, coneMat].forEach((m) => m.dispose());
      atlas.dispose();
      renderer.dispose();
    },
  };
}
