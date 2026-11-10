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

function initExperience() {
  populateVarieties();

  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03070E);
  scene.fog = new THREE.FogExp2(0x03070E, 0.011);

  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.9, 4.8);

  const renderer = new THREE.WebGLRenderer({
    antialias: !IS_MOBILE,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.4 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.025).texture;
  scene.environment = env;
  scene.environmentIntensity = 1.25;

  const key = new THREE.DirectionalLight(0xE8F4FF, 2.6);
  key.position.set(3.5, 7, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x2A4A7A, 0.7);
  fill.position.set(-4, 1.5, -2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xFFD700, 0.45);
  rim.position.set(-2.5, 3.5, -5);
  scene.add(rim);

  const bottom = new THREE.DirectionalLight(0x5A8AB8, 0.35);
  bottom.position.set(0, -3, 1);
  scene.add(bottom);

  scene.add(new THREE.AmbientLight(0x0C1828, 0.3));

  const canGroup = createGrapefruitCan();
  scene.add(canGroup);

  const iceShards = createIceShards(IS_MOBILE ? 32 : 62);
  scene.add(iceShards);

  const particles = createParticles(IS_MOBILE ? 200 : 480);
  scene.add(particles);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x040A14,
      metalness: 0.85,
      roughness: 0.22,
      envMapIntensity: 0.7,
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
      0.38, 0.48, 0.8
    );
    composer.addPass(bloom);
  }

  const pathPoints = [
    new THREE.Vector3(0.0, 1.35, 0.8),
    new THREE.Vector3(0.55, 1.1, 0.15),
    new THREE.Vector3(0.9, 0.7, -0.5),
    new THREE.Vector3(0.4, 0.35, -1.1),
    new THREE.Vector3(-0.35, 0.15, -1.6),
    new THREE.Vector3(-0.7, 0.05, -2.1),
  ];
  const path = new THREE.CatmullRomCurve3(pathPoints);
  path.curveType = 'catmullrom';
  path.tension = 0.32;

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
      if (el) el.style.width = self.progress * 100 + '%';
      if (self.progress > 0.03) {
        document.getElementById('scroll-hint')?.classList.add('hidden');
      }
    },
  });

  gsap.to('.hero-title', { opacity: 1, y: 0, duration: 1.6, ease: 'power3.out', delay: 0.2 });
  gsap.to('.hero-subtitle', { opacity: 1, y: 0, duration: 1.35, ease: 'power3.out', delay: 0.5 });

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

  const clock = new THREE.Clock();
  let lastProgress = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const smoothT = THREE.MathUtils.lerp(lastProgress, scrollProgress, 0.1);
    lastProgress = smoothT;

    const { pos } = getPathData(smoothT);
    canGroup.position.copy(pos);

    canGroup.rotation.x = Math.sin(smoothT * Math.PI) * 0.12;
    canGroup.rotation.z = Math.sin(smoothT * Math.PI * 0.7) * 0.08;
    canGroup.rotation.y += 0.009 + smoothT * 0.012;

    const orbit = smoothT * Math.PI * 0.9;
    const camOffset = new THREE.Vector3(
      Math.sin(orbit) * 1.7,
      1.15 - smoothT * 0.45,
      3.4 - smoothT * 1.1
    );
    camera.position.lerp(pos.clone().add(camOffset), 0.065);
    camera.lookAt(pos.clone().add(new THREE.Vector3(0, 0.15, 0)));

    iceShards.children.forEach((shard, i) => {
      shard.rotation.x += dt * (0.12 + (i % 5) * 0.035);
      shard.rotation.y += dt * (0.1 + (i % 7) * 0.025);
      const base = shard.userData.baseY || 0;
      shard.position.y = base + Math.sin(clock.elapsedTime * 0.55 + i * 0.7) * 0.09;
    });
    iceShards.rotation.y += dt * 0.028;

    particles.rotation.y += dt * 0.015;

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

function createGrapefruitCan() {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(0.46, 0.46, 1.68, 80, 1, true);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xE8A890,
    metalness: 0.55,
    roughness: 0.22,
    clearcoat: 0.75,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(bodyGeo, bodyMat));

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#F2B8A0');
  bg.addColorStop(0.4, '#E89A80');
  bg.addColorStop(1, '#D88A70');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(0, 55, 1024, 95);

  ctx.beginPath();
  ctx.arc(512, 102, 38, 0, Math.PI * 2);
  ctx.fillStyle = '#1A3A6E';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(512, 102, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#C9A227';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(512, 102, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#1A3A6E';
  ctx.fill();

  ctx.fillStyle = '#1A2A5A';
  ctx.font = 'bold 78px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('БАЛТИКА', 512, 230);

  ctx.fillStyle = '#C45A3A';
  ctx.font = 'italic 42px "Playfair Display", Georgia, serif';
  ctx.fillText('Грейпфрут', 512, 285);

  ctx.fillStyle = '#3A4A6A';
  ctx.font = '22px Inter, sans-serif';
  ctx.fillText('БЕЗАЛКОГОЛЬНОЕ', 512, 320);

  ctx.fillStyle = '#1A3A7A';
  ctx.font = 'bold 160px "Playfair Display", Georgia, serif';
  ctx.fillText('0', 320, 455);

  ctx.beginPath();
  ctx.arc(680, 400, 70, 0, Math.PI * 2);
  ctx.fillStyle = '#E85A40';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(680, 400, 55, 0, Math.PI * 2);
  ctx.fillStyle = '#FF8A70';
  ctx.fill();
  ctx.strokeStyle = '#C04030';
  ctx.lineWidth = 3;
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(680, 400);
    ctx.lineTo(680 + Math.cos(ang) * 55, 400 + Math.sin(ang) * 55);
    ctx.stroke();
  }
  ctx.fillStyle = '#4A8A40';
  ctx.beginPath();
  ctx.ellipse(620, 350, 18, 10, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(740, 355, 16, 9, 0.5, 0, Math.PI * 2);
  ctx.fill();

  const labelTex = new THREE.CanvasTexture(canvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = 16;

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.463, 0.463, 1.22, 80, 1, true),
    new THREE.MeshPhysicalMaterial({
      map: labelTex,
      metalness: 0.15,
      roughness: 0.32,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
    })
  );
  label.position.y = 0.02;
  group.add(label);

  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xD4AF37,
    metalness: 0.95,
    roughness: 0.12,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.5,
  });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.06, 64), goldMat);
  top.position.y = 0.87;
  group.add(top);

  const tab = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.02, 0.12),
    new THREE.MeshPhysicalMaterial({ color: 0xC0C8D0, metalness: 0.9, roughness: 0.15 })
  );
  tab.position.set(0, 0.91, 0.12);
  group.add(tab);

  const bottom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.05, 64),
    new THREE.MeshPhysicalMaterial({ color: 0xB8C0C8, metalness: 0.9, roughness: 0.18 })
  );
  bottom.position.y = -0.865;
  group.add(bottom);

  const dropGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const dropMat = new THREE.MeshPhysicalMaterial({
    color: 0xE8F4FC,
    metalness: 0.02,
    roughness: 0.03,
    transmission: 0.75,
    thickness: 0.35,
    transparent: true,
    opacity: 0.8,
  });
  const drops = new THREE.InstancedMesh(dropGeo, dropMat, 70);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 1.4;
    const r = 0.468 + Math.random() * 0.015;
    dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    dummy.scale.setScalar(0.5 + Math.random() * 1.3);
    dummy.updateMatrix();
    drops.setMatrixAt(i, dummy.matrix);
  }
  drops.instanceMatrix.needsUpdate = true;
  group.add(drops);

  return group;
}

function createIceShards(count) {
  const group = new THREE.Group();
  const geos = [
    new THREE.IcosahedronGeometry(0.2, 0),
    new THREE.OctahedronGeometry(0.18, 0),
    new THREE.TetrahedronGeometry(0.22, 0),
    new THREE.BoxGeometry(0.24, 0.15, 0.2),
  ];

  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xC0E0F8,
    metalness: 0.04,
    roughness: 0.06,
    transmission: 0.85,
    thickness: 1.5,
    ior: 1.31,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 2.0,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geos[i % geos.length].clone(), iceMat.clone());
    const s = 0.45 + Math.random() * 1.5;
    mesh.scale.set(
      s * (0.65 + Math.random() * 0.7),
      s,
      s * (0.65 + Math.random() * 0.7)
    );

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.5 + Math.random() * 2.6;
    mesh.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      (Math.random() - 0.3) * 3.0,
      r * Math.sin(phi) * Math.sin(theta) - 0.3
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
    pos[i * 3] = (Math.random() - 0.5) * 11;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 11;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xC8E4F8,
    size: 0.026,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}
