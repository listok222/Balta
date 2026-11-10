import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const IS_MOBILE = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

const VARIETIES = [
  { num: '0', name: 'Грейпфрут', abv: '0,0%' },
  { num: '3', name: 'Классическое', abv: '4,8%' },
  { num: '7', name: 'Экспортное', abv: '5,4%' },
  { num: '9', name: 'Крепкое', abv: '8,0%' },
  { num: '5', name: 'Золотое', abv: '5,3%' },
  { num: '6', name: 'Портер', abv: '7,0%' },
];

function populateVarieties() {
  const grid = document.getElementById('varieties-grid');
  if (!grid) return;
  VARIETIES.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'variety-card';
    card.innerHTML = '<div class="variety-card__num">' + v.num + '</div><div class="variety-card__name">' + v.name + '</div><div class="variety-card__abv">' + v.abv + '</div>';
    card.addEventListener('click', () => {
      document.querySelectorAll('.variety-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
    if (i === 0) card.classList.add('active');
    grid.appendChild(card);
  });
}

async function initExperience() {
  populateVarieties();

  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02060C);
  scene.fog = new THREE.FogExp2(0x02060C, 0.011);

  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.1, 4.6);

  const renderer = new THREE.WebGLRenderer({
    antialias: !IS_MOBILE,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 1.35;

  const key = new THREE.DirectionalLight(0xE0F0FF, 2.8);
  key.position.set(3.2, 7, 4.5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x1E3A6A, 0.85);
  fill.position.set(-4.5, 1.5, -2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xFFD700, 0.55);
  rim.position.set(-2.8, 3.8, -5);
  scene.add(rim);

  const bottom = new THREE.DirectionalLight(0x4A7AB0, 0.4);
  bottom.position.set(0, -3.5, 1.5);
  scene.add(bottom);

  scene.add(new THREE.AmbientLight(0x0A1525, 0.28));

  const canGroup = new THREE.Group();
  scene.add(canGroup);

  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync('./models/baltika_grapefruit_can.glb');
    const model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const targetHeight = 1.7;
    const scale = targetHeight / size.y;
    model.scale.setScalar(scale);

    box.setFromObject(model);
    box.getCenter(center);
    model.position.sub(center);

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            m.envMapIntensity = 1.4;
            if (m.metalness !== undefined) m.metalness = Math.max(m.metalness || 0, 0.65);
            if (m.roughness !== undefined) m.roughness = Math.min(m.roughness || 0.3, 0.35);
            m.needsUpdate = true;
          });
        }
      }
    });

    canGroup.add(model);
    console.log('Baltika GLB loaded successfully');
  } catch (err) {
    console.error('Failed to load GLB, falling back', err);
    canGroup.add(createFallbackCan());
  }

  const iceShards = createIceShards(IS_MOBILE ? 30 : 58);
  scene.add(iceShards);

  const particles = createParticles(IS_MOBILE ? 180 : 450);
  scene.add(particles);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(10, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x040A14,
      metalness: 0.85,
      roughness: 0.22,
      envMapIntensity: 0.65,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.55;
  scene.add(ground);

  let composer = null;
  if (!IS_MOBILE && !REDUCED_MOTION) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.32, 0.45, 0.82
    );
    composer.addPass(bloom);
  }

  const pathPoints = [
    new THREE.Vector3(0.0, 1.45, 0.9),
    new THREE.Vector3(0.6, 1.15, 0.2),
    new THREE.Vector3(0.95, 0.75, -0.45),
    new THREE.Vector3(0.45, 0.4, -1.05),
    new THREE.Vector3(-0.3, 0.2, -1.55),
    new THREE.Vector3(-0.65, 0.1, -2.05),
  ];
  const path = new THREE.CatmullRomCurve3(pathPoints);
  path.curveType = 'catmullrom';
  path.tension = 0.3;

  const getPathData = (t) => {
    const c = THREE.MathUtils.clamp(t, 0, 1);
    return {
      pos: path.getPointAt(c),
      tangent: path.getTangentAt(c).normalize(),
    };
  };

  let scrollProgress = 0;
  ScrollTrigger.create({
    trigger: '#scroll-content',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.6,
    onUpdate: (self) => {
      scrollProgress = self.progress;
      const el = document.getElementById('progress-fill');
      if (el) el.style.width = (self.progress * 100) + '%';
      if (self.progress > 0.03) {
        const hint = document.getElementById('scroll-hint');
        if (hint) hint.classList.add('hidden');
      }
    },
  });

  gsap.to('.hero-title', { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out', delay: 0.2 });
  gsap.to('.hero-subtitle', { opacity: 1, y: 0, duration: 1.3, ease: 'power3.out', delay: 0.5 });

  gsap.utils.toArray('.section-title, .section-lead').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  });

  gsap.utils.toArray('.timeline-item').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1, x: 0, duration: 0.8, delay: i * 0.09, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' },
    });
  });

  gsap.utils.toArray('.process-step').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.7, delay: i * 0.07, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' },
    });
  });

  gsap.to('.responsible-text', {
    opacity: 1, y: 0, duration: 1, ease: 'power2.out',
    scrollTrigger: { trigger: '.responsible-text', start: 'top 85%', toggleActions: 'play none none reverse' },
  });

  const clock = new THREE.Clock();
  let lastProgress = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const smoothT = THREE.MathUtils.lerp(lastProgress, scrollProgress, 0.1);
    lastProgress = smoothT;

    const { pos } = getPathData(smoothT);
    canGroup.position.copy(pos);

    canGroup.rotation.x = Math.sin(smoothT * Math.PI) * 0.1;
    canGroup.rotation.z = Math.sin(smoothT * Math.PI * 0.7) * 0.07;
    canGroup.rotation.y += 0.008 + smoothT * 0.01;

    const orbit = smoothT * Math.PI * 0.85;
    const camOffset = new THREE.Vector3(
      Math.sin(orbit) * 1.6,
      1.2 - smoothT * 0.4,
      3.3 - smoothT * 1.0
    );
    camera.position.lerp(pos.clone().add(camOffset), 0.06);
    camera.lookAt(pos.clone().add(new THREE.Vector3(0, 0.12, 0)));

    iceShards.children.forEach((shard, i) => {
      shard.rotation.x += dt * (0.13 + (i % 5) * 0.035);
      shard.rotation.y += dt * (0.1 + (i % 7) * 0.025);
      const base = shard.userData.baseY || 0;
      shard.position.y = base + Math.sin(clock.elapsedTime * 0.55 + i * 0.65) * 0.085;
    });
    iceShards.rotation.y += dt * 0.03;

    particles.rotation.y += dt * 0.016;

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

function createFallbackCan() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 1.6, 64, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xE8A890,
      metalness: 0.6,
      roughness: 0.25,
      clearcoat: 0.7,
      envMapIntensity: 1.3,
      side: THREE.DoubleSide,
    })
  );
  group.add(body);
  return group;
}

function createIceShards(count) {
  const group = new THREE.Group();
  const geos = [
    new THREE.IcosahedronGeometry(0.19, 0),
    new THREE.OctahedronGeometry(0.17, 0),
    new THREE.TetrahedronGeometry(0.21, 0),
    new THREE.BoxGeometry(0.23, 0.14, 0.19),
  ];

  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xB8D8F0,
    metalness: 0.04,
    roughness: 0.07,
    transmission: 0.84,
    thickness: 1.5,
    ior: 1.31,
    transparent: true,
    opacity: 0.75,
    envMapIntensity: 1.9,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geos[i % geos.length].clone(), iceMat.clone());
    const s = 0.48 + Math.random() * 1.45;
    mesh.scale.set(
      s * (0.65 + Math.random() * 0.7),
      s,
      s * (0.65 + Math.random() * 0.7)
    );

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.45 + Math.random() * 2.7;
    mesh.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      (Math.random() - 0.32) * 3.1,
      r * Math.sin(phi) * Math.sin(theta) - 0.4
    );
    mesh.userData.baseY = mesh.position.y;
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(mesh);
  }
  return group;
}

function createParticles(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 10;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 6.5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xC8E4F8,
    size: 0.028,
    transparent: true,
    opacity: 0.48,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}
