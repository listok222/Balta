import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const IS_MOBILE = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ========== AGE GATE ==========
const ageGate = document.getElementById('age-gate');
const app = document.getElementById('app');

document.getElementById('age-yes').addEventListener('click', () => {
  ageGate.classList.add('hidden');
  app.classList.remove('hidden');
  initExperience();
});

document.getElementById('age-no').addEventListener('click', () => {
  window.location.href = 'https://www.google.com';
});

// ========== VARIETIES ==========
const VARIETIES = [
  { num: '0', name: 'Безалкогольное', abv: '0,0%' },
  { num: '3', name: 'Классическое', abv: '4,8%' },
  { num: '7', name: 'Экспортное', abv: '5,4%' },
  { num: '9', name: 'Крепкое', abv: '8,0%' },
  { num: '5', name: 'Золотое', abv: '5,3%' },
  { num: '6', name: 'Портер', abv: '7,0%' },
];

function populateVarieties() {
  const grid = document.getElementById('varieties-grid');
  VARIETIES.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'variety-card';
    card.innerHTML = `
      <div class="variety-card__num">${v.num}</div>
      <div class="variety-card__name">${v.name}</div>
      <div class="variety-card__abv">${v.abv}</div>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.variety-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
    if (i === 1) card.classList.add('active');
    grid.appendChild(card);
  });
}

// ========== MAIN ==========
function initExperience() {
  populateVarieties();

  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02060C);
  scene.fog = new THREE.FogExp2(0x02060C, 0.012);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 1.4, 5.2);

  const renderer = new THREE.WebGLRenderer({
    antialias: !IS_MOBILE,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.4 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Environment
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environment = env;
  scene.environmentIntensity = 1.1;

  // Lights — colder & more dramatic
  const key = new THREE.DirectionalLight(0xC8E0F8, 2.4);
  key.position.set(4, 8, 5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x1A3A6E, 0.9);
  fill.position.set(-5, 2, -3);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xE8C547, 0.55);
  rim.position.set(-3, 4, -6);
  scene.add(rim);

  const bottom = new THREE.DirectionalLight(0x4A7AB0, 0.4);
  bottom.position.set(0, -4, 2);
  scene.add(bottom);

  scene.add(new THREE.AmbientLight(0x0A1525, 0.25));

  // --- Objects ---
  const canGroup = createCan();
  scene.add(canGroup);

  const iceShards = createIceShards(IS_MOBILE ? 28 : 55);
  scene.add(iceShards);

  const particles = createParticles(IS_MOBILE ? 180 : 420);
  scene.add(particles);

  // Subtle ground reflection plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshPhysicalMaterial({
      color: 0x050A12,
      metalness: 0.8,
      roughness: 0.25,
      envMapIntensity: 0.6,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.6;
  scene.add(ground);

  // Post
  let composer = null;
  if (!IS_MOBILE && !REDUCED_MOTION) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.35, 0.5, 0.82
    );
    composer.addPass(bloom);
  }

  // --- Cinematic path (more dramatic arc) ---
  const pathPoints = [
    new THREE.Vector3(0.0, 2.6, 2.8),
    new THREE.Vector3(1.1, 2.0, 1.6),
    new THREE.Vector3(1.6, 1.1, 0.3),
    new THREE.Vector3(0.9, 0.35, -0.9),
    new THREE.Vector3(-0.2, -0.15, -1.8),
    new THREE.Vector3(-0.9, -0.35, -2.6),
  ];
  const path = new THREE.CatmullRomCurve3(pathPoints);
  path.curveType = 'catmullrom';
  path.tension = 0.28;

  const getPathData = (t) => {
    const clamped = THREE.MathUtils.clamp(t, 0, 1);
    return {
      pos: path.getPointAt(clamped),
      tangent: path.getTangentAt(clamped).normalize(),
    };
  };

  // Scroll progress
  let scrollProgress = 0;
  ScrollTrigger.create({
    trigger: '#scroll-content',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.65,
    onUpdate: (self) => {
      scrollProgress = self.progress;
      const fillEl = document.getElementById('progress-fill');
      if (fillEl) fillEl.style.width = `${self.progress * 100}%`;
      if (self.progress > 0.035) {
        document.getElementById('scroll-hint')?.classList.add('hidden');
      }
    },
  });

  // Text reveals
  gsap.to('.hero-title', { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out', delay: 0.25 });
  gsap.to('.hero-subtitle', { opacity: 1, y: 0, duration: 1.3, ease: 'power3.out', delay: 0.55 });

  gsap.utils.toArray('.section-title, .section-lead').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.05, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  });

  gsap.utils.toArray('.timeline-item').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1, x: 0, duration: 0.85, delay: i * 0.09, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' },
    });
  });

  gsap.utils.toArray('.process-step').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.75, delay: i * 0.07, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' },
    });
  });

  gsap.to('.responsible-text', {
    opacity: 1, y: 0, duration: 1.1, ease: 'power2.out',
    scrollTrigger: { trigger: '.responsible-text', start: 'top 85%', toggleActions: 'play none none reverse' },
  });

  // Animation loop
  const clock = new THREE.Clock();
  let lastProgress = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = scrollProgress;
    const smoothT = THREE.MathUtils.lerp(lastProgress, t, 0.11);
    lastProgress = smoothT;

    // Can on path
    const { pos, tangent } = getPathData(smoothT);
    canGroup.position.copy(pos);

    // Orient + continuous spin
    const look = pos.clone().add(tangent);
    canGroup.lookAt(look);
    canGroup.rotateX(Math.PI / 2);
    canGroup.rotation.y += 0.012 + smoothT * 0.02;

    // Camera — more cinematic offset that orbits slightly
    const orbit = smoothT * Math.PI * 1.2;
    const camOffset = new THREE.Vector3(
      Math.sin(orbit) * 2.1,
      1.55 - smoothT * 0.75,
      3.6 - smoothT * 1.8
    );
    const desiredCam = pos.clone().add(camOffset);
    camera.position.lerp(desiredCam, 0.07);
    camera.lookAt(pos.clone().add(new THREE.Vector3(0, 0.2, 0)));

    // Ice shards — slow orbit + individual tumble
    iceShards.children.forEach((shard, i) => {
      shard.rotation.x += dt * (0.15 + (i % 5) * 0.04);
      shard.rotation.y += dt * (0.12 + (i % 7) * 0.03);
      // subtle float
      const base = shard.userData.baseY || 0;
      shard.position.y = base + Math.sin(clock.elapsedTime * 0.6 + i) * 0.08;
    });
    iceShards.rotation.y += dt * 0.035;

    // Particles
    particles.rotation.y += dt * 0.018;
    const positions = particles.geometry.attributes.position.array;
    for (let i = 1; i < positions.length; i += 3) {
      positions[i] += Math.sin(clock.elapsedTime * 0.4 + i) * 0.0008;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ========== CAN ==========
function createCan() {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.44, 0.44, 1.62, 72, 1, true);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x152E55,
    metalness: 0.94,
    roughness: 0.14,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(bodyGeo, bodyMat));

  // Label
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0C2448');
  grad.addColorStop(0.45, '#1A457F');
  grad.addColorStop(1, '#081C38');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Gold lines
  ctx.fillStyle = '#C9A227';
  ctx.fillRect(0, 36, 1024, 7);
  ctx.fillRect(0, 470, 1024, 7);

  ctx.fillStyle = '#F5F9FC';
  ctx.font = 'bold 96px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('БАЛТИКА', 512, 225);

  ctx.fillStyle = '#E8C547';
  ctx.font = 'bold 148px "Playfair Display", Georgia, serif';
  ctx.fillText('3', 512, 375);

  ctx.fillStyle = 'rgba(200, 220, 240, 0.9)';
  ctx.font = '26px Inter, sans-serif';
  ctx.fillText('КЛАССИЧЕСКОЕ', 512, 430);

  const labelTex = new THREE.CanvasTexture(canvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = 16;

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.443, 0.443, 1.15, 72, 1, true),
    new THREE.MeshPhysicalMaterial({
      map: labelTex,
      metalness: 0.25,
      roughness: 0.35,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
    })
  );
  label.position.y = 0.04;
  group.add(label);

  // Top & bottom lids
  const lidMat = new THREE.MeshPhysicalMaterial({
    color: 0xC8D0D8,
    metalness: 0.97,
    roughness: 0.1,
    clearcoat: 0.9,
  });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.055, 64), lidMat);
  top.position.y = 0.84;
  group.add(top);

  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.045, 64), lidMat);
  bottom.position.y = -0.835;
  group.add(bottom);

  // Condensation droplets
  const dropGeo = new THREE.SphereGeometry(0.011, 8, 8);
  const dropMat = new THREE.MeshPhysicalMaterial({
    color: 0xD8ECF8,
    metalness: 0.05,
    roughness: 0.04,
    transmission: 0.7,
    thickness: 0.4,
    transparent: true,
    opacity: 0.75,
  });
  const drops = new THREE.InstancedMesh(dropGeo, dropMat, 55);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 55; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 1.35;
    const r = 0.445 + Math.random() * 0.012;
    dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    dummy.scale.setScalar(0.55 + Math.random() * 1.1);
    dummy.updateMatrix();
    drops.setMatrixAt(i, dummy.matrix);
  }
  drops.instanceMatrix.needsUpdate = true;
  group.add(drops);

  group.rotation.y = 0.3;
  return group;
}

// ========== ICE SHARDS (the key upgrade) ==========
function createIceShards(count) {
  const group = new THREE.Group();

  // Simple low-poly ice crystal geometries
  const geos = [
    new THREE.IcosahedronGeometry(0.18, 0),
    new THREE.OctahedronGeometry(0.16, 0),
    new THREE.TetrahedronGeometry(0.2, 0),
    new THREE.BoxGeometry(0.22, 0.14, 0.18),
  ];

  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xB8D8F0,
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.82,
    thickness: 1.4,
    ior: 1.31,
    transparent: true,
    opacity: 0.78,
    envMapIntensity: 1.8,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < count; i++) {
    const geo = geos[i % geos.length].clone();
    const mesh = new THREE.Mesh(geo, iceMat.clone());
    const s = 0.5 + Math.random() * 1.4;
    mesh.scale.set(s * (0.7 + Math.random() * 0.6), s, s * (0.7 + Math.random() * 0.6));

    // place in a loose sphere around the path
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.4 + Math.random() * 2.8;
    mesh.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      (Math.random() - 0.35) * 3.2,
      r * Math.sin(phi) * Math.sin(theta) - 0.5
    );
    mesh.userData.baseY = mesh.position.y;
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(mesh);
  }

  return group;
}

// ========== PARTICLES ==========
function createParticles(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xC0DCF0,
    size: 0.028,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geo, mat);
}
